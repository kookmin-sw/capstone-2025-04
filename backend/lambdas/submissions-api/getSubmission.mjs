import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB Client
const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);
const tableName = process.env.SUBMISSIONS_TABLE_NAME; // Lambda 환경 변수에서 가져옴

// CORS Headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // 실제 운영 환경에서는 특정 Origin으로 제한
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// GSI 이름 상수화
const GSI_PROBLEM_ID_TIME = "ProblemIdSubmissionTimeIndex";
const GSI_USER_ID_TIME = "UserIdSubmissionTimeIndex";
const GSI_ALL_SUBMISSIONS_TIME = "AllSubmissionsByTimeIndex";
const GSI_AUTHOR_TIME = "AuthorSubmissionTimeIndex";

const DEFAULT_PAGE_SIZE = 20;

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "CORS preflight check successful" }),
    };
  }

  if (!tableName) {
    console.error(
      "Error: SUBMISSIONS_TABLE_NAME environment variable not set.",
    );
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Server configuration error" }),
    };
  }

  console.log("Received event for getSubmissions:", JSON.stringify(event));

  try {
    const queryParams = event.queryStringParameters || {};
    const submissionId = queryParams.submissionId;
    
    // If submissionId is provided, fetch that specific submission
    if (submissionId) {
      console.log(`Fetching specific submission with ID: ${submissionId}`);
      
      const params = {
        TableName: tableName,
        Key: {
          submissionId: { S: submissionId }
        }
      };
      
      // Use the regular DynamoDB client for GetItemCommand
      const command = new GetItemCommand(params);
      const result = await client.send(command);
      
      if (!result.Item) {
        return {
          statusCode: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ 
            message: `Submission with ID ${submissionId} not found` 
          }),
        };
      }
      
      // Convert the DynamoDB attribute values to JavaScript objects
      const unmarshalled = unmarshallItem(result.Item);
      
      // Wrap the single item in the same response format for consistency
      const responseBody = {
        items: [unmarshalled],
        lastEvaluatedKey: null,
        count: 1,
        scannedCount: 1,
      };
      
      return {
        statusCode: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(responseBody),
      };
    }
    
    // If no submissionId, proceed with the existing query logic
    const userId = queryParams.userId;
    const problemId = queryParams.problemId;
    const author = queryParams.author;
    const problemTitleTranslated = queryParams.problemTitleTranslated;
    const pageSize = parseInt(queryParams.pageSize, 10) || DEFAULT_PAGE_SIZE;
    const sortOrder =
      queryParams.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";
    let lastEvaluatedKey = queryParams.lastEvaluatedKey;

    const projectionExpressionParts = [
      "submissionId",
      "problemId",
      "problemTitle",
      "problemTitleTranslated",
      "userId",
      "author",
      "#s", // for status
      "submissionTime",
      "executionTime",
      "#l", // for language
      "errorMessage",
    ];

    const expressionAttributeNames = {
      "#s": "status",
      "#l": "language", // 'language'를 #l로 매핑
    };

    const params = {
      TableName: tableName,
      Limit: pageSize,
      ScanIndexForward: sortOrder === "ASC",
      ProjectionExpression: projectionExpressionParts.join(", "), // 수정됨
      ExpressionAttributeNames: expressionAttributeNames, // 수정됨
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

    // GSI 및 KeyConditionExpression 구성 (이 부분은 변경 없음)
    if (userId && problemId) {
      params.IndexName = GSI_USER_ID_TIME;
      params.KeyConditionExpression = "userId = :userIdVal";
      params.FilterExpression = "problemId = :problemIdVal";
      params.ExpressionAttributeValues = {
        ":userIdVal": userId,
        ":problemIdVal": problemId,
      };
    } else if (author && problemId) {
      params.IndexName = GSI_AUTHOR_TIME;
      params.KeyConditionExpression = "author = :authorVal";
      params.FilterExpression = "problemId = :problemIdVal";
      params.ExpressionAttributeValues = {
        ":authorVal": author,
        ":problemIdVal": problemId,
      };
    } else if (userId) {
      params.IndexName = GSI_USER_ID_TIME;
      params.KeyConditionExpression = "userId = :userIdVal";
      params.ExpressionAttributeValues = { ":userIdVal": userId };
    } else if (problemId) {
      params.IndexName = GSI_PROBLEM_ID_TIME;
      params.KeyConditionExpression = "problemId = :problemIdVal";
      params.ExpressionAttributeValues = { ":problemIdVal": problemId };
    } else if (author) {
      params.IndexName = GSI_AUTHOR_TIME;
      params.KeyConditionExpression = "author = :authorVal";
      params.ExpressionAttributeValues = { ":authorVal": author };
    } else {
      params.IndexName = GSI_ALL_SUBMISSIONS_TIME;
      params.KeyConditionExpression = "is_submission = :isSubVal";
      params.ExpressionAttributeValues = { ":isSubVal": "Y" };
    }

    // Add problemTitleTranslated filter if specified
    if (problemTitleTranslated) {
      // If we already have a FilterExpression, we need to append with AND
      if (params.FilterExpression) {
        params.FilterExpression += " AND contains(problemTitleTranslated, :titleVal)";
      } else {
        params.FilterExpression = "contains(problemTitleTranslated, :titleVal)";
      }
      
      // Add the value to ExpressionAttributeValues
      params.ExpressionAttributeValues = {
        ...params.ExpressionAttributeValues,
        ":titleVal": problemTitleTranslated
      };
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
      scannedCount: result.ScannedCount || 0,
    };

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(responseBody),
    };
  } catch (error) {
    console.error("Error retrieving submissions:", error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Failed to retrieve submissions",
        error: error.message,
        errorStack: error.stack,
      }),
    };
  }
};

// Helper function to convert DynamoDB attribute values to JavaScript objects
function unmarshallItem(item) {
  if (!item) return null;
  
  const result = {};
  
  for (const [key, value] of Object.entries(item)) {
    if (value.S !== undefined) {
      result[key] = value.S;
    } else if (value.N !== undefined) {
      result[key] = Number(value.N);
    } else if (value.BOOL !== undefined) {
      result[key] = value.BOOL;
    } else if (value.NULL !== undefined) {
      result[key] = null;
    } else if (value.L !== undefined) {
      result[key] = value.L.map(unmarshallItem);
    } else if (value.M !== undefined) {
      result[key] = unmarshallItem(value.M);
    } else if (value.SS !== undefined) {
      result[key] = value.SS;
    } else if (value.NS !== undefined) {
      result[key] = value.NS.map(Number);
    }
  }
  
  return result;
}
