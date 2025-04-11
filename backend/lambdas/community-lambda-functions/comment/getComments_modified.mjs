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

// No login required
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
    const { postId } = event.pathParameters; // Get postId from request URL

    const params = {
      TableName: "alpaco-Community-production",
      KeyConditionExpression: "PK = :postId AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":postId": postId,
        ":prefix": "COMMENT#", // Query comments for the given post
      },
      // ScanIndexForward: false, // Optional: sort by createdAt descending (latest first) - Assuming SK is COMMENT#{createdAt}
    };

    const result = await dynamoDB.query(params).promise();
    const items = result.Items || [];

    const comments = items.map((item) => ({
      commentId: item.commentId,
      content: item.content,
      author: item.author,
      createdAt: item.createdAt,
    }));

    // --- SUCCESS RESPONSE ---
    const responseBody = {
      comments: comments,
      commentCount: comments.length, // Count based on retrieved items
    };
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add CORS and Content-Type
      body: JSON.stringify(responseBody), // Ensure body is stringified
    };
  } catch (error) {
    console.error("댓글 목록 조회 중 오류 발생:", error);
    // --- ERROR RESPONSE ---
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add CORS and Content-Type
      body: JSON.stringify({
        message: "댓글 목록 조회 중 오류 발생",
        error: error.message,
      }), // Ensure body is stringified
    };
  }
};
