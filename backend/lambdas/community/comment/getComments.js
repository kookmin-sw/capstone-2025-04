import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

// 클라이언트 설정
const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);

// 로그인 없이 모든 유저 사용 가능
export const handler = async (event) => {
    const { postId } = event.pathParameters || {}; // 요청 URL에서 postId 추출

    const queryParams = {
        TableName: "Community",
        KeyConditionExpression: "PK = :postId AND begins_with(SK, :commentPrefix)", // 댓글만 조회
        ExpressionAttributeValues: {
            ":postId": postId,
            ":commentPrefix": "COMMENT#",
        },
        ScanIndexForward: false, // 최신 댓글부터 정렬
    };
    try {
        const { Items = [] } = await dynamoDB.send(new QueryCommand(queryParams)); // DynamoDB 쿼리 실행

        const comments = Items.map(({ content, author, createdAt, SK }) => ({ // 댓글 데이터 가공
            commentId: SK.replace("COMMENT#", ""), // SK에서 댓글 ID 추출
            content,
            author,
            createdAt,
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({
                comments,
                commentCount: comments.length, // 많지 않아서 그냥 배열 길이로 댓글 수 계산 디비에 접근하면 비효율적일것 같아요
            }),
        };

    } catch (error) {
        console.error("댓글 조회 오류:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "서버 오류가 발생했습니다.", error: error.message }),
        };
    }
};
