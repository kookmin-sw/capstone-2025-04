import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

// 클라이언트 설정
const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);

// 로그인 없이 모든 유저 사용 가능
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

        const author = claims.username;

        // 게시글 존재 여부 확인
        const getCommand = new GetCommand({
            TableName: "Community",
            Key: {
                PK: postId,
                SK: "POST",
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

        // 본인 확인
        if (post.author !== author) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: "게시글을 삭제할 권한이 없습니다." }),
            };
        }

        // 댓글 조회 (최대 24개까지만 지원(+게시글 삭제 1개). 그 이상이면 반복 처리 필요)
        const commentQuery = new QueryCommand({
            TableName: "Community",
            KeyConditionExpression: "PK = :postId AND begins_with(SK, :prefix)",
            ExpressionAttributeValues: {
              ":postId": postId,
              ":prefix": "COMMENT#",
            },
        });

        const commentResult = await dynamoDB.send(commentQuery);
        const commentDeleteOps = commentResult.Items.map((comment) => ({
            Delete: {
              TableName: "Community",
              Key: {
                PK: comment.PK,
                SK: comment.SK,
              },
            },
        }));

        // 게시글 삭제도 포함
        const deletePostOp = {
            Delete: {
                TableName: "Community",
                Key: {
                    PK: postId,
                    SK: "POST",
                },
            },
        };

        // 트랜잭션 실행 (최대 25개)
        const transactItems = [deletePostOp, ...commentDeleteOps];

        if (transactItems.length > 25) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "댓글 수가 너무 많아 한 번에 삭제할 수 없습니다. (댓글 최대 24개까지 지원)" }),
            };
        }

        const transactionCommand = new TransactWriteCommand({
            TransactItems: transactItems,
        });

        await dynamoDB.send(transactionCommand);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "게시글과 모든 댓글이 성공적으로 삭제되었습니다.",
                deletedComments: commentDeleteOps.length,
            }),
        };
        
    } catch (error) {
        console.error("게시글 삭제 중 오류 발생:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "서버 오류가 발생했습니다.", error: error.message }),
        };
    }
};
