const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// 로그인 없이 모든 유저 사용 가능
exports.handler = async (event) => {
    try {
        const { postId } = event.pathParameters; // 요청 URL에서 postId 추출

        const params = {
            TableName: "Community",
            KeyConditionExpression: "PK = :postId AND begins_with(SK, :commentPrefix)", // 댓글만 조회
            ExpressionAttributeValues: {
                ":postId": postId,
                ":commentPrefix": "COMMENT#",
            },
            ScanIndexForward: false, // 최신 댓글부터 정렬
        };

        const result = await dynamoDB.query(params).promise();
        const rawComments = result.Items || []; // 댓글 목록 조회, 없으면 빈 배열로 초기화
        
        const comments = rawComments.map(({ content, author, createdAt, SK }) => ({ // 댓글 데이터 가공
            commentId: SK.replace("COMMENT#", ""), // SK에서 댓글 ID 추출
            content,
            author,
            createdAt,
        }));
        
        const commentCount = comments.length; // 많지 않아서 그냥 배열 길이로 댓글 수 계산 디비에 접근하면 비효율적일것 같아요

        return {
            statusCode: 200,
            body: JSON.stringify({ comments, commentCount }), // 댓글 목록과 댓글 수 반환
        };

    } catch (error) {
        console.error("댓글 조회 오류:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "서버 오류 발생", error: error.message }),
        };
    }
};
