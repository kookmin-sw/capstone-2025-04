const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const axios = require("axios"); // npm install axios 필요

// 로그인 없이 모든 유저 사용 가능
exports.handler = async (event) => {
    try {
        const { postId } = event.pathParameters; // 요청 URL에서 postId 가져오기

        // 게시글 정보 가져오기
        const postParams = {
            TableName: "Posts",
            Key: { postId },
        };

        const postResult = await dynamoDB.get(postParams).promise();
        if (!postResult.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "게시글을 찾을 수 없습니다." }),
            };
        }

        const { title, content, author, createdAt } = postResult.Item;

        // 좋아요 수 가져오기
        const likesParams = {
            TableName: "PostLikes",
            IndexName: "PostIdIndex",
            KeyConditionExpression: "postId = :postId",
            ExpressionAttributeValues: { ":postId": postId },
        };

        const likesResult = await dynamoDB.query(likesParams).promise();
        const likesCount = likesResult.Items.length;

        // 반환할 데이터
        return {
            statusCode: 200,
            body: JSON.stringify({
                postId,
                title,
                content,
                author,
                createdAt,
                likesCount,
            }),
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "게시글 조회 중 오류 발생", error: error.message }),
        };
    }
};
