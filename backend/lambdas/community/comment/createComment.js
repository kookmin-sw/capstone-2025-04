const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require("uuid");

exports.handler = async (event) => {
    try {
        const body = JSON.parse(event.body); // 클라이언트 요청 데이터 파싱
        const { postId, content } = body; // 게시글ID와 내용 추출

        if (!postId || !content) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "postId와 content는 필수 항목입니다." }),
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
        
        const author = claims.username;  // JWT에서 추출한 사용자 이름
        const commentId = uuidv4();

        // DynamoDB에 저장할 데이터
        const params = {
            TableName: "Community",
            Item: {
                PK: postId,  // 게시글 ID를 PK로 사용 (댓글도 동일한 postId를 가짐)
                SK: `comment#${commentId}`, // 댓글을 구분하는 SK 값 #이 가장 범용적이여서 적용
                commentId,     
                author,
                content,
                createdAt: new Date().toISOString(),
            },
        };

        // DynamoDB에 데이터 저장
        await dynamoDB.put(params).promise();

        // 댓글 생성 성공 응답
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: "댓글이 성공적으로 추가되었습니다.",
                postId,      // 어떤 게시글에 달린 댓글인지
                commentId,   // 생성된 댓글 ID
                author,      // 댓글 작성자
                content,     // 댓글 내용
            }),
        };
        
    } catch (error) {
        console.error("댓글 생성 오류:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "서버 오류 발생" }),
        };
    }
};
