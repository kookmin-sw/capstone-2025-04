const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

exports.handler = async (event) => {
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

    // Get user info from API Gateway JWT Authorizer (using optional chaining)
    const claims = event.requestContext?.authorizer?.claims;
    if (!claims || !claims.username) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add headers
        body: JSON.stringify({ message: "인증 정보가 없습니다." }), // Stringify
      };
    }

    const userId = claims.username; // Username from JWT

    // Get current post data
    const getPostParams = {
      TableName: "alpaco-Community-production",
      Key: {
        PK: postId, // Post ID
        SK: "POST", // Fixed SK for posts
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

    // Use Set for efficient add/delete/has operations
    const likedUsers = new Set(post.likedUsers || []);
    const isLiked = likedUsers.has(userId); // Check if the current user already liked the post

    if (isLiked) {
      // Unlike: Remove user from likedUsers, decrement likesCount
      likedUsers.delete(userId);
    } else {
      // Like: Add user to likedUsers, increment likesCount
      likedUsers.add(userId);
    }

    // Update the post item in DynamoDB
    const updateParams = {
      TableName: "alpaco-Community-production",
      Key: {
        PK: postId,
        SK: "POST",
      },
      UpdateExpression: "SET likedUsers = :users, likesCount = :count",
      ExpressionAttributeValues: {
        ":users": Array.from(likedUsers), // Convert Set back to Array for storing
        ":count": likedUsers.size, // Update likes count
      },
      ReturnValues: "UPDATED_NEW", // Return only the updated attributes (optional)
    };

    // Perform the update
    const updateResult = await dynamoDB.update(updateParams).promise();

    // --- SUCCESS RESPONSE ---
    // The actual updated values (likesCount, likedUsers) are in updateResult.Attributes
    const responseBody = {
      message: isLiked
        ? "좋아요가 취소되었습니다."
        : "좋아요가 추가되었습니다.",
      // Return the confirmed state from the database update
      likedUsers: updateResult.Attributes?.likedUsers || Array.from(likedUsers), // Fallback just in case
      likesCount: updateResult.Attributes?.likesCount ?? likedUsers.size, // Use nullish coalescing
      isLiked: !isLiked, // The new like status
    };
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add headers
      body: JSON.stringify(responseBody), // Stringify
    };
  } catch (error) {
    console.error("좋아요 처리 중 오류 발생:", error);
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
