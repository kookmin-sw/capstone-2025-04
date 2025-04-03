const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require("uuid");

exports.handler = async (event) => {
    try {
        const { postId } = event.pathParameters; // 요청 URL에서 postId 추출
        const body = JSON.parse(event.body);
        const { content } = body; // 댓글 내용은 body에서 추출

        if (!content) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "content는 필수 항목입니다." }),
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
        const commentId = uuidv4();
        const createdAt = new Date().toISOString();

        // DynamoDB에 저장할 데이터
        const params = {
            TableName: "Community",
            Item: {
                PK: postId,  // 게시글 ID를 PK로 사용 (댓글도 동일한 postId를 가짐)
                SK: `COMMENT#${commentId}`, // 댓글을 구분하는 SK 값, #이 가장 범용적이여서 적용
                commentId,     
                author,
                content,
                createdAt,
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
                commentId,   
                author,      
                content,     
                createdAt,
            }),
        };
        
    } catch (error) {
        console.error("댓글 작성 중 오류 발생:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "서버 오류가 발생했습니다.", error: error.message }),
        };
    }
};
