import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand, // Import TransactWriteCommand
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
    const { postId } = event.pathParameters || {}; // Use || {} for safety
    const body = JSON.parse(event.body || "{}");
    const { content } = body;

    if (!content) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "content는 필수 항목입니다." }),
      };
    }

    // API Gateway JWT Authorizer claims
    const claims = event.requestContext?.authorizer?.claims;
    if (!claims || !claims["cognito:username"]) {
      console.warn("❌ Missing or invalid claims:", claims); // 콘솔 로그 추가
      return {
        statusCode: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "인증 정보가 없습니다." }),
      };
    }

    const author = claims["given_name"] || claims["cognito:username"] || "익명";
    const userId = claims.sub;
    const commentId = uuidv4();
    const createdAt = new Date().toISOString();

    // --- DynamoDB Transaction using SDK v3 style ---
    const command = new TransactWriteCommand({
      TransactItems: [
        {
          // 1. Add the new comment
          Put: {
            TableName: tableName,
            Item: {
              PK: postId,
              SK: `COMMENT#${commentId}`,
              commentId,
              author,
              userId,
              content,
              createdAt,
              // Add GSI keys if comments need separate listing/sorting later
              // GSI1PK: `COMMENT#${postId}`,
              // GSI1SK: createdAt,
            },
          },
        },
        {
          // 2. Increment the comment count on the post item
          Update: {
            TableName: tableName,
            Key: { PK: postId, SK: "POST" },
            UpdateExpression:
              "SET commentCount = if_not_exists(commentCount, :zero) + :inc",
            ExpressionAttributeValues: { ":inc": 1, ":zero": 0 },
            ConditionExpression: "attribute_exists(PK)", // Ensure the post exists
          },
        },
      ],
    });

    await dynamoDB.send(command);

    // --- SUCCESS RESPONSE ---
    const responseBody = {
      message: "댓글이 성공적으로 추가되었습니다.",
      postId,
      commentId,
      author,
      userId,
      content,
      createdAt,
    };
    return {
      statusCode: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(responseBody),
    };
  } catch (error) {
    console.error("댓글 작성 중 오류 발생:", error);
    // --- ERROR RESPONSE ---
    // Check for specific DynamoDB errors like ConditionalCheckFailed
    let statusCode = 500;
    let message = "서버 오류가 발생했습니다.";
    if (error.name === "TransactionCanceledException") {
      // Check cancellation reasons if needed, potentially the post didn't exist
      const reasons = error.CancellationReasons || [];
      if (reasons[1]?.Code === "ConditionalCheckFailed") {
        // Check reason for the Update operation
        statusCode = 404;
        message = "댓글을 추가할 게시글을 찾을 수 없습니다.";
      } else {
        message = "댓글 저장 트랜잭션 중 오류가 발생했습니다.";
      }
    } else if (error.name === "ConditionalCheckFailedException") {
      // This might happen if the ConditionExpression was on the PutItem (not used here)
      statusCode = 400; // Or appropriate status
      message = "댓글 저장 조건 확인 실패.";
    }

    return {
      statusCode: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message,
        error: error.message,
        errorDetails:
          error.name === "TransactionCanceledException"
            ? error.CancellationReasons
            : undefined,
      }),
    };
  }
};
