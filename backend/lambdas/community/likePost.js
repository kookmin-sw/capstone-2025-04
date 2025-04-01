const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");

exports.handler = async (event) => {
    try {
        const token = event.headers.Authorization || event.headers.authorization;

        let user;
        if (token === "test") {
            user = "test-user"; // 테스트 모드
        } else {
            if (!token) {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ message: "Authorization 헤더가 없습니다." }),
                };
            }

            const jwtToken = token.replace("Bearer ", "");
            const decoded = jwt.decode(jwtToken); // 검증 없이 디코딩
            if (!decoded || !decoded.username) {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ message: "유효하지 않은 토큰입니다." }),
                };
            }
            user = decoded.username;
        }

        const body = JSON.parse(event.body);
        const { postId } = body;  // 좋아요를 누를 게시글의 postId

        // postId가 없으면 에러 반환
        if (!postId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "postId는 필수입니다." }),
            };
        }

        // PostLikes 테이블에서 해당 사용자가 이미 좋아요를 눌렀는지 확인
        const getLikeParams = {
            TableName: "PostLikes",
            Key: {
                userId: user,
                postId: postId,
            },
        };

        const likeResult = await dynamoDB.get(getLikeParams).promise();

        if (likeResult.Item) {
            // 이미 좋아요를 눌렀다면 좋아요 취소 (PostLikes에서 삭제)
            const deleteLikeParams = {
                TableName: "PostLikes",
                Key: {
                    userId: user,
                    postId: postId,
                },
            };

            await dynamoDB.delete(deleteLikeParams).promise();

            // 좋아요 취소 후 반환
            return {
                statusCode: 200,
                body: JSON.stringify({ message: "좋아요가 취소되었습니다." }),
            };
        } else {
            // 좋아요가 눌리지 않았다면, PostLikes 테이블에 새로 추가
            const addLikeParams = {
                TableName: "PostLikes",
                Item: {
                    userId: user,
                    postId: postId,
                    createdAt: new Date().toISOString(),
                },
            };

            await dynamoDB.put(addLikeParams).promise();

            // 좋아요 추가 후 반환
            return {
                statusCode: 200,
                body: JSON.stringify({ message: "좋아요가 추가되었습니다." }),
            };
        }
    } catch (error) {
        console.error("좋아요 처리 중 오류 발생:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "좋아요 처리 중 오류 발생", error: error.message }),
        };
    }
};
