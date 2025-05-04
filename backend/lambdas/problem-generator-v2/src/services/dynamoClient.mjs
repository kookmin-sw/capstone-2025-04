import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { PROBLEMS_TABLE_NAME, GENERATOR_VERBOSE } from "../utils/constants.mjs";

// AWS SDK Clients (v3) - reuse client instances
const dynamoDBClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

/**
 * Creates a new problem record in DynamoDB.
 * @param {Object} item - The problem item to create.
 * @returns {Promise<void>}
 */
export async function createProblem(item) {
  try {
    const putCommand = new PutCommand({
      TableName: PROBLEMS_TABLE_NAME,
      Item: item,
      ConditionExpression: "attribute_not_exists(problemId)",
    });
    await docClient.send(putCommand);
    if (GENERATOR_VERBOSE) {
      console.log(`Initial DynamoDB record created for ${item.problemId}`);
    }
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      console.warn(
        `Problem ID ${item.problemId} already exists. Restarting generation.`
      );
      await updateProblemStatus(item.problemId, {
        generationStatus: "restarted",
      });
    } else {
      console.error("Error creating initial DynamoDB record:", error);
      throw new Error(
        `Failed to initialize problem state: ${error.message}`
      );
    }
  }
}

/**
 * Updates a problem record in DynamoDB with new attributes.
 * @param {string} problemId - The problem ID to update.
 * @param {Object} updates - The updates to apply to the problem record.
 * @returns {Promise<void>}
 */
export async function updateProblemStatus(problemId, updates) {
  if (!problemId || Object.keys(updates).length === 0) {
    console.warn("Skipping DynamoDB update: Missing problemId or updates.");
    return;
  }

  const updateExpressionParts = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  // Dynamically build the update expression parts
  for (const [key, value] of Object.entries(updates)) {
    const namePlaceholder = `#${key}`;
    const valuePlaceholder = `:${key}Val`;
    updateExpressionParts.push(`${namePlaceholder} = ${valuePlaceholder}`);
    expressionAttributeNames[namePlaceholder] = key;
    expressionAttributeValues[valuePlaceholder] = value;
  }

  const updateExpression = `SET ${updateExpressionParts.join(", ")}`;

  const command = new UpdateCommand({
    TableName: PROBLEMS_TABLE_NAME,
    Key: {
      problemId: problemId,
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "NONE", // Or "UPDATED_NEW" if needed
  });

  try {
    await docClient.send(command);
    if (GENERATOR_VERBOSE) {
      console.log(
        `DynamoDB updated for ${problemId}: ${JSON.stringify(updates)}`
      );
    }
  } catch (error) {
    console.error(`Error updating DynamoDB for ${problemId}:`, error);
    // Not making it fatal, just log the error
  }
}

/**
 * Gets a problem record from DynamoDB.
 * @param {string} problemId - The problem ID to retrieve.
 * @returns {Promise<Object>} The problem record.
 */
export async function getProblem(problemId) {
  try {
    const command = new GetCommand({
      TableName: PROBLEMS_TABLE_NAME,
      Key: {
        problemId: problemId,
      },
    });
    const response = await docClient.send(command);
    return response.Item;
  } catch (error) {
    console.error(`Error getting problem ${problemId}:`, error);
    throw new Error(`Failed to retrieve problem: ${error.message}`);
  }
} 