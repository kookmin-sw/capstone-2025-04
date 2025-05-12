import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand, // Keep GetCommand for pre-check if needed
  TransactWriteCommand, // Import TransactWriteCommand
} from "@aws-sdk/lib-dynamodb";

// 클라이언트 설정
const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);
const tableName = "alpaco-Community-production"; // Use the correct table name

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
    const { postId, commentId } = event.pathParameters || {};

    // Get user info from API Gateway JWT Authorizer
    const claims = event.requestContext?.authorizer?.claims;
    if (!claims || !claims.sub) {
      console.warn("❌ Missing or invalid claims:", claims); // 콘솔 로그 추가
      return {
        statusCode: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "인증 정보가 없습니다." }),
      };
    }
    const userId = claims.sub;
    const commentSK = `COMMENT#${commentId}`;

    // --- OPTIONAL Pre-check (Alternative to complex transaction error handling) ---
    // You could do a GetCommand first to provide clearer 404/403 errors,
    // but the transaction with conditions is more atomic. We'll stick to the
    // transaction approach from community/deletePost but use username check.

    // --- DynamoDB Transaction using SDK v3 style ---
    const command = new TransactWriteCommand({
      TransactItems: [
        {
          // 1. Delete the comment, ensuring it exists and belongs to the user
          Delete: {
            TableName: tableName,
            Key: { PK: postId, SK: commentSK },
            ConditionExpression: "attribute_exists(PK) AND userId = :userId", // Check existence and ownership
            ExpressionAttributeValues: { ":userId": userId },
          },
        },
        {
          // 2. Decrement the comment count on the post
          Update: {
            TableName: tableName,
            Key: { PK: postId, SK: "POST" },
            // Decrement count, prevent going below zero using condition
            UpdateExpression: "SET commentCount = commentCount - :dec",
            ConditionExpression:
              "attribute_exists(PK) AND commentCount > :zero", // Ensure post exists and count > 0
            ExpressionAttributeValues: { ":dec": 1, ":zero": 0 },
          },
        },
      ],
    });

    await dynamoDB.send(command);

    // --- SUCCESS RESPONSE ---
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "댓글이 성공적으로 삭제되었습니다.",
        postId,
        commentId,
      }),
    };
  } catch (error) {
    console.error("댓글 삭제 중 오류 발생:", error);
    // --- ERROR RESPONSE ---
    let statusCode = 500;
    let message = "서버 오류가 발생했습니다.";

    if (error.name === "TransactionCanceledException") {
      const reasons = error.CancellationReasons || [];
      const deleteFailedReason = reasons[0];
      const updateFailedReason = reasons[1];

      if (
        deleteFailedReason &&
        deleteFailedReason.Code === "ConditionalCheckFailed"
      ) {
        // To give a precise error, we need to know *why* it failed (not exists vs wrong author)
        // Let's try a quick Get to check existence vs author after the failed transaction
        try {
          const checkComment = await dynamoDB.send(
            new GetCommand({
              TableName: tableName,
              Key: {
                PK: event.pathParameters.postId,
                SK: `COMMENT#${event.pathParameters.commentId}`,
              },
            })
          );
          if (!checkComment.Item) {
            statusCode = 404;
            message = "삭제할 댓글을 찾을 수 없습니다.";
          } else if (
            checkComment.Item.userId !== userId
          ) {
            statusCode = 403;
            message = "댓글을 삭제할 권한이 없습니다.";
          } else {
            // Condition failed for another reason? Unlikely with this expression.
            statusCode = 400;
            message = "댓글 삭제 조건 실패 (알 수 없는 이유).";
          }
        } catch (getErr) {
          // Error during the check itself
          console.error("댓글 존재/권한 확인 중 오류:", getErr);
          message = "댓글 삭제 실패 후 확인 중 오류 발생.";
        }
      } else if (
        updateFailedReason &&
        updateFailedReason.Code === "ConditionalCheckFailed"
      ) {
        // This means post didn't exist or commentCount was already 0.
        // Since the delete *didn't* fail its condition, the comment was likely deleted.
        console.warn(
          `댓글 수 업데이트 실패 (게시글 없음 또는 카운트 0): postId=${event.pathParameters.postId}, commentId=${event.pathParameters.commentId}`
        );
        // Return success as the primary goal (delete) likely succeeded or would have failed above.
        return {
          statusCode: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            message:
              "댓글은 삭제되었으나, 게시글 카운트 업데이트는 건너뛰어졌습니다 (이미 0이거나 게시글 없음).",
            postId: event.pathParameters.postId,
            commentId: event.pathParameters.commentId,
          }),
        };
      } else {
        // Other transaction cancellation reason
        message = "댓글 삭제 트랜잭션 처리 중 오류 발생.";
      }
    } else {
      // Other non-transaction error
      message = error.message || "댓글 삭제 처리 중 알 수 없는 오류 발생.";
    }

    return {
      statusCode: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message,
        error: error.message,
        errorDetails:
          error.name === "TransactionCanceledException"
            ? error.CancellationReasons
            : undefined,
      }),
    };
  }
};
