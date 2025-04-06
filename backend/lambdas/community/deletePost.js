const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const { postId } = event.pathParameters; // 요청 URL에서 postId 가져오기

        // API Gateway JWT Authorizer에서 전달된 유저 정보 가져오기
        const claims = event.requestContext.authorizer.claims;
        if (!claims || !claims.username) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "인증 정보가 없습니다." }),
            };
        }

        const author = claims.username;

        // 게시글 존재 여부 확인
        const getParams = {
            TableName: "Community",
            Key: {
                PK: postId,
                SK: "POST",
            },
        };

        const result = await dynamoDB.get(getParams).promise();
        const post = result.Item;

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

        // 댓글 조회 (최대 24개까지만 지원. 그 이상이면 반복 처리 필요)
        const commentQuery = await dynamoDB.query({
            TableName: "Community",
            KeyConditionExpression: "PK = :postId AND begins_with(SK, :prefix)",
            ExpressionAttributeValues: {
                ":postId": postId,
                ":prefix": "COMMENT#",
            },
        }).promise();

        const commentDeleteOps = commentQuery.Items.map((comment) => ({
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
                body: JSON.stringify({ message: "댓글 수가 너무 많아 한 번에 삭제할 수 없습니다. (최대 24개까지 지원)" }),
            };
        }

        await dynamoDB.transactWrite({
            TransactItems: transactItems,
        }).promise();

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
