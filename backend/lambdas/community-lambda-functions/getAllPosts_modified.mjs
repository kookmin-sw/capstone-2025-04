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
    // --- Query using GSI and SDK v3 style ---
    // Assuming GSI name is 'postOnlyIndex' with GSI1PK as partition key and GSI1SK as sort key (createdAt)
    // Using the GSI definition from _modified.mjs
    const params = {
      TableName: tableName,
      IndexName: "postOnlyIndex", // Use the GSI name specified in community/getAllPosts.js
      KeyConditionExpression: "GSI1PK = :gsi1pk", // Use GSI1PK from _modified.mjs structure
      ExpressionAttributeValues: {
        ":gsi1pk": "POST", // Value to query all posts in the GSI
      },
      // Select only the attributes needed for the list view
      ProjectionExpression:
        "PK, title, author, createdAt, likesCount, commentCount, problemId",
      ScanIndexForward: false, // false = descending order (latest first based on GSI1SK which is createdAt)
    };

    const command = new QueryCommand(params);
    const result = await dynamoDB.send(command);
    const items = result.Items || [];

    // Map results using logic from community/getAllPosts.js
    const posts = items.map((item) => ({
      postId: item.PK, // PK is the postId
      title: item.title,
      author: item.author,
      userId: item.userId,
      createdAt: item.createdAt,
      likesCount: item.likesCount ?? 0, // Use nullish coalescing for default
      commentCount: item.commentCount ?? 0, // Use nullish coalescing for default
      problemId: item.problemId || null, // Default to null if missing
    }));

    // --- SUCCESS RESPONSE ---
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(posts),
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
