import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand, // Use QueryCommand for retrieving multiple items
} from "@aws-sdk/lib-dynamodb"; 

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);
const tableName = process.env.PROBLEMS_TABLE_NAME;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

export const handler = async (event) => {
  // Handle OPTIONS for CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "CORS preflight check successful" }),
    };
  }

  if (!tableName) {
    console.error("Error: PROBLEMS_TABLE_NAME environment variable not set.");
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Server configuration error" }),
    };
  }

  console.log("Received event for getProblemsByCreatorId:", event);

  const creatorId = event.queryStringParameters?.creatorId;

  if (!creatorId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Missing creatorId" }),
    };
  }

  const params = {
    TableName: tableName,
    IndexName: "creatorIndex", // GSI 이름
    KeyConditionExpression: "creatorId = :cid",
    ExpressionAttributeValues: {
      ":cid": creatorId, // 이건 queryStringParameters에서 받겠지
    },
    ProjectionExpression: "problemId, title, difficulty, createdAt",
    ScanIndexForward: false, // 최신순 정렬
  };

  try {
    const command = new QueryCommand(params);
    const result = await dynamoDB.send(command);
    const problems = result.Items || [];

    console.log(`Found ${problems.length} problems for creatorId: ${creatorId}`);

    return {
    statusCode: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(problems), // 빈 배열일 수도 있음! 생성한 문제가 없을때
    };
  } catch (error) {
    console.error(`Error querying problems for creatorId ${creatorId}:`, error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Query failed", error: error.message }),
    };
  }
};