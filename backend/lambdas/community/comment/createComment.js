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

        // 트랜잭션으로 댓글 생성 + 댓글 수 증가
        await dynamoDB.transactWrite({
        TransactItems: [
            {
            Put: { // DynamoDB에 저장할 데이터
                TableName: "Community",
                Item: {
                PK: postId,
                SK: `COMMENT#${commentId}`,
                commentId,
                author,
                content,
                createdAt,
                },
            },
            },
            {
            Update: { // 댓글 수 증가
                TableName: "Community",
                Key: { PK: postId, SK: "POST" },
                UpdateExpression: "SET commentCount = if_not_exists(commentCount, :zero) + :inc",
                ExpressionAttributeValues: {
                ":inc": 1,
                ":zero": 0,
                },
            },
            },
        ],
        }).promise();

        // 댓글 생성 성공 응답, 카운트는 원한다면 할게요,,,
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
