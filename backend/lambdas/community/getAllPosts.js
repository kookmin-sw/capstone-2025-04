const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// 로그인 없이 모든 유저 사용 가능
exports.handler = async (event) => {
    try {
        // 모든 게시글 조회
        const postsParams = {
            TableName: "Posts",
        };

        const postsResult = await dynamoDB.scan(postsParams).promise();
        const posts = postsResult.Items || [];

        // 각 게시글의 좋아요 수 & 댓글 수 가져오기
        const postsWithCounts = await Promise.all(
            posts.map(async (post) => {
                const { postId, title, author } = post;

                // 좋아요 수 조회
                const likesParams = {
                    TableName: "PostLikes",
                    IndexName: "PostIdIndex",
                    KeyConditionExpression: "postId = :postId",
                    ExpressionAttributeValues: { ":postId": postId },
                };

                const likesResult = await dynamoDB.query(likesParams).promise();
                const likesCount = likesResult.Items.length;

                // 댓글 수 조회
                const commentsParams = {
                    TableName: "Comments",
                    KeyConditionExpression: "postId = :postId",
                    ExpressionAttributeValues: { ":postId": postId },
                };

                const commentsResult = await dynamoDB.query(commentsParams).promise();
                const commentsCount = commentsResult.Items.length;

                return {
                    postId,
                    title,
                    author,
                    likesCount,
                    commentsCount,
                };
            })
        );

        return {
            statusCode: 200,
            body: JSON.stringify(postsWithCounts),
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "게시글 목록 조회 중 오류 발생", error: error.message }),
        };
    }
};
