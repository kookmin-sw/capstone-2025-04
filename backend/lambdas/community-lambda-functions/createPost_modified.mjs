import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

// 클라이언트 설정
const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);
import { v4 as uuidv4 } from "uuid";

// Define CORS headers - reuse this!
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Replace with your frontend domain in production for better security!
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization", // Ensure Authorization is allowed
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
    const body = JSON.parse(event.body || "{}"); // Add default empty object for safety
    const { title, content, problemId } = body; // 제목과 내용 추출, problemId는 선택적

    if (!title || !content) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add CORS and Content-Type
        body: JSON.stringify({ message: "title과 content는 필수 항목입니다." }),
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

    const author = claims.username; // JWT에서 추출한 유저 이름
    const postId = uuidv4(); // 게시글 ID 생성
    const createdAt = new Date().toISOString(); // 게시글 작성 시간

    // DynamoDB에 저장할 데이터
    const postData = {
      TableName: "alpaco-Community-production",
      Item: {
        PK: postId, // 게시글 ID를 PK로 사용 (댓글도 동일한 postId를 가짐)
        SK: "POST", // 정렬 키 (게시글은 POST로 고정)
        author,
        title,
        content,
        createdAt,
        likesCount: 0, // Initialize likesCount
        commentCount: 0, // Initialize commentCount
        ...(problemId && { problemId: problemId }),
        userId: claims.sub,
        updatedAt: createdAt,
        likesCount: 0,
        likedUsers: [],
        GSI1PK: "POST",
        GSI1SK: createdAt,
      },
    };

    // DynamoDB에 데이터 저장
    await dynamoDB.put(postData).promise();

    // 게시글 생성 성공 응답 (responseBody 정의)
    const responseBody = {
      message: "게시글이 성공적으로 작성되었습니다.",
      postId,
      author,
      title,
      content,
      createdAt,
      ...(problemId && { problemId }),
    };
    return {
      statusCode: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add CORS and Content-Type
      body: JSON.stringify(responseBody), // Ensure body is stringified
    };
  } catch (error) {
    console.error("게시글 작성 중 오류 발생:", error);
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
