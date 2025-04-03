const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// 로그인 없이 모든 유저 사용 가능
exports.handler = async (event) => {
    try {
        const { postId } = event.pathParameters; // 요청 URL에서 postId 가져오기

        // 게시글 정보 가져오기
        const postParams = {
            TableName: "Community",
            Key: { postId },
        };

        const postResult = await dynamoDB.get(postParams).promise();
        const post = postResult.Item;

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
            }),
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "게시글 조회 중 오류 발생", error: error.message }),
        };
    }
};
