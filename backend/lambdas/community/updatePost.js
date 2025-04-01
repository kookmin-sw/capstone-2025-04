const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();
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
            const decoded = jwt.decode(jwtToken); // 검증 없이 디코딩
            if (!decoded || !decoded.username) {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ message: "유효하지 않은 토큰입니다." }),
                };
            }
            author = decoded.username;
        }

        const body = JSON.parse(event.body);
        const { postId, title, content } = body;

        // postId, title, content가 없으면 에러 반환
        if (!postId || !title || !content) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "postId, title, content는 필수입니다." }),
            };
        }

        // 게시글을 업데이트 하기 전에 게시글이 존재하는지 확인
        const getPostParams = {
            TableName: "Posts", // 게시글 테이블
            Key: {
                postId: postId,  // 게시글 ID로 조회
            },
        };

        const postResult = await dynamoDB.get(getPostParams).promise();

        if (!postResult.Item) {
            // 게시글이 존재하지 않으면 에러 반환
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "게시글이 존재하지 않습니다." }),
            };
        }

        // 게시글 작성자가 요청자와 일치하는지 확인
        if (postResult.Item.author !== author) {
            // 게시글 작성자와 요청자가 다르면 수정 불가
            return {
                statusCode: 403,
                body: JSON.stringify({ message: "이 게시글을 수정할 권한이 없습니다." }),
            };
        }

        // 게시글 수정 (title, content을 업데이트)
        const updatePostParams = {
            TableName: "Posts",
            Key: {
                postId: postId,
            },
            UpdateExpression: "set title = :title, content = :content, updatedAt = :updatedAt", // 수정할 항목
            ExpressionAttributeValues: {
                ":title": title,
                ":content": content,
                ":updatedAt": new Date().toISOString(), // 수정된 시간
            },
            ReturnValues: "ALL_NEW", // 수정된 항목 반환
        };

        const updateResult = await dynamoDB.update(updatePostParams).promise();

        // 성공적으로 수정되었을 경우
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "게시글이 성공적으로 수정되었습니다.",
                updatedPost: updateResult.Attributes, // 수정된 게시글 정보
            }),
        };
    } catch (error) {
        console.error("게시글 수정 중 오류 발생:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "게시글 수정 중 오류 발생", error: error.message }),
        };
    }
};
