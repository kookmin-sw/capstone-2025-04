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

    const params = {
      TableName: tableName,
      KeyConditionExpression:
        "PK = :postId AND begins_with(SK, :commentPrefix)",
      ExpressionAttributeValues: {
        ":postId": postId,
        ":commentPrefix": "COMMENT#",
      },
      // Select only needed attributes to reduce payload size
      ProjectionExpression: "commentId, content, author, createdAt, SK",
      ScanIndexForward: false, // Get latest comments first (descending sort key order)
    };

    // --- DynamoDB Query using SDK v3 style ---
    const command = new QueryCommand(params);
    const result = await dynamoDB.send(command);
    const items = result.Items || [];

    // Map results using logic from community/getComments.js
    const comments = items.map(
      ({ content, author, createdAt, SK, commentId }) => ({
        // Prefer using the dedicated commentId attribute if available, otherwise parse SK
        commentId: commentId || SK.replace("COMMENT#", ""),
        content,
        author,
        createdAt,
      })
    );

    // --- SUCCESS RESPONSE ---
    const responseBody = {
      comments: comments,
      commentCount: comments.length, // Count based on retrieved items
      // Note: If pagination is added, this count reflects only the current page.
      // The total count might be better retrieved from the post item's commentCount attribute.
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
