import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);
const tableName = process.env.SUBMISSIONS_TABLE_NAME;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "CORS preflight check successful" }),
    };
  }

  if (!tableName) {
    console.error("Error: SUBMISSIONS_TABLE_NAME environment variable not set.");
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Server configuration error" }),
    };
  }

  const query = event.queryStringParameters || {};
  const page = parseInt(query.page || "1");
  const pageSize = 20;

  const problemId = query.problemId;
  const submitterId = query.submitterId;

  let params;

  // 조건별 GSI 쿼리 분기
  if (problemId && submitterId) {
    // 문제 + 사용자 (복합 GSI)
    params = {
      TableName: tableName,
      IndexName: "problemsubmitterIndex",
      KeyConditionExpression: "problemId = :pid AND submitterId = :sid",
      ExpressionAttributeValues: {
        ":pid": problemId,
        ":sid": submitterId,
      },
      ScanIndexForward: false,
    };
  } else if (problemId) {
    // 문제 기준
    params = {
      TableName: tableName,
      IndexName: "problemIndex",
      KeyConditionExpression: "problemId = :pid",
      ExpressionAttributeValues: {
        ":pid": problemId,
      },
      ScanIndexForward: false,
    };
  } else if (submitterId) {
    // 사용자 기준
    params = {
      TableName: tableName,
      IndexName: "submitterIndex",
      KeyConditionExpression: "submitterId = :sid",
      ExpressionAttributeValues: {
        ":sid": submitterId,
      },
      ScanIndexForward: false,
    };
  } else {
    // 전체 목록 (고정값 GSI)
    params = {
      TableName: tableName,
      IndexName: "submissionByTime",
      KeyConditionExpression: "GSI1PK = :val",
      ExpressionAttributeValues: {
        ":val": "SUBMISSION",
      },
      ScanIndexForward: false,
    };
  }

  try {
    const result = await dynamoDB.send(new QueryCommand(params));
    const items = result.Items || [];

    // 페이지네이션
    const start = (page - 1) * pageSize;
    const pagedItems = items.slice(start, start + pageSize);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(pagedItems),
    };
  } catch (error) {
    console.error("Error querying submissions:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Failed to retrieve submissions",
        error: error.message,
      }),
    };
  }
};
