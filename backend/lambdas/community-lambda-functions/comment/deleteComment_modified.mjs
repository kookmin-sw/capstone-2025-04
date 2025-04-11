import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

// 클라이언트 설정
const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const handler = async (event) => {
  // Handle OPTIONS preflight requests for CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "CORS preflight check successful" }),
    };
  }

  try {
    const { postId, commentId } = event.pathParameters;

    // Get user info from API Gateway JWT Authorizer (using optional chaining)
    const claims = event.requestContext?.authorizer?.claims;
    if (!claims || !claims.username) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add headers
        body: JSON.stringify({ message: "인증 정보가 없습니다." }), // Stringify
      };
    }
    const username = claims.username;

    // Construct the comment's SK
    const commentSK = `COMMENT#${commentId}`;

    // --- Transaction ---
    // 1. Verify the comment exists and the user is the author
    // 2. Delete the comment
    // 3. Decrement the comment count on the post
    try {
      await dynamoDB
        .transactWrite({
          TransactItems: [
            {
              // 1. Delete the comment, ensuring it exists and belongs to the user
              Delete: {
                TableName: "alpaco-Community-production",
                Key: { PK: postId, SK: commentSK },
                ConditionExpression:
                  "attribute_exists(PK) AND author = :username", // Check existence and ownership
                ExpressionAttributeValues: { ":username": username },
              },
            },
            {
              // 2. Decrement the comment count on the post
              Update: {
                TableName: "alpaco-Community-production",
                Key: { PK: postId, SK: "POST" },
                // Decrement count, but prevent going below zero
                UpdateExpression: "SET commentCount = commentCount - :dec",
                ConditionExpression: "commentCount > :zero", // Only decrement if count > 0
                ExpressionAttributeValues: { ":dec": 1, ":zero": 0 },
              },
            },
          ],
        })
        .promise();

      // --- SUCCESS RESPONSE ---
      return {
        statusCode: 200, // Or 204 No Content
        headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add headers
        body: JSON.stringify({ message: "댓글이 성공적으로 삭제되었습니다." }), // Stringify
      };
    } catch (error) {
      // Handle specific transaction errors (e.g., ConditionalCheckFailedException)
      if (error.code === "TransactionCanceledException") {
        // Check cancellation reasons
        const cancellationReasons = error.CancellationReasons || [];
        const deleteFailedReason = cancellationReasons[0]; // Reason for the Delete operation
        const updateFailedReason = cancellationReasons[1]; // Reason for the Update operation

        if (
          deleteFailedReason &&
          deleteFailedReason.Code === "ConditionalCheckFailed"
        ) {
          // Could be because comment doesn't exist or user is not the author
          // Check if the comment exists first
          const commentExists = await dynamoDB
            .get({
              TableName: "alpaco-Community-production",
              Key: { PK: postId, SK: commentSK },
            })
            .promise();
          if (!commentExists.Item) {
            return {
              statusCode: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              body: JSON.stringify({
                message: "삭제할 댓글을 찾을 수 없습니다.",
              }),
            };
          } else if (commentExists.Item.author !== username) {
            return {
              statusCode: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              body: JSON.stringify({
                message: "댓글을 삭제할 권한이 없습니다.",
              }),
            };
          } else {
            // Other condition failure - internal error or unexpected state
            console.error("댓글 삭제 조건 확인 실패 (알 수 없는 이유):", error);
            return {
              statusCode: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              body: JSON.stringify({
                message: "댓글 삭제 중 오류 발생 (조건 확인 실패)",
              }),
            };
          }
        } else if (
          updateFailedReason &&
          updateFailedReason.Code === "ConditionalCheckFailed"
        ) {
          // This means commentCount was likely already 0 or the post doesn't exist (less likely if delete passed)
          console.warn(
            `댓글 수 업데이트 실패 (카운트가 0 이거나 포스트 없음): postId=${postId}, commentId=${commentId}`
          );
          // Even if count update fails, the comment deletion might have succeeded or failed based on its condition.
          // We already returned based on the delete condition failure, so if we reach here, the delete likely worked or had another issue.
          // For simplicity, return success if delete condition passed but update failed (comment deleted, count didn't decrement from 0)
          return {
            statusCode: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({
              message: "댓글이 삭제되었으나 카운트 업데이트는 생략되었습니다.",
            }),
          };
        } else {
          // Other transaction cancellation reason
          console.error("댓글 삭제 트랜잭션 취소됨:", error);
          return {
            statusCode: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({
              message: "댓글 삭제 트랜잭션 처리 중 오류 발생.",
            }),
          };
        }
      }
      // Handle other general errors
      console.error("댓글 삭제 중 오류 발생:", error);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "서버 오류가 발생했습니다.",
          error: error.message,
        }),
      };
    }
  } catch (error) {
    // Handle errors outside the transaction block (e.g., path parameter issues - unlikely here)
    console.error("댓글 삭제 핸들러 오류:", error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "댓글 삭제 처리 중 예기치 않은 오류 발생.",
        error: error.message,
      }),
    };
  }
};
