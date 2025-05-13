import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand, // Import QueryCommand
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

const DEFAULT_PAGE_SIZE = 10; // Default number of posts per page

// No login required
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
    const queryParams = event.queryStringParameters || {};
    const pageSize = parseInt(queryParams.pageSize, 10) || DEFAULT_PAGE_SIZE;
    const lastEvaluatedKeyRaw = queryParams.lastEvaluatedKey;

    // --- Query using GSI and SDK v3 style ---
    const params = {
      TableName: tableName,
      IndexName: "postOnlyIndex", // Use the GSI name
      KeyConditionExpression: "GSI1PK = :gsi1pk",
      ExpressionAttributeValues: {
        ":gsi1pk": "POST",
      },
      ProjectionExpression:
        "PK, title, author, userId, createdAt, likesCount, commentCount, problemId",
      ScanIndexForward: false, // false = descending order (latest first based on GSI1SK which is createdAt)
      Limit: pageSize,
    };

    if (lastEvaluatedKeyRaw) {
      try {
        params.ExclusiveStartKey = JSON.parse(
          decodeURIComponent(lastEvaluatedKeyRaw),
        );
      } catch (e) {
        console.warn(
          "Invalid lastEvaluatedKey format:",
          lastEvaluatedKeyRaw,
          e,
        );
        return {
          statusCode: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Invalid lastEvaluatedKey format." }),
        };
      }
    }

    const command = new QueryCommand(params);
    const result = await dynamoDB.send(command);
    const items = result.Items || [];

    const posts = items.map((item) => ({
      postId: item.PK,
      title: item.title,
      author: item.author,
      userId: item.userId,
      createdAt: item.createdAt,
      likesCount: item.likesCount ?? 0,
      commentCount: item.commentCount ?? 0,
      problemId: item.problemId || null,
    }));

    // --- SUCCESS RESPONSE ---
    const responseBody = {
      items: posts, // Changed from 'posts' to 'items' for consistency
      lastEvaluatedKey: result.LastEvaluatedKey
        ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey))
        : null,
      count: posts.length, // Number of items on the current page
    };

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(responseBody),
    };
  } catch (error) {
    console.error("게시글 목록 조회 중 오류 발생:", error);
    // --- ERROR RESPONSE ---
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "게시글 목록 조회 중 오류 발생",
        error: error.message,
      }),
    };
  }
};
