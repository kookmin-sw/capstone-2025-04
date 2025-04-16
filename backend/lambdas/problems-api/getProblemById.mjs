import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand, // Use GetCommand for retrieving a single item by key
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

  console.log("Received event for getProblemById:", event);

  // Extract problemId from path parameters
  const problemId = event.pathParameters?.problemId;

  if (!problemId) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Missing 'problemId' in path" }),
    };
  }

  // GetItem parameters
  const params = {
    TableName: tableName,
    Key: {
      problemId: problemId, // The partition key
    },
  };

  try {
    const command = new GetCommand(params);
    const result = await dynamoDB.send(command);
    const problem = result.Item;

    if (!problem) {
      console.log(`Problem not found for ID: ${problemId}`);
      return {
        statusCode: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Problem not found" }),
      };
    }

    console.log(`Found problem for ID: ${problemId}`);

    // --- SUCCESS RESPONSE ---
    // Return the full problem details
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(problem),
    };
  } catch (error) {
    console.error(`Error getting problem ${problemId}:`, error);
    // --- ERROR RESPONSE ---
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Failed to retrieve problem details",
        error: error.message,
      }),
    };
  }
};
