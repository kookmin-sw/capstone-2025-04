const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require("uuid");

// Define CORS headers - reuse this!
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Replace with your frontend domain in production for better security!
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization", // Ensure Authorization is allowed
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
    const { postId } = event.pathParameters;
    const body = JSON.parse(event.body || "{}"); // Add default empty object for safety
    const { content } = body;

    if (!content) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add CORS and Content-Type
        body: JSON.stringify({ message: "content는 필수 항목입니다." }),
      };
    }

    // API Gateway JWT Authorizer에서 전달된 유저 정보 가져오기 (Optional Chaining 사용)
    const claims = event.requestContext?.authorizer?.claims;
    if (!claims || !claims.username) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add CORS and Content-Type
        body: JSON.stringify({ message: "인증 정보가 없습니다." }),
      };
    }

    const author = claims.username;
    const commentId = uuidv4();
    const createdAt = new Date().toISOString();

    // --- DynamoDB Transaction ---
    await dynamoDB
      .transactWrite({
        TransactItems: [
          {
            // 1. Add the new comment
            Put: {
              TableName: "alpaco-Community-production",
              Item: {
                PK: postId,
                SK: `COMMENT#${commentId}`,
                commentId,
                author,
                content,
                createdAt,
              },
            },
          },
          {
            // 2. Increment the comment count on the post item
            Update: {
              TableName: "alpaco-Community-production",
              Key: { PK: postId, SK: "POST" },
              // Initialize commentCount to 0 if it doesn't exist, then increment
              UpdateExpression:
                "SET commentCount = if_not_exists(commentCount, :zero) + :inc",
              ExpressionAttributeValues: { ":inc": 1, ":zero": 0 },
              // ConditionExpression could be added to ensure the post exists
              // ConditionExpression: "attribute_exists(PK)"
            },
          },
        ],
      })
      .promise();

    // --- SUCCESS RESPONSE ---
    const responseBody = {
      message: "댓글이 성공적으로 추가되었습니다.",
      postId,
      commentId,
      author,
      content,
      createdAt,
    };
    return {
      statusCode: 201, // Use 201 for successful creation
      headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add CORS and Content-Type
      body: JSON.stringify(responseBody), // Ensure body is stringified
    };
  } catch (error) {
    console.error("댓글 작성 중 오류 발생:", error);
    // --- ERROR RESPONSE ---
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add CORS and Content-Type
      body: JSON.stringify({
        message: "서버 오류가 발생했습니다.",
        error: error.message,
      }), // Ensure body is stringified
    };
  }
};
