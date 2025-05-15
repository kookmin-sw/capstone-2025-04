import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

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

// GSI names (assuming these are defined in your DynamoDB table)
const GSI_COMPLETED_PROBLEMS_BY_CREATED_AT = "CompletedProblemsByCreatedAtGSI"; // PK: generationStatus, SK: createdAt
const GSI_CREATOR_ID_CREATED_AT = "CreatorIdCreatedAtGSI"; // PK: creatorId, SK: createdAt

const DEFAULT_PAGE_SIZE = 20; // Standard page size

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

  console.log("Received event for getAllProblems:", JSON.stringify(event));

  try {
    const queryParams = event.queryStringParameters || {};
    const creatorId = queryParams.creatorId;
    const pageSize = parseInt(queryParams.pageSize, 10) || DEFAULT_PAGE_SIZE;
    const sortOrder =
      queryParams.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC"; // Default to DESC for createdAt
    let lastEvaluatedKey = queryParams.lastEvaluatedKey;

    const projectionExpression =
      "problemId, title, title_translated, difficulty, algorithmType, createdAt, creatorId, author, generationStatus";

    const params = {
      TableName: tableName,
      Limit: pageSize,
      ScanIndexForward: sortOrder === "ASC", // true for ASC, false for DESC
      ProjectionExpression: projectionExpression,
      ExpressionAttributeValues: {}, // Initialize
    };

    if (lastEvaluatedKey) {
      try {
        params.ExclusiveStartKey = JSON.parse(
          decodeURIComponent(lastEvaluatedKey),
        );
      } catch (e) {
        console.warn("Invalid lastEvaluatedKey format:", lastEvaluatedKey, e);
        return {
          statusCode: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Invalid lastEvaluatedKey format." }),
        };
      }
    }

    if (creatorId) {
      // Query by creatorId, sorted by createdAt
      params.IndexName = GSI_CREATOR_ID_CREATED_AT;
      params.KeyConditionExpression = "creatorId = :creatorIdVal";
      params.ExpressionAttributeValues[":creatorIdVal"] = creatorId;
      // Ensure only completed problems are fetched if the GSI doesn't inherently filter them
      // or if generationStatus is not part of the GSI key.
      // If GSI definition ensures only completed problems, this FilterExpression can be removed.
      params.FilterExpression = "generationStatus = :completedStatus";
      params.ExpressionAttributeValues[":completedStatus"] = "completed";

      console.log(
        `Querying problems for creatorId ${creatorId} using ${GSI_CREATOR_ID_CREATED_AT}`,
      );
    } else {
      // Query all completed problems, sorted by createdAt
      params.IndexName = GSI_COMPLETED_PROBLEMS_BY_CREATED_AT;
      params.KeyConditionExpression = "generationStatus = :statusVal"; // Assuming PK of GSI is generationStatus
      params.ExpressionAttributeValues[":statusVal"] = "completed";

      console.log(
        `Querying all completed problems using ${GSI_COMPLETED_PROBLEMS_BY_CREATED_AT}`,
      );
    }

    console.log(
      "Executing DynamoDB Query with params:",
      JSON.stringify(params),
    );
    const command = new QueryCommand(params);
    const result = await dynamoDB.send(command);

    const responseBody = {
      items: result.Items || [],
      lastEvaluatedKey: result.LastEvaluatedKey
        ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey))
        : null,
      count: result.Count || 0,
      // ScannedCount is relevant for Query as well, indicates items evaluated before filtering
      scannedCount: result.ScannedCount || 0,
    };

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(responseBody),
    };
  } catch (error) {
    console.error("Error retrieving problems:", error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Failed to retrieve problems",
        error: error.message,
        errorStack: error.stack,
      }),
    };
  }
};
