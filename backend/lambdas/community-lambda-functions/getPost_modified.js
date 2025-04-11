const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// 로그인 없이 모든 유저 사용 가능
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
    const { postId } = event.pathParameters; // Get postId from request URL

    // Fetch post information
    const postParams = {
      TableName: "alpaco-Community-production",
      Key: {
        PK: postId, // Composite key
        SK: "POST", // Fixed SK for posts
      },
    };

    const postResult = await dynamoDB.get(postParams).promise();
    const post = postResult.Item;

    if (!post) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add headers
        body: JSON.stringify({ message: "게시글을 찾을 수 없습니다." }), // Stringify
      };
    }

    const {
      title,
      content,
      author,
      createdAt,
      likesCount = 0, // Default to 0 if not present
      likedUsers = [], // Default to empty array if not present
      updatedAt = null, // Default to null if not present
      problemId = null, // Default to null if not present
    } = post;

    // --- SUCCESS RESPONSE ---
    const responseBody = {
      postId,
      title,
      content,
      author,
      createdAt,
      likesCount,
      likedUsers,
      updatedAt,
      problemId,
    };
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add headers
      body: JSON.stringify(responseBody), // Stringify
    };
  } catch (error) {
    console.error("게시글 조회 중 오류 발생:", error);
    // --- ERROR RESPONSE ---
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add headers
      body: JSON.stringify({
        message: "게시글 조회 중 오류 발생",
        error: error.message,
      }), // Stringify
    };
  }
};
