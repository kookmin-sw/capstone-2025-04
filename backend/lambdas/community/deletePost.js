const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const jwt = require("jsonwebtoken");

exports.handler = async (event) => {
    try {
        const token = event.headers.Authorization || event.headers.authorization;

        let author;
        let isAdmin = false;
        if (token === "test") {
            author = "test-user"; // 테스트 모드
            isAdmin = true;  // 테스트 모드에서는 관리자 권한 부여
        } else {
            if (!token) {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ message: "Authorization 헤더가 없습니다." }),
                };
            }

            const jwtToken = token.replace("Bearer ", "");
            const decoded = jwt.decode(jwtToken);
            if (!decoded || !decoded.username) {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ message: "유효하지 않은 토큰입니다." }),
                };
            }
            author = decoded.username;
            isAdmin = decoded.role === 'admin';
        }

        const body = JSON.parse(event.body);
        const { postId } = body;

        if (!postId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "postId는 필수입니다." }),
            };
        }

        // 게시글 가져오기
        const getPostParams = {
            TableName: "Posts",
            Key: { postId: postId },
        };

        const postResult = await dynamoDB.get(getPostParams).promise();

        if (!postResult.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "게시글이 존재하지 않습니다." }),
            };
        }

        if (postResult.Item.author !== author && !isAdmin) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: "이 게시글을 삭제할 권한이 없습니다." }),
            };
        }

        // 댓글 삭제
        const getCommentsParams = {
            TableName: "Comments",
            IndexName: "PostIdIndex",
            KeyConditionExpression: "postId = :postId",
            ExpressionAttributeValues: { ":postId": postId },
        };

        const commentsResult = await dynamoDB.query(getCommentsParams).promise();
        const comments = commentsResult.Items || [];

        for (let comment of comments) {
            const deleteCommentParams = {
                TableName: "Comments",
                Key: { commentId: comment.commentId, postId: postId },
            };
            await dynamoDB.delete(deleteCommentParams).promise();
        }

        // 좋아요 삭제
        const getLikesParams = {
            TableName: "PostLikes",
            IndexName: "PostIdIndex",
            KeyConditionExpression: "postId = :postId",
            ExpressionAttributeValues: { ":postId": postId },
        };

        const likesResult = await dynamoDB.query(getLikesParams).promise();
        const likes = likesResult.Items || [];

        for (let like of likes) {
            const deleteLikeParams = {
                TableName: "PostLikes",
                Key: { userId: like.userId, postId: postId },
            };
            await dynamoDB.delete(deleteLikeParams).promise();
        }

        // 게시글 삭제
        const deletePostParams = {
            TableName: "Posts",
            Key: { postId: postId },
        };

        await dynamoDB.delete(deletePostParams).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "게시글과 관련된 댓글, 좋아요가 모두 삭제되었습니다.",
            }),
        };
    } catch (error) {
        console.error("게시글 삭제 중 오류 발생:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "게시글 삭제 중 오류 발생", error: error.message }),
        };
    }
};
