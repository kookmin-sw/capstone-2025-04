const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const jwt = require("jsonwebtoken");

exports.handler = async (event) => {
    try {
        const token = event.headers.Authorization || event.headers.authorization;

        let author;
        let isAdmin = false;
        if (token === "test") {
            author = "test-user"; // 테스트 모드
            isAdmin = true;  // 테스트 모드에서는 관리자 권한 부여
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

            // 관리자 권한 확인 (profile에서 관리자 정보를 가져오거나, JWT에 권한 정보가 있다면 확인)
            isAdmin = decoded.role === 'admin'; // 예시로 role이 'admin'일 경우 관리자 권한 부여
        }

        const body = JSON.parse(event.body);
        const { commentId } = body;

        // commentId가 없으면 에러 반환
        if (!commentId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "commentId는 필수입니다." }),
            };
        }

        // 댓글을 가져오기 위한 파라미터 설정
        const getCommentParams = {
            TableName: "Comments", // 댓글 테이블
            Key: {
                commentId: commentId, // 댓글 ID로 조회
            },
        };

        const commentResult = await dynamoDB.get(getCommentParams).promise();

        if (!commentResult.Item) {
            // 댓글이 존재하지 않으면 에러 반환
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "댓글이 존재하지 않습니다." }),
            };
        }

        // 댓글 작성자와 요청자가 일치하는지 또는 관리자인지 확인
        if (commentResult.Item.author !== author && !isAdmin) {
            // 작성자나 관리자가 아니면 삭제할 수 없게 설정
            return {
                statusCode: 403,
                body: JSON.stringify({ message: "이 댓글을 삭제할 권한이 없습니다." }),
            };
        }

        // 댓글 삭제 (댓글 ID로 삭제)
        const deleteCommentParams = {
            TableName: "Comments",
            Key: {
                commentId: commentId,
            },
        };

        await dynamoDB.delete(deleteCommentParams).promise();

        // 성공적으로 삭제되었을 경우
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "댓글이 성공적으로 삭제되었습니다.",
            }),
        };
    } catch (error) {
        console.error("댓글 삭제 중 오류 발생:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "댓글 삭제 중 오류 발생", error: error.message }),
        };
    }
};
