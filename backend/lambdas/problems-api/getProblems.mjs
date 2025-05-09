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
    } else {
      // 커서 기반 페이지네이션
      const pageSize = 20;
      const lastKeyParam = event.queryStringParameters?.lastKey;
      const lastEvaluatedKey = lastKeyParam
        ? JSON.parse(decodeURIComponent(lastKeyParam))
        : undefined;

      let params;

      if (creatorId) {
        params = {
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
          Limit: pageSize,
          ExclusiveStartKey: lastEvaluatedKey,
        };
      } else {
        params = {
          TableName: tableName,
          IndexName: "generationStatusIndex",
          KeyConditionExpression: "generationStatus = :status",
          ExpressionAttributeValues: {
            ":status": "completed",
          },
          ProjectionExpression: "problemId, title, title_translated, difficulty, algorithmType, createdAt, creatorId, author, generationStatus",
          ScanIndexForward: false,
          Limit: pageSize,
          ExclusiveStartKey: lastEvaluatedKey,
        };
      }

      const command = new QueryCommand(params);
      const result = await dynamoDB.send(command);

      return respond(200, {
        items: result.Items,
        lastKey: result.LastEvaluatedKey
          ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey))
          : null,
      });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return respond(500, { message: "Internal server error", error: error.message });
  }
};