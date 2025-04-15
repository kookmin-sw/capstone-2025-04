import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

// 클라이언트 설정
const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    try {
        const { postId, commentId } = event.pathParameters || {}; // 요청 URL에서 postId와 commentId 추출

        // API Gateway JWT Authorizer에서 전달된 유저 정보 가져오기
        const claims = event?.requestContext?.authorizer?.claims;
        if (!claims || !claims.username) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "인증 정보가 없습니다." }),
            };
        }

        const author = claims.username;

        // 댓글 조회
        const getCommand = new GetCommand({
            TableName: "Community",
            Key: {
              PK: postId,
              SK: `COMMENT#${commentId}`,
            },
        });
      
        const commentResult = await dynamoDB.send(getCommand);
        const comment = commentResult.Item;
     
        if (!comment) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "댓글을 찾을 수 없습니다." }),
            };
        }

        if (comment.author !== author) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: "댓글을 삭제할 권한이 없습니다." }),
            };
        }

        // 트랜잭션으로 댓글 삭제 + 댓글 수 감소
        const deleteCommand = new TransactWriteCommand({
            TransactItems: [
                {
                    Delete: {
                        TableName: "Community",
                        Key: {
                            PK: postId,
                            SK: `COMMENT#${commentId}`,
                        },
                        ConditionExpression: "attribute_exists(PK)", // 존재할 때만 삭제
                    },
                },
                {
                    Update: {
                        TableName: "Community",
                        Key: {
                            PK: postId,
                            SK: "POST",
                        },
                        UpdateExpression: "SET commentCount = if_not_exists(commentCount, :zero) - :dec",
                        ExpressionAttributeValues: {
                            ":dec": 1,
                            ":zero": 0,
                        },
                        ConditionExpression: "attribute_exists(PK)", // 게시글 존재할 때만 감소
                    },
                },
            ],
        });

        await dynamoDB.send(deleteCommand);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "댓글이 성공적으로 삭제되었습니다.",
                postId,
                commentId,
            }),
        };
        
    } catch (error) {
        console.error("댓글 삭제 중 오류 발생:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "서버 오류가 발생했습니다.", error: error.message }),
        };
    }
};
