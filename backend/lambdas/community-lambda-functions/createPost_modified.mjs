import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand, // Import PutCommand
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

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
    const body = JSON.parse(event.body || "{}");
    const { title, content, problemId } = body;

    if (!title || !content) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "title과 content는 필수 항목입니다." }),
      };
    }

    // API Gateway JWT Authorizer claims
    const claims = event.requestContext?.authorizer?.claims;
    if (!claims || !claims["cognito:username"] || !claims.sub) {
      console.warn("❌ Missing or invalid claims:", claims);
      return {
        statusCode: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "인증 정보가 없습니다." }),
      };
    }

    const author = claims["given_name"] || claims["cognito:username"] || "익명";
    const userId = claims.sub; // Use 'sub' from JWT as userId
    const postId = uuidv4();
    const createdAt = new Date().toISOString();

    // --- DynamoDB Put using SDK v3 style ---
    const itemData = {
      PK: postId,
      SK: "POST",
      author,
      userId, // Store Cognito User ID
      title,
      content,
      createdAt,
      updatedAt: createdAt, // Set initial updatedAt
      likesCount: 0,
      likedUsers: [], // Initialize as empty list (DynamoDB Set)
      commentCount: 0,
      ...(problemId && { problemId: problemId }), // Conditionally add problemId
      // GSI Keys for listing posts by time
      GSI1PK: "POST", // Partition key for all posts in GSI
      GSI1SK: createdAt, // Sort key for time-based sorting in GSI
    };

    const command = new PutCommand({
      TableName: tableName,
      Item: itemData,
    });

    await dynamoDB.send(command);

    // --- SUCCESS RESPONSE ---
    // Return the essential details of the created post
    const responseBody = {
      message: "게시글이 성공적으로 작성되었습니다.",
      postId,
      author,
      title,
      content,
      createdAt,
      problemId: itemData.problemId || null, // Ensure problemId is included if present
    };
    return {
      statusCode: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(responseBody),
    };
  } catch (error) {
    console.error("게시글 작성 중 오류 발생:", error);
    // --- ERROR RESPONSE ---
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "서버 오류가 발생했습니다.",
        error: error.message,
      }),
    };
  }
};
