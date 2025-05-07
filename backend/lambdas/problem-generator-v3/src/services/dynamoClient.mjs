import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { PROBLEMS_TABLE_NAME, GENERATOR_VERBOSE } from "../utils/constants.mjs";
import { 
  createMockDynamoDBClient, 
  createMockDynamoDBDocumentClient 
} from '../../mock-dynamodb.mjs';

// DynamoDB 클라이언트와 관련 설정
let dynamoDBClient = null;
let docClient = null;
let mockMode = null;

/**
 * DynamoDB 클라이언트 초기화 (실제 또는 모킹)
 * 
 * @param {boolean} useMock - 모킹 모드 사용 여부
 */
export function initDynamoDBClient(useMock = false) {
  console.log(`🔧 Initializing DynamoDB client in ${useMock ? 'MOCK' : 'REAL'} mode`);
  
  mockMode = useMock;
  
  if (useMock) {
    try {
      dynamoDBClient = createMockDynamoDBClient();
      docClient = createMockDynamoDBDocumentClient();
      console.log('✅ Mock DynamoDB clients initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize mock DynamoDB clients:', error);
      throw error;
    }
  } else {
    dynamoDBClient = new DynamoDBClient({
      region: 'ap-northeast-2',
    });
    docClient = DynamoDBDocumentClient.from(dynamoDBClient);
    console.log('✅ Real DynamoDB clients initialized successfully');
  }
  
  return { dynamoDBClient, docClient };
}

/**
 * 클라이언트 상태 확인 및 필요시 초기화
 */
function ensureClients() {
  // 클라이언트가 초기화되지 않은 경우 기본값으로 초기화
  if (!dynamoDBClient || !docClient) {
    // 환경 변수 확인 (나중에 설정된 경우를 대비)
    const envMockSetting = process.env.MOCK_DYNAMODB === 'true';
    console.log(`⚠️ DynamoDB clients not initialized, auto-initializing in ${envMockSetting ? 'MOCK' : 'REAL'} mode`);
    initDynamoDBClient(envMockSetting);
  }
}

/**
 * Creates a new problem record in DynamoDB.
 * @param {Object} item - The problem item to create.
 * @returns {Promise<void>}
 */
export async function createProblem(item) {
  ensureClients();
  
  console.log(`📝 Creating problem record: ${item.problemId} (Mock: ${mockMode ? 'YES' : 'NO'})`);
  
  try {
    const putCommand = new PutCommand({
      TableName: PROBLEMS_TABLE_NAME,
      Item: item,
      ConditionExpression: "attribute_not_exists(problemId)",
    });
    await docClient.send(putCommand);
    if (GENERATOR_VERBOSE) {
      console.log(`✅ Initial DynamoDB record created for ${item.problemId}`);
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
      console.error("❌ Error creating initial DynamoDB record:", error);
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
  ensureClients();
  
  if (!problemId || Object.keys(updates).length === 0) {
    console.warn("⚠️ Skipping DynamoDB update: Missing problemId or updates.");
    return;
  }

  console.log(`📝 Updating problem record: ${problemId} (Mock: ${mockMode ? 'YES' : 'NO'})`);

  const updateExpressionParts = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  // Dynamically build the update expression parts
  for (const [key, value] of Object.entries(updates)) {
    // Skip undefined values
    if (value === undefined) {
      continue;
    }
    
    const namePlaceholder = `#${key}`;
    const valuePlaceholder = `:${key}Val`;
    updateExpressionParts.push(`${namePlaceholder} = ${valuePlaceholder}`);
    expressionAttributeNames[namePlaceholder] = key;
    expressionAttributeValues[valuePlaceholder] = value;
  }

  // If there are no updates after filtering undefined values, skip the operation
  if (updateExpressionParts.length === 0) {
    console.warn("⚠️ Skipping DynamoDB update: No valid updates after filtering undefined values.");
    return;
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
        `✅ DynamoDB updated for ${problemId}`
      );
    }
  } catch (error) {
    console.error(`❌ Error updating DynamoDB for ${problemId}:`, error);
    // Add more detail to help with debugging
    console.error(`❌ Update details: Expression='${updateExpression}', Values=${JSON.stringify(expressionAttributeValues)}`);
    // Not making it fatal, just log the error
  }
}

/**
 * Gets a problem record from DynamoDB.
 * @param {string} problemId - The problem ID to retrieve.
 * @returns {Promise<Object>} The problem record.
 */
export async function getProblem(problemId) {
  ensureClients();
  
  console.log(`🔍 Getting problem record: ${problemId} (Mock: ${mockMode ? 'YES' : 'NO'})`);
  
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
    console.error(`❌ Error getting problem ${problemId}:`, error);
    throw new Error(`Failed to retrieve problem: ${error.message}`);
  }
} 