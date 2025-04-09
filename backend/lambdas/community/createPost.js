import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

// 클라이언트 설정
const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    try {
        const body = JSON.parse(event.body || "{}"); // 클라이언트 요청 데이터 파싱
        const { title, content, problemId } = body; // 제목과 내용, 문제 ID

        if (!title || !content) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "title과 content는 필수 항목입니다." }),
            };
        }

        // API Gateway JWT Authorizer에서 전달된 유저 정보 가져오기
        const claims = event?.requestContext?.authorizer?.claims;
        if (!claims || !claims.username) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "인증 정보가 없습니다." }),
            };
        }
        
        const author = claims.username;  // JWT에서 추출한 유저 이름
        const postId = uuidv4(); // 게시글 ID 생성
        const createdAt = new Date().toISOString(); // 게시글 작성 시간
        
        // DynamoDB에 저장할 데이터
        const command = new PutCommand({
            TableName: "Community",
            Item: {
                PK: postId,  // 게시글 ID를 PK로 사용 (댓글도 동일한 postId를 가짐)
                SK: "POST",   // 정렬 키 (게시글은 POST로 고정)
                author,
                title,
                content,
                createdAt,
                ...(problemId && { problemId }) // 문제가 있을 때만 추가
            },
        });

        // DynamoDB에 데이터 저장
        await dynamoDB.send(command);

        // 게시글 생성 성공 응답
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: "게시글이 성공적으로 작성되었습니다.",
                postId,
                author,
                title,
                content,
                createdAt,
                ...(problemId && { problemId })
            }),
        };

    } catch (error) {
        console.error("게시글 작성 중 오류 발생:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "서버 오류가 발생했습니다.", error: error.message }),
        };
    }
};
