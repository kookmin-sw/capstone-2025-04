import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);
const tableName = process.env.PROBLEMS_TABLE_NAME;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const respond = (statusCode, body) => ({
  statusCode,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return respond(200, { message: "CORS preflight check successful" });
  }

  if (!tableName) {
    console.error("Missing PROBLEMS_TABLE_NAME environment variable.");
    return respond(500, { message: "Server configuration error" });
  }

  const problemId = event.pathParameters?.problemId;
  const creatorId = event.queryStringParameters?.creatorId;

  try {
    if (problemId) {
      // 단일 문제 조회
      const params = {
        TableName: tableName,
        Key: { problemId },
      };
      const command = new GetCommand(params);
      const result = await dynamoDB.send(command);
      if (!result.Item) {
        return respond(404, { message: "Problem not found" });
      }
      return respond(200, result.Item);
    } else if (creatorId) {
      // 특정 생성자의 문제들 조회 (pagination 지원)
      const pageIndex = parseInt(event.queryStringParameters?.pageIndex ?? "0", 10);
      const pageSize = 20;

      const params = {
        TableName: tableName,
        IndexName: "creatorIndex",
        KeyConditionExpression: "creatorId = :cid",
        FilterExpression: "generationStatus = :completed",
        ExpressionAttributeValues: {
          ":cid": creatorId,
          ":completed": "completed",
        },
        ProjectionExpression: "problemId, title, title_translated, difficulty, algorithmType, createdAt, creatorId, author, generationStatus",
        ScanIndexForward: false,
      };
      const command = new QueryCommand(params);
      const result = await dynamoDB.send(command);
      const items = result.Items || [];
      const start = pageIndex * pageSize;
      const pagedItems = items.slice(start, start + pageSize);
      return respond(200, pagedItems);
    } else {
      // 전체 문제 중 생성 완료된 문제만 조회 (GSI 사용 + pagination)
      const pageIndex = parseInt(event.queryStringParameters?.pageIndex ?? "0", 10);
      const pageSize = 20;

      const params = {
        TableName: tableName,
        IndexName: "generationStatusIndex",
        KeyConditionExpression: "generationStatus = :status",
        ExpressionAttributeValues: {
          ":status": "completed",
        },
        ProjectionExpression: "problemId, title, title_translated, difficulty, algorithmType, createdAt, creatorId, author, generationStatus",
        ScanIndexForward: false,
      };
      const command = new QueryCommand(params);
      const result = await dynamoDB.send(command);
      const items = result.Items || [];
      const start = pageIndex * pageSize;
      const pagedItems = items.slice(start, start + pageSize);
      return respond(200, pagedItems);
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return respond(500, { message: "Internal server error", error: error.message });
  }
};