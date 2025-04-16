import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand, // Using Scan for simplicity, consider GSI + Query for large tables
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

  // Scan parameters - Fetch only necessary attributes for a list view
  const params = {
    TableName: tableName,
    // Select attributes needed for a list display (e.g., ID, title, difficulty)
    // Adjust this based on frontend requirements
    ProjectionExpression:
      "problemId, title, difficulty, algorithmType, createdAt",
    // Add FilterExpression if needed, e.g., FilterExpression: "generationStatus = :status", ExpressionAttributeValues: {":status": "completed"}
  };

  try {
    // Using Scan - potentially inefficient for very large tables.
    // Consider adding a GSI (e.g., on 'generationStatus' or 'createdAt') and using QueryCommand for better performance.
    const command = new ScanCommand(params);
    const result = await dynamoDB.send(command);
    const problems = result.Items || [];

    console.log(`Found ${problems.length} problems.`);

    // --- SUCCESS RESPONSE ---
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      // Return the array of problems directly
      body: JSON.stringify(problems),
    };
  } catch (error) {
    console.error("Error scanning problems table:", error);
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
