const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require("uuid");

exports.handler = async (event) => {
    try {
        const body = JSON.parse(event.body); // 클라이언트 요청 데이터 파싱
        const { title, content } = body; // 제목과 내용 추출

        if (!title || !content) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "title과 content는 필수 항목입니다." }),
            };
        }

        // API Gateway JWT Authorizer에서 전달된 유저 정보 가져오기
        const claims = event.requestContext.authorizer.claims;
        if (!claims || !claims.username) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "인증 정보가 없습니다." }),
            };
        }
        
        const author = claims.username;  // JWT에서 추출한 유저 이름
        const postId = uuidv4(); // 게시글 ID 생성
        const createdAt = new Date().toISOString(); // 게시글 작성 시간
        
        // DynamoDB에 저장할 데이터
        const postData = {
            TableName: "Community",
            Item: {
                PK: postId,  // 게시글 ID를 PK로 사용 (댓글도 동일한 postId를 가짐)
                SK: "POST",   // 정렬 키 (게시글은 POST로 고정)
                author,
                title,
                content,
                createdAt,
            },
        };

        // DynamoDB에 데이터 저장
        await dynamoDB.put(postData).promise();

        // 게시글 생성 성공 응답
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: "게시글이 성공적으로 작성되었습니다.",
                postId,
                author,
                title,
                content,
                createdAt,
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
