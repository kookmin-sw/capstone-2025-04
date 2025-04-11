const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const { postId } = event.pathParameters; // 요청 URL에서 postId 추출

        // 본문에서 수정할 데이터 추출
        const body = JSON.parse(event.body);
        const { title, content } = body;

        // title, content가 없으면 에러 반환
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

        const author = claims.username; // JWT에서 추출한 유저 이름

        // 게시글 존재 여부 확인
        const getPostParams = {
            TableName: "Community",
            Key: { 
                PK: postId,
                SK: "POST", 
            },
        };

        const postResult = await dynamoDB.get(getPostParams).promise(); // JSON 응답 객체
        const post = postResult.Item; // DB에서 가져온 게시글 데이터, 변수에 담아서 재사용성을 높임 !!

        if (!post) {
            return {
              statusCode: 404,
              body: JSON.stringify({ message: "게시글을 찾을 수 없습니다." }),
            };
        }

        // 작성자 본인인지 확인
        if (post.author !== author) {
            return {
              statusCode: 403,
              body: JSON.stringify({ message: "게시글을 수정할 권한이 없습니다." }),
            };
        }

        // 게시글 수정
        const updateParams = {
            TableName: "Community",
            Key: { 
                PK: postId,
                SK: "POST", 
            },
            UpdateExpression: "SET title = :title, content = :content, updatedAt = :updatedAt",
            ExpressionAttributeValues: {
              ":title": title,
              ":content": content,
              ":updatedAt": new Date().toISOString(),
            },
            ReturnValues: "ALL_NEW", // 수정 후 전체 데이터 반환
        };

        const updateResult = await dynamoDB.update(updateParams).promise();
        const updatedPost = updateResult.Attributes;

        return {
            statusCode: 200,
            body: JSON.stringify({
              message: "게시글이 성공적으로 수정되었습니다.",
              post: updatedPost,
            }),
        };

    } catch (error) {
        console.error("게시글 수정 중 오류 발생:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "서버 오류가 발생했습니다.", error: error.message }),
        };
    }
};
