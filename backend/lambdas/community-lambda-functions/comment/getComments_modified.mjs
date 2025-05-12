import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand, // Import QueryCommand
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

const DEFAULT_PAGE_SIZE = 10; // Default number of comments per page

// No login required (as per original comment)
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
    const queryParams = event.queryStringParameters || {};
    const pageSize = parseInt(queryParams.pageSize, 10) || DEFAULT_PAGE_SIZE;
    const lastEvaluatedKeyRaw = queryParams.lastEvaluatedKey;

    const params = {
      TableName: tableName,
      IndexName: "commentSortIndex", // Use the new GSI for comment sorting
      KeyConditionExpression: "PK = :postId",
      FilterExpression: "begins_with(SK, :comment_prefix)", // <--- MODIFIED: Add filter
      ExpressionAttributeValues: {
        ":postId": postId,
        ":comment_prefix": "COMMENT#", // <--- MODIFIED: Add prefix for filter
      },
      ProjectionExpression: "commentId, content, author, createdAt, SK, userId",
      ScanIndexForward: false, // Get latest comments first (descending order by createdAt)
      Limit: pageSize,
    };

    if (lastEvaluatedKeyRaw) {
      try {
        params.ExclusiveStartKey = JSON.parse(
          decodeURIComponent(lastEvaluatedKeyRaw),
        );
      } catch (e) {
        console.warn(
          "Invalid lastEvaluatedKey format:",
          lastEvaluatedKeyRaw,
          e,
        );
        return {
          statusCode: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Invalid lastEvaluatedKey format." }),
        };
      }
    }

    // --- DynamoDB Query using SDK v3 style ---
    const command = new QueryCommand(params);
    const result = await dynamoDB.send(command);
    const items = result.Items || [];

    const comments = items.map(
      ({ content, author, createdAt, SK, commentId, userId }) => ({
        commentId: commentId || SK.replace("COMMENT#", ""),
        content,
        author,
        createdAt,
        userId,
      }),
    );

    // Comments are now properly sorted by the GSI's createdAt sort key (descending order with ScanIndexForward: false)

    // --- SUCCESS RESPONSE ---
    const responseBody = {
      comments: comments, // Keep 'comments' key as per original
      lastEvaluatedKey: result.LastEvaluatedKey
        ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey))
        : null,
      commentCount: comments.length, // Count based on retrieved items for the current page
    };
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(responseBody),
    };
  } catch (error) {
    console.error("댓글 목록 조회 중 오류 발생:", error);
    // --- ERROR RESPONSE ---
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "댓글 목록 조회 중 오류 발생",
        error: error.message,
      }),
    };
  }
};
