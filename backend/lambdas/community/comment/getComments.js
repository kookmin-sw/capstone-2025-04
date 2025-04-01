const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// 로그인 없이 모든 유저 사용 가능
exports.handler = async (event) => {
    try {
        const postId = event.pathParameters.postId;
        if (!postId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "postId는 필수입니다." }),
            };
        }

        const params = {
            TableName: "Comments",
            KeyConditionExpression: "postId = :postId",
            ExpressionAttributeValues: {
                ":postId": postId,
            },
            ScanIndexForward: false, // 최신 댓글이 먼저 오도록 정렬
        };

        const result = await dynamoDB.query(params).promise();
        const comments = result.Items || [];
        const commentCount = comments.length; // 댓글 개수

        return {
            statusCode: 200,
            body: JSON.stringify({ comments, commentCount }),
        };
    } catch (error) {
        console.error("댓글 조회 오류:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "서버 오류 발생" }),
        };
    }
};
