import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand, // Using Scan for simplicity, consider GSI + Query for large tables
  QueryCommand, // Added for querying by creatorId
} from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB Client
const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);
const tableName = process.env.PROBLEMS_TABLE_NAME; // From Lambda environment variables

// CORS Headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Restrict in production
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

  console.log("Received event for getAllProblems:", event);

  // Check for creatorId query parameter
  const creatorId = event.queryStringParameters?.creatorId;
  console.log("creatorId parameter:", creatorId);

  let problems = [];
  try {
    if (creatorId) {
      // If creatorId is provided, use Query with GSI
      const queryParams = {
        TableName: tableName,
        IndexName: "CreatorIdIndex",
        KeyConditionExpression: "creatorId = :creatorId",
        FilterExpression: "generationStatus = :completed",
        ExpressionAttributeValues: {
          ":creatorId": creatorId,
          ":completed": "completed"
        },
        ProjectionExpression:
          "problemId, title, title_translated, difficulty, algorithmType, createdAt, creatorId, author, generationStatus",
      };

      console.log("Querying by creatorId with completed status:", queryParams);
      const queryCommand = new QueryCommand(queryParams);
      const queryResult = await dynamoDB.send(queryCommand);
      problems = queryResult.Items || [];
      console.log(`Found ${problems.length} completed problems for creator ${creatorId}`);
    } else {
      // If no creatorId, use Scan as before
      const scanParams = {
        TableName: tableName,
        FilterExpression: "generationStatus = :completed",
        ExpressionAttributeValues: {
          ":completed": "completed"
        },
        ProjectionExpression:
          "problemId, title, title_translated, difficulty, algorithmType, createdAt, creatorId, author, generationStatus",
      };

      console.log("Scanning all completed problems");
      const scanCommand = new ScanCommand(scanParams);
      const scanResult = await dynamoDB.send(scanCommand);
      problems = scanResult.Items || [];
      console.log(`Found ${problems.length} completed problems in total`);
    }

    // --- SUCCESS RESPONSE ---
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      // Return the array of problems directly
      body: JSON.stringify(problems),
    };
  } catch (error) {
    console.error("Error retrieving problems:", error);
    // --- ERROR RESPONSE ---
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Failed to retrieve problems",
        error: error.message,
      }),
    };
  }
};
