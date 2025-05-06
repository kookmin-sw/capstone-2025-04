import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
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
    const { postId } = event.pathParameters || {};

    // Get user info from API Gateway JWT Authorizer
    const claims = event.requestContext?.authorizer?.claims;
    if (!claims || !claims["cognito:username"]) {
      console.warn("❌ Missing or invalid claims:", claims); // 콘솔 로그 추가
      return {
        statusCode: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "인증 정보가 없습니다." }),
      };
    }
    const userId = claims.sub;
    // --- Get current post data using SDK v3 style ---
    const getCommand = new GetCommand({
      TableName: tableName,
      Key: { PK: postId, SK: "POST" },
      ProjectionExpression: "likedUsers",
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

    // --- Process Like/Unlike using Set ---
    // Ensure likedUsers is treated as a Set (DynamoDB stores it as SS - String Set)
    const likedUsers = new Set(post.likedUsers || []);
    const isLiked = likedUsers.has(userId);
    let newLikesCount;
    let updateExpression;
    let expressionAttributeValues;

    if (isLiked) {
      // Unlike: Remove user from likedUsers (DELETE action), decrement likesCount
      likedUsers.delete(userId); // Modify the set locally
      updateExpression =
        "DELETE likedUsers :user SET likesCount = if_not_exists(likesCount, :one) - :dec";
      expressionAttributeValues = {
        ":user": new Set([userId]), // DELETE requires a Set value
        ":one": 1, // Default if likesCount doesn't exist (shouldn't happen)
        ":dec": 1,
      };
      // Add condition to prevent count going below zero
      // Note: ConditionExpression is complex with DELETE, better to handle potential negative count afterwards if needed.
      // Or, calculate count separately and use SET likesCount = :count
    } else {
      // Like: Add user to likedUsers (ADD action), increment likesCount
      likedUsers.add(userId); // Modify the set locally
      updateExpression =
        "ADD likedUsers :user SET likesCount = if_not_exists(likesCount, :zero) + :inc";
      expressionAttributeValues = {
        ":user": new Set([userId]), // ADD requires a Set value
        ":zero": 0,
        ":inc": 1,
      };
    }

    newLikesCount = likedUsers.size; // Calculate the new count based on the modified local Set

    // --- Update Post using SDK v3 style ---
    // Simpler approach: Calculate new count and SET both attributes
    const finalLikedUsersArray = Array.from(likedUsers);
    const updateCommand = new UpdateCommand({
      TableName: tableName,
      Key: { PK: postId, SK: "POST" },
      UpdateExpression: "SET likedUsers = :users, likesCount = :count",
      ExpressionAttributeValues: {
        ":users": finalLikedUsersArray.length > 0 ? finalLikedUsersArray : null, // Store null if empty, or handle appropriately based on data model (e.g., keep empty list [])
        ":count": newLikesCount,
      },
      ReturnValues: "UPDATED_NEW", // Get the updated values
    });

    const updateResult = await dynamoDB.send(updateCommand);

    // --- SUCCESS RESPONSE ---
    const responseBody = {
      message: isLiked
        ? "좋아요가 취소되었습니다."
        : "좋아요가 추가되었습니다.",
      // Return the confirmed state from the database update if possible, otherwise use local calculation
      likedUsers: updateResult.Attributes?.likedUsers ?? finalLikedUsersArray,
      likesCount: updateResult.Attributes?.likesCount ?? newLikesCount,
      isLiked: !isLiked, // The new state
    };
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(responseBody),
    };
  } catch (error) {
    console.error("좋아요 처리 중 오류 발생:", error);
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
