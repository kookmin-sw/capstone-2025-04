const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS", // Include OPTIONS
  "Access-Control-Allow-Headers": "Content-Type, Authorization", // Include Authorization
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
    const params = {
      TableName: "alpaco-Community-production",
      IndexName: "postOnlyIndex", // GSI 이름
      KeyConditionExpression: "GSI1PK = :gsi1pk", // GSI 파티션 키 조건
      ExpressionAttributeValues: {
        ":gsi1pk": "POST", // 모든 게시물을 나타내는 값
      },
      // 필요한 속성만 가져오도록 ProjectionExpression 설정
      ProjectionExpression:
        "PK, title, author, createdAt, likesCount, commentCount, problemId",
      ScanIndexForward: false, // 최신 게시물부터 정렬 (createdAt 내림차순)
    };

    const result = await dynamoDB.query(params).promise();
    const items = result.Items || [];

    const posts = items.map((item) => ({
      postId: item.PK,
      title: item.title,
      author: item.author,
      createdAt: item.createdAt,
      likesCount: item.likesCount || 0,
      commentCount: item.commentCount || 0,
      problemId: item.problemId || null,
    }));

    // --- SUCCESS RESPONSE ---
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add CORS and Content-Type
      body: JSON.stringify(posts), // Ensure body is stringified
    };
  } catch (error) {
    console.error("게시글 목록 조회 중 오류 발생:", error);
    // --- ERROR RESPONSE ---
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add CORS and Content-Type
      body: JSON.stringify({
        message: "게시글 목록 조회 중 오류 발생",
        error: error.message,
      }), // Ensure body is stringified
    };
  }
};
