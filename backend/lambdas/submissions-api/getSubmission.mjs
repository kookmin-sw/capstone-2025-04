import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB Client
const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);
const tableName = process.env.SUBMISSIONS_TABLE_NAME; // Lambda 환경 변수에서 가져옴

// CORS Headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // 실제 운영 환경에서는 특정 Origin으로 제한
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization", // 필요에 따라 Authorization 추가
};

// GSI 이름 상수화
const GSI_PROBLEM_ID_TIME = "ProblemIdSubmissionTimeIndex";
const GSI_USER_ID_TIME = "UserIdSubmissionTimeIndex";
const GSI_ALL_SUBMISSIONS_TIME = "AllSubmissionsByTimeIndex"; // is_submission을 PK로 사용
const GSI_AUTHOR_TIME = "AuthorSubmissionTimeIndex"; // author를 PK로 사용

const DEFAULT_PAGE_SIZE = 20;

export const handler = async (event) => {
  // CORS preflight 요청 처리
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
    const userId = queryParams.userId;
    const problemId = queryParams.problemId;
    const author = queryParams.author; // author 파라미터 추가
    const pageSize = parseInt(queryParams.pageSize, 10) || DEFAULT_PAGE_SIZE;
    const sortOrder =
      queryParams.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC"; // 기본 DESC
    let lastEvaluatedKey = queryParams.lastEvaluatedKey;

    const params = {
      TableName: tableName,
      Limit: pageSize,
      ScanIndexForward: sortOrder === "ASC", // ASC면 true, DESC면 false
      // 필요한 필드만 가져오도록 ProjectionExpression 설정 (성능 및 비용 최적화)
      ProjectionExpression:
        "submissionId, problemId, userId, author, #s, submissionTime, executionTime, language, errorMessage", // author 추가
      ExpressionAttributeNames: {
        "#s": "status", // 'status'는 예약어일 수 있으므로 ExpressionAttributeNames 사용
      },
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

    // GSI 및 KeyConditionExpression 구성
    if (userId && problemId) {
      // userId와 problemId가 모두 있는 경우: UserIdSubmissionTimeIndex를 사용하고 problemId로 필터링
      // 또는 ProblemIdSubmissionTimeIndex를 사용하고 userId로 필터링.
      // 더 선택적인 (cardinality가 높은) 키를 GSI의 PK로 사용하는 것이 좋음.
      // 여기서는 UserIdSubmissionTimeIndex를 예시로 사용.
      params.IndexName = GSI_USER_ID_TIME;
      params.KeyConditionExpression = "userId = :userIdVal";
      params.FilterExpression = "problemId = :problemIdVal"; // GSI의 PK 외 필터는 FilterExpression 사용
      params.ExpressionAttributeValues = {
        ":userIdVal": userId,
        ":problemIdVal": problemId,
      };
    } else if (author && problemId) { // author와 problemId가 있는 경우
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
    } else if (author) { // author만 있는 경우
      params.IndexName = GSI_AUTHOR_TIME;
      params.KeyConditionExpression = "author = :authorVal";
      params.ExpressionAttributeValues = { ":authorVal": author };
    } else {
      // 특정 필터가 없는 경우: 모든 제출물을 최신순으로 (AllSubmissionsByTimeIndex 사용)
      params.IndexName = GSI_ALL_SUBMISSIONS_TIME;
      // 이 GSI는 'is_submission' 같은 고정된 파티션 키 값을 가짐
      params.KeyConditionExpression = "is_submission = :isSubVal";
      params.ExpressionAttributeValues = { ":isSubVal": "Y" }; // code-grader에서 저장 시 "Y"로 저장 가정
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
      scannedCount: result.ScannedCount || 0, // FilterExpression 사용 시 Count와 다를 수 있음
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
        errorStack: error.stack, // 개발 중에만 유용
      }),
    };
  }
};
