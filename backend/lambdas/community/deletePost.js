const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const jwt = require("jsonwebtoken");
const axios = require("axios");  // axios 추가

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
        const { postId } = body;

        // postId가 없으면 에러 반환
        if (!postId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "postId는 필수입니다." }),
            };
        }

        // 게시글을 가져오기 위한 파라미터 설정
        const getPostParams = {
            TableName: "Posts", // 게시글 테이블
            Key: {
                postId: postId, // 게시글 ID로 조회
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

        // 게시글 작성자와 요청자가 일치하는지 또는 관리자인지 확인
        if (postResult.Item.author !== author && !isAdmin) {
            // 작성자나 관리자가 아니면 삭제할 수 없게 설정
            return {
                statusCode: 403,
                body: JSON.stringify({ message: "이 게시글을 삭제할 권한이 없습니다." }),
            };
        }

        // 해당 게시글에 연결된 댓글 삭제
        const getCommentsParams = {
            TableName: "Comments", // 댓글 테이블
            IndexName: "PostIdIndex", // 게시글 ID로 댓글을 조회하기 위한 인덱스 (PostIdIndex는 미리 만들어두어야 함)
            KeyConditionExpression: "postId = :postId",
            ExpressionAttributeValues: {
                ":postId": postId,
            },
        };

        const commentsResult = await dynamoDB.query(getCommentsParams).promise();
        const comments = commentsResult.Items || [];

        // 댓글 삭제: axios로 deleteComment 호출
        for (let comment of comments) {
            const deleteCommentParams = {
                method: 'delete',
                url: 'https://your-api-endpoint/deleteComment',  // 실제 deleteComment API 주소로 변경
                headers: {
                    Authorization: `Bearer ${token}`,  // Authorization 헤더
                },
                data: {
                    commentId: comment.commentId,  // 삭제할 댓글의 commentId
                }
            };

            // axios로 댓글 삭제 호출
            await axios(deleteCommentParams)
                .then(response => {
                    console.log('댓글 삭제 성공:', response.data.message);
                })
                .catch(error => {
                    console.error('댓글 삭제 실패:', error.message);
                });
        }

        // 해당 게시글에 연결된 좋아요 삭제
        const getLikesParams = {
            TableName: "PostLikes", // 좋아요 테이블
            IndexName: "PostIdIndex", // 게시글 ID로 좋아요를 조회하기 위한 인덱스
            KeyConditionExpression: "postId = :postId",
            ExpressionAttributeValues: {
                ":postId": postId,
            },
        };

        const likesResult = await dynamoDB.query(getLikesParams).promise();
        const likes = likesResult.Items || [];

        // 좋아요 삭제
        for (let like of likes) {
            const deleteLikeParams = {
                TableName: "PostLikes",
                Key: {
                    userId: like.userId, // 좋아요를 누른 사용자의 ID로 삭제
                    postId: postId, // 게시글 ID로 삭제
                },
            };

            await dynamoDB.delete(deleteLikeParams).promise();
        }

        // 게시글 삭제
        const deletePostParams = {
            TableName: "Posts",
            Key: {
                postId: postId,
            },
        };

        await dynamoDB.delete(deletePostParams).promise();

        // 성공적으로 삭제되었을 경우
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "게시글과 관련된 댓글, 좋아요가 모두 삭제되었습니다.",
            }),
        };
    } catch (error) {
        console.error("게시글 삭제 중 오류 발생:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "게시글 삭제 중 오류 발생", error: error.message }),
        };
    }
};
