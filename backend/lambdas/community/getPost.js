import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

// 클라이언트 설정
const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);

// 로그인 없이 모든 유저 사용 가능
export const handler = async (event) => {
    try {
        const { postId } = event.pathParameters || {}; // 요청 URL에서 postId 가져오기

    // 게시글 정보 가져오기
    const postParams = {
      TableName: "Community",
      Key: {
        PK: postId, // 복합 키 사용
        SK: "POST", // 게시글은 SK를 고정값으로 설정
      },
    };
        const result = await dynamoDB.send(new GetCommand(postParams));
        const post = result.Item;

        if (!post) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "게시글을 찾을 수 없습니다." }),
            };
        }

        const {
            title,
            content,
            author,
            createdAt,
            likesCount = 0, // 좋아요 수, 없으면 0으로 초기화
            likedUsers = [], // 좋아요를 누른 유저 목록, 없으면 빈 배열로 초기화
            updatedAt = null, // 수정된 시간, 없으면 null로 초기화
            problemId = null // job_id, 없으면 null로 초기화
        } = post;

        return {
            statusCode: 200,
            body: JSON.stringify({
                postId,
                title,
                content,
                author,
                createdAt,
                likesCount,
                likedUsers,
                updatedAt,
                problemId,
            }),
        };

    } catch (error) {
        console.error("게시글 조회 중 오류:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "서버 오류가 발생했습니다.", error: error.message }),
        };
    }
};
