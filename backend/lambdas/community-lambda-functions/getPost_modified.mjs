import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand, // Import GetCommand
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
    const { postId } = event.pathParameters || {};

    // --- Get Post using SDK v3 style ---
    const postParams = {
      TableName: tableName,
      Key: {
        PK: postId,
        SK: "POST",
      },
    };

    const command = new GetCommand(postParams);
    const result = await dynamoDB.send(command);
    const post = result.Item;

    if (!post) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "게시글을 찾을 수 없습니다." }),
      };
    }

    // Destructure using logic from community/getPost.js with defaults
    const {
      title,
      content,
      author,
      createdAt,
      likesCount = 0,
      likedUsers = [], // Default to empty array for Set compatibility later if needed
      updatedAt = null,
      problemId = null,
      userId,
      commentCount = 0, // <--- MODIFIED: Add commentCount with a default
    } = post;

    // --- SUCCESS RESPONSE ---
    const responseBody = {
      postId, // Include postId from path params
      title,
      content,
      author,
      createdAt,
      likesCount,
      likedUsers: Array.isArray(likedUsers) ? likedUsers : [], // Ensure it's an array
      updatedAt,
      problemId,
      userId,
      commentCount, // <--- MODIFIED: Include commentCount in the response
    };
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(responseBody),
    };
  } catch (error) {
    console.error("게시글 조회 중 오류 발생:", error);
    // --- ERROR RESPONSE ---
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "게시글 조회 중 오류 발생",
        error: error.message,
      }),
    };
  }
};
