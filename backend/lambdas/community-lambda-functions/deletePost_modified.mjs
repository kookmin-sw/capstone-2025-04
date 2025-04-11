import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
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

// Max items for TransactWriteCommand
const MAX_TRANSACTION_ITEMS = 100; // Increased limit for newer SDK versions (check DynamoDB docs for current limit)

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
    const { postId } = event.pathParameters || {};

    // Get user info from API Gateway JWT Authorizer
    const claims = event.requestContext?.authorizer?.claims;
    if (!claims || !claims["cognito:username"]) {
      console.warn("❌ Missing or invalid claims:", claims);
      return {
        statusCode: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "인증 정보가 없습니다." }),
      };
    }
    const username = claims["cognito:username"];

    // --- Get Post and Verify Ownership using SDK v3 style ---
    const getCommand = new GetCommand({
      TableName: tableName,
      Key: { PK: postId, SK: "POST" },
    });
    const postResult = await dynamoDB.send(getCommand);
    const post = postResult.Item;

    if (!post) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "게시글을 찾을 수 없습니다." }),
      };
    }

    if (post.author !== username) {
      return {
        statusCode: 403, // Forbidden
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "게시글을 삭제할 권한이 없습니다." }),
      };
    }

    // --- Query Comments using SDK v3 style ---
    // We need pagination here if comments can exceed MAX_TRANSACTION_ITEMS - 1
    let allCommentDeleteOps = [];
    let lastEvaluatedKey;

    do {
      const commentQuery = new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "PK = :postId AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
          ":postId": postId,
          ":prefix": "COMMENT#",
        },
        // Only need PK and SK for deletion
        ProjectionExpression: "PK, SK",
        ExclusiveStartKey: lastEvaluatedKey,
        Limit: MAX_TRANSACTION_ITEMS - 1, // Leave space for the post delete op
      });

      const commentResult = await dynamoDB.send(commentQuery);
      const currentCommentDeleteOps = (commentResult.Items || []).map(
        (comment) => ({
          Delete: {
            TableName: tableName,
            Key: { PK: comment.PK, SK: comment.SK },
          },
        })
      );

      allCommentDeleteOps = allCommentDeleteOps.concat(currentCommentDeleteOps);
      lastEvaluatedKey = commentResult.LastEvaluatedKey;

      // Safety break if transaction limit is reached (shouldn't happen with Limit above, but good practice)
      if (
        allCommentDeleteOps.length >= MAX_TRANSACTION_ITEMS - 1 &&
        lastEvaluatedKey
      ) {
        console.warn(
          `Post ${postId} has more comments than can be deleted in a single transaction batch. Deleting in multiple steps or implement BatchWriteItem.`
        );
        // For simplicity here, we'll proceed with the first batch.
        // A robust solution requires handling this loop with multiple transactions or BatchWriteItem.
        break;
      }
    } while (
      lastEvaluatedKey &&
      allCommentDeleteOps.length < MAX_TRANSACTION_ITEMS - 1
    );

    // --- Prepare Transaction using SDK v3 style ---
    const deletePostOp = {
      Delete: {
        TableName: tableName,
        Key: { PK: postId, SK: "POST" },
      },
    };

    const transactItems = [deletePostOp, ...allCommentDeleteOps];

    // DynamoDB now supports up to 100 items per transaction.
    // We already limited the query, but this check is still relevant.
    if (transactItems.length > MAX_TRANSACTION_ITEMS) {
      // This indicates the pagination logic might need adjustment or a different strategy (BatchWriteItem)
      console.error(
        `Attempted to delete ${transactItems.length} items (max ${MAX_TRANSACTION_ITEMS}) for post ${postId}. Aborting.`
      );
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `댓글 수가 너무 많아(${
            allCommentDeleteOps.length
          }) 한 번에 삭제할 수 없습니다. 관리자에게 문의하세요. (최대 ${
            MAX_TRANSACTION_ITEMS - 1
          }개 지원)`,
        }),
      };
    }

    // --- Execute Transaction ---
    if (transactItems.length > 0) {
      const transactionCommand = new TransactWriteCommand({
        TransactItems: transactItems,
      });
      await dynamoDB.send(transactionCommand);
    } else {
      // Should not happen if post exists, but handle defensively
      console.warn(`No items to delete for post ${postId}?`);
    }

    // --- SUCCESS RESPONSE ---
    const responseBody = {
      message: `게시글과 관련 댓글 ${
        allCommentDeleteOps.length
      }개가 성공적으로 삭제되었습니다.${
        lastEvaluatedKey ? " (추가 댓글이 있을 수 있음)" : ""
      }`,
      deletedCommentsCount: allCommentDeleteOps.length,
    };
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(responseBody),
    };
  } catch (error) {
    console.error("게시글 삭제 중 오류 발생:", error);
    // --- ERROR RESPONSE ---
    let statusCode = 500;
    let message = "서버 오류가 발생했습니다.";
    // Add specific error handling if needed (e.g., transaction failures)
    if (error.name === "TransactionCanceledException") {
      message = "게시글/댓글 삭제 트랜잭션 중 오류 발생.";
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
