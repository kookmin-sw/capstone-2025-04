import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

// 클라이언트 설정
const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);

// 로그인 없이 모든 유저 사용 가능
exports.handler = async (event) => {
    try {
        const params = {
            TableName: "Community",
            IndexName: "postOnlyIndex", // GSI 이름 지정 !! 코드 리뷰 반영했습니당
            KeyConditionExpression: "SK = :sk",
            ExpressionAttributeValues: {
                ":sk": "POST", // PK 없이 SK로만 조회 -> GSI 필요
            },
            ScanIndexForward: false, // 최신순 정렬 (createdAt 기준)
        };

        const result = await dynamoDB.send(new QueryCommand(params));
        const items = result.Items || [];

        const posts = items.map((item) => ({
            postId: item.PK,
            title: item.title,
            author: item.author,
            createdAt: item.createdAt,
            likesCount: item.likesCount || 0,
            commentCount: item.commentCount || 0,
            job_id: item.job_id || null,
        }));

        return {
            statusCode: 200,
            body: JSON.stringify(posts),
        };

    } catch (error) {
        console.error("게시글 목록 조회 중 오류:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "서버 오류가 발생했습니다.", error: error.message }),
        };
    }
};
