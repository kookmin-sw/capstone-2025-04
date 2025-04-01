const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken"); // npm install 필요

exports.handler = async (event) => {
    try {
        // Authorization 헤더에서 토큰 가져오기
        const token = event.headers.Authorization || event.headers.authorization;
        
        let author;
        if (token === "test") {
            // 테스트 모드: 인증 바이패스
            author = "test-user";
        } else {
            if (!token) {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ message: "Authorization 헤더가 없습니다." }),
                };
            }

            const jwtToken = token.replace("Bearer ", "");

            // JWT 디코딩 (검증 없이)
            const decoded = jwt.decode(jwtToken);
            if (!decoded || !decoded.username) {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ message: "유효하지 않은 토큰입니다." }),
                };
            }

            author = decoded.username;
        }

        // 요청 본문에서 게시글 내용 받기
        const body = JSON.parse(event.body);
        const postId = uuidv4();  // 게시글 ID 생성 (고유값)
        const { title, content } = body; // 게시글 제목과 내용

        if (!title || !content) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "제목과 내용은 필수 항목입니다." }),
            };
        }

        // 게시글 데이터 객체 구성
        const postData = {
            TableName: "CommunityPosts",  // DynamoDB 테이블 이름
            Item: {
                postId,           // 게시글 ID
                title,            // 게시글 제목
                content,          // 게시글 내용
                author,           // 작성자
                createdAt: new Date().toISOString(), // 생성일
            },
        };

        // DynamoDB에 게시글 저장
        await dynamoDB.put(postData).promise();

        // 게시글 작성 완료 응답
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: "게시글이 성공적으로 작성되었습니다.",
                postId: postId,
                author: author,
                title: title,
                content: content,
            }),
        };
    } catch (error) {
        console.error("게시글 작성 중 오류 발생:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "서버 오류가 발생했습니다.", error: error.message }),
        };
    }
};
