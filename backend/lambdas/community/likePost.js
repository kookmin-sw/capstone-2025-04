import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient , GetCommand, UpdateCommand} from "@aws-sdk/lib-dynamodb";

// 클라이언트 설정
const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    try {
        const { postId } = event.pathParameters || {}; // 요청 URL에서 postId 추출

        // API Gateway JWT Authorizer에서 전달된 유저 정보 가져오기
        const claims = event?.requestContext?.authorizer?.claims;
        if (!claims || !claims.username) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "인증 정보가 없습니다." }),
            };
        }
        
        const userId = claims.username;  // JWT에서 추출한 유저 이름

        // 현재 게시글 데이터 가져오기
        const getCommand = new GetCommand({
            TableName: "Community",
            Key: { 
                PK: postId,   // 게시글 ID
                SK: "POST"  // 게시글은 SK를 고정값으로 설정
            },
        });

        const postResult = await dynamoDB.send(getCommand); // JSON 응답 객체
        const post = postResult.Item; // DB에서 가져온 게시글 데이터, 변수에 담아서 재사용성을 높임 !!

        if (!post) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "게시글을 찾을 수 없습니다." }),
            };
        }
        
        const likedUsers = new Set(post.likedUsers || []); // 좋아요를 누른 유저 목록, Set으로 변환하여 중복 제거, 없으면 빈 배열로 초기화
        const isLiked = likedUsers.has(userId); // 현재 유저가 이미 좋아요 눌렀는지 확인

        isLiked ? likedUsers.delete(userId) : likedUsers.add(userId); // 좋아요 상태에 따라 추가 또는 삭제
        
        const updateCommand = new UpdateCommand({ 
            TableName: "Community",
            Key: { 
                PK: postId,
                SK: "POST" 
            },
            UpdateExpression: "SET likedUsers = :users, likesCount = :count",
            ExpressionAttributeValues: {
                ":users": Array.from(likedUsers), // Set을 배열로 변환하여 저장
                ":count": likedUsers.size, // 좋아요 수 업데이트
            },
        });

        await dynamoDB.send(updateCommand);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: isLiked ? "좋아요가 취소되었습니다." : "좋아요가 추가되었습니다.",
                likedUsers: Array.from(likedUsers), // 현재 좋아요를 누른 유저 목록
                likesCount: likedUsers.size, // 현재 좋아요 수
                isLiked: !isLiked, // 프론트에서 사용자가 좋아요를 눌렀는지 쉽게 확인할 수 있도록 추가
            }),
        };          
        
    } catch (error) {
        console.error("좋아요 처리 중 오류 발생:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "서버 오류가 발생했습니다.", error: error.message }),
        };
    }
};
