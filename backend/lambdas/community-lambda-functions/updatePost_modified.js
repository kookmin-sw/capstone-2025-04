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
    const { postId } = event.pathParameters; // Extract postId from request URL

    // Extract data to be updated from the body
    const body = JSON.parse(event.body || "{}"); // Safe parsing
    const { title, content } = body;

    // Return error if title or content is missing
    if (!title || !content) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add headers
        body: JSON.stringify({ message: "title과 content는 필수 항목입니다." }), // Stringify
      };
    }

    // Get user info from API Gateway JWT Authorizer (using optional chaining)
    const claims = event.requestContext?.authorizer?.claims;
    if (!claims || !claims.username) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add headers
        body: JSON.stringify({ message: "인증 정보가 없습니다." }), // Stringify
      };
    }

    const username = claims.username; // Username from JWT

    // Check if the post exists
    const getPostParams = {
      TableName: "alpaco-Community-production",
      Key: {
        PK: postId,
        SK: "POST",
      },
    };

    const postResult = await dynamoDB.get(getPostParams).promise();
    const post = postResult.Item;

    if (!post) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add headers
        body: JSON.stringify({ message: "게시글을 찾을 수 없습니다." }), // Stringify
      };
    }

    // Check if the user is the author
    if (post.author !== username) {
      return {
        statusCode: 403, // Forbidden
        headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add headers
        body: JSON.stringify({ message: "게시글을 수정할 권한이 없습니다." }), // Stringify
      };
    }

    // Update the post
    const updateParams = {
      TableName: "alpaco-Community-production",
      Key: {
        PK: postId,
        SK: "POST",
      },
      UpdateExpression:
        "SET title = :title, content = :content, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":title": title,
        ":content": content,
        ":updatedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW", // Return the entire updated item
    };

    const updateResult = await dynamoDB.update(updateParams).promise();
    const updatedPost = updateResult.Attributes;

    // --- SUCCESS RESPONSE ---
    const responseBody = {
      message: "게시글이 성공적으로 수정되었습니다.",
      post: updatedPost,
    };
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add headers
      body: JSON.stringify(responseBody), // Stringify
    };
  } catch (error) {
    console.error("게시글 수정 중 오류 발생:", error);
    // --- ERROR RESPONSE ---
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add headers
      body: JSON.stringify({
        message: "서버 오류가 발생했습니다.",
        error: error.message,
      }), // Stringify
    };
  }
};
