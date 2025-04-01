const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");

exports.handler = async (event) => {
    try {
        const token = event.headers.Authorization || event.headers.authorization;

        let author;
        if (token === "test") {
            author = "test-user"; // 테스트 모드
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
        }

        const body = JSON.parse(event.body);
        const { postId, content } = body;
        if (!postId || !content) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "postId와 content는 필수입니다." }),
            };
        }

        const commentId = uuidv4();
        const createdAt = new Date().toISOString();

        const params = {
            TableName: "Comments",
            Item: {
                postId,
                commentId,
                author,
                content,
                createdAt,
            },
        };

        await dynamoDB.put(params).promise();

        return {
            statusCode: 201,
            body: JSON.stringify({ message: "댓글이 추가되었습니다.", commentId }),
        };
    } catch (error) {
        console.error("댓글 생성 오류:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "서버 오류 발생" }),
        };
    }
};