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

    // Extract data from body
    const body = JSON.parse(event.body || "{}");
    const { title, content } = body;

    if (!title || !content) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "title과 content는 필수 항목입니다." }),
      };
    }

    // Get user info from API Gateway JWT Authorizer
    const claims = event.requestContext?.authorizer?.claims;
    if (!claims || !claims.username) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "인증 정보가 없습니다." }),
      };
    }
    const username = claims.username;

    // --- Check Post Existence and Ownership using SDK v3 style ---
    // We use a ConditionExpression in the UpdateCommand instead of a separate Get
    // This makes the update atomic (check and update in one operation)

    // --- Update Post using SDK v3 style ---
    const updateCommand = new UpdateCommand({
      TableName: tableName,
      Key: { PK: postId, SK: "POST" },
      UpdateExpression:
        "SET title = :title, content = :content, updatedAt = :updatedAt",
      // Condition ensures the post exists AND the author matches
      ConditionExpression: "attribute_exists(PK) AND author = :author",
      ExpressionAttributeValues: {
        ":title": title,
        ":content": content,
        ":updatedAt": new Date().toISOString(),
        ":author": username, // Value for the condition check
      },
      ReturnValues: "ALL_NEW", // Return the entire updated item
    });

    const updateResult = await dynamoDB.send(updateCommand);
    const updatedPost = updateResult.Attributes;

    // --- SUCCESS RESPONSE ---
    const responseBody = {
      message: "게시글이 성공적으로 수정되었습니다.",
      post: updatedPost,
    };
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(responseBody),
    };
  } catch (error) {
    console.error("게시글 수정 중 오류 발생:", error);
    // --- ERROR RESPONSE ---
    let statusCode = 500;
    let message = "서버 오류가 발생했습니다.";

    // Handle specific error for failed condition check
    if (error.name === "ConditionalCheckFailedException") {
      // Need to differentiate between "Not Found" and "Forbidden"
      // Perform a Get to check after the failed update
      try {
        const checkPost = await dynamoDB.send(
          new GetCommand({
            TableName: tableName,
            Key: { PK: event.pathParameters.postId, SK: "POST" },
          })
        );
        if (!checkPost.Item) {
          statusCode = 404;
          message = "수정할 게시글을 찾을 수 없습니다.";
        } else {
          // Post exists, so condition failed due to author mismatch
          statusCode = 403;
          message = "게시글을 수정할 권한이 없습니다.";
        }
      } catch (getErr) {
        console.error("게시글 존재/권한 확인 중 오류:", getErr);
        message = "게시글 수정 실패 후 확인 중 오류 발생.";
      }
    } else {
      message = error.message || "게시글 수정 중 알 수 없는 오류 발생.";
    }

    return {
      statusCode: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message,
        error: error.message,
      }),
    };
  }
};
