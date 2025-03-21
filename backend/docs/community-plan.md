### 커뮤니티 기능 정리 및 활용 AWS 서비스 정리

| **기능** | **HTTP Method** | **Endpoint** | **설명** | **사용 AWS 서비스** |
| --- | --- | --- | --- | --- |
| **게시글 생성** | `POST` | `/community` | 새 게시글 작성 | API Gateway, Lambda, DynamoDB |
| **게시글 조회** | `GET` | `/community/{postId}` | 특정 게시글 조회 | API Gateway, Lambda, DynamoDB |
| **모든 게시글 조회** | `GET` | `/community` | 전체 게시글 조회 | API Gateway, Lambda, DynamoDB |
| **게시글 좋아요** | `PUT` | `/community/{postId}/like` | 게시글 좋아요 수 증가 | API Gateway, Lambda, DynamoDB |
| **게시글 수정** | `PUT` | `/community/{postId}` | 게시글 내용 수정 | API Gateway, Lambda, DynamoDB |
| **게시글 삭제** | `DELETE` | `/community/{postId}` | 특정 게시글 삭제 | API Gateway, Lambda, DynamoDB |
| **댓글 작성** | `POST` | `/community/{postId}/comments` | 특정 게시글에 댓글 작성 | API Gateway, Lambda, DynamoDB |
| **댓글 조회** | `GET` | `/community/{postId}/comments` | 특정 게시글의 모든 댓글 조회 | API Gateway, Lambda, DynamoDB |
| **댓글 삭제** | `DELETE` | `/community/{postId}/comments/{commentId}` | 특정 댓글 삭제 | API Gateway, Lambda, DynamoDB |

### **Lambda 함수 기능 정리 및 예제 코드**

### `createPost.js` (게시글 생성)

- **설명**: 새로운 게시글을 생성하고 DynamoDB에 저장
- **HTTP 요청**: `POST /community`
- **예제 코드**:

```jsx
const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require("uuid");

exports.handler = async (event) => {
    const body = JSON.parse(event.body);
    const postId = uuidv4();
    const params = {
        TableName: "CommunityPosts",
        Item: {
            postId: postId,
            title: body.title,
            content: body.content,
            author: body.author,
            createdAt: new Date().toISOString(),
            likes: 0,
        },
    };

    await dynamoDB.put(params).promise();
    return {
        statusCode: 201,
        body: JSON.stringify({ message: "게시글 생성 완료", postId }),
    };
};
```

### `getPost.js` (특정 게시글 조회)

- **설명**: `postId`로 특정 게시글을 조회
- **HTTP 요청**: `GET /community/{postId}`
- **예제 코드**:

```jsx
exports.handler = async (event) => {
    const postId = event.pathParameters.postId;
    const params = {
        TableName: "CommunityPosts",
        Key: { postId },
    };

    const result = await dynamoDB.get(params).promise();
    if (!result.Item) {
        return { statusCode: 404, body: JSON.stringify({ message: "게시글 없음" }) };
    }
    return { statusCode: 200, body: JSON.stringify(result.Item) };
};
```

### `getAllPosts.js` (게시글 목록 조회)

- **설명**: 전체 게시글 목록을 반환
- **HTTP 요청**: `GET /community`
- **예제 코드**:

```jsx
exports.handler = async () => {
    const params = {
        TableName: "CommunityPosts",
    };

    const result = await dynamoDB.scan(params).promise();
    return { statusCode: 200, body: JSON.stringify(result.Items) };
};
```

### `likePost.js` (게시글 좋아요 추가)

- **설명**: 특정 게시글의 좋아요 수 증가
- **HTTP 요청**: `PUT /community/{postId}/like`
- **예제 코드**:

```jsx
exports.handler = async (event) => {
    const postId = event.pathParameters.postId;
    const params = {
        TableName: "CommunityPosts",
        Key: { postId },
        UpdateExpression: "SET likes = if_not_exists(likes, :zero) + :inc",
        ExpressionAttributeValues: { ":inc": 1, ":zero": 0 },
        ReturnValues: "UPDATED_NEW",
    };

    const result = await dynamoDB.update(params).promise();
    return { statusCode: 200, body: JSON.stringify({ likes: result.Attributes.likes }) };
};
```

### `updatePost.js` (게시글 수정)

- **설명**: 게시글 내용 수정
- **HTTP 요청**: `PUT /community/{postId}`
- **예제 코드**:

```jsx
exports.handler = async (event) => {
    const postId = event.pathParameters.postId;
    const body = JSON.parse(event.body);
    const params = {
        TableName: "CommunityPosts",
        Key: { postId },
        UpdateExpression: "SET title = :title, content = :content",
        ExpressionAttributeValues: { ":title": body.title, ":content": body.content },
        ReturnValues: "UPDATED_NEW",
    };

    await dynamoDB.update(params).promise();
    return { statusCode: 200, body: JSON.stringify({ message: "게시글 수정 완료" }) };
};
```

### `deletePost.js` (게시글 삭제)

- **설명**: 특정 게시글 삭제
- **HTTP 요청**: `DELETE /community/{postId}`
- **예제 코드**:

```jsx
exports.handler = async (event) => {
    const postId = event.pathParameters.postId;
    const params = {
        TableName: "CommunityPosts",
        Key: { postId },
    };

    await dynamoDB.delete(params).promise();
    return { statusCode: 200, body: JSON.stringify({ message: "게시글 삭제 완료" }) };
};
```

---

### `createComment.js` (댓글 생성)

- **설명**: 특정 게시글에 댓글 추가
- **HTTP 요청**: `POST /community/{postId}/comments`
- **예제 코드**:

```jsx
exports.handler = async (event) => {
    const postId = event.pathParameters.postId;
    const body = JSON.parse(event.body);
    const commentId = uuidv4();
    const params = {
        TableName: "CommunityComments",
        Item: {
            commentId: commentId,
            postId: postId,
            content: body.content,
            author: body.author,
            createdAt: new Date().toISOString(),
        },
    };

    await dynamoDB.put(params).promise();
    return { statusCode: 201, body: JSON.stringify({ message: "댓글 작성 완료", commentId }) };
};
```

### `getComments.js` (댓글 조회)

- **설명**: 특정 게시글에 달린 댓글 리스트 반환
- **HTTP 요청**: `GET /community/{postId}/comments`
- **예제 코드**:

```jsx
exports.handler = async (event) => {
    const postId = event.pathParameters.postId;
    const params = {
        TableName: "CommunityComments",
        IndexName: "PostIdIndex",
        KeyConditionExpression: "postId = :postId",
        ExpressionAttributeValues: { ":postId": postId },
    };

    const result = await dynamoDB.query(params).promise();
    return { statusCode: 200, body: JSON.stringify(result.Items) };
};
```

### `deleteComment.js` (댓글 삭제)

- **설명**: 특정 댓글 삭제
- **HTTP 요청**: `DELETE /community/{postId}/comments/{commentId}`
- **예제 코드**:

```jsx
exports.handler = async (event) => {
    const commentId = event.pathParameters.commentId;
    const params = {
        TableName: "CommunityComments",
        Key: { commentId },
    };

    await dynamoDB.delete(params).promise();
    return { statusCode: 200, body: JSON.stringify({ message: "댓글 삭제 완료" }) };
};
```

### API 설계

| Method | Endpoint | 설명 |
| --- | --- | --- |
| **POST** | `/community` | 새 게시글 작성 |
| **GET** | `/community/{postId}` | 특정 게시글 조회 |
| **GET** | `/community` | 모든 게시글 조회 (페이지네이션 가능) |
| **PUT** | `/community/{postId}/like` | 게시글 좋아요 증가 |
| **PUT** | `/community/{postId}` | 게시글 수정 |
| **DELETE** | `/community/{postId}` | 게시글 삭제 |

| Method | Endpoint | 설명 |
| --- | --- | --- |
| **POST** | `/community/{postId}/comments` | 특정 게시글에 댓글 작성 |
| **GET** | `/community/{postId}/comments` | 특정 게시글의 모든 댓글 조회 |
| **DELETE** | `/community/{postId}/comments/{commentId}` | 특정 댓글 삭제 |

### 흐름 정리

### **POST /community (게시글 생성)**

1. 클라이언트 → `POST /community` 요청 보냄 (`title`, `content`, `authorId` 등 포함)
2. API Gateway → `createPost.js` (Lambda) 호출
3. Lambda → DynamoDB에 게시글 저장
4. 클라이언트에 "게시글 등록 완료" 응답

### **GET /community/{postId} (게시글 조회)**

1. 클라이언트 → `GET /community/123` 요청 보냄
2. API Gateway → `getPost.js` (Lambda) 호출
3. Lambda → DynamoDB에서 `postId: 123` 데이터를 가져옴
4. 클라이언트에 게시글 내용 응답 (`title`, `content`, `authorId` 등)

### **GET /community (게시글 목록 조회)**

1. 클라이언트 → `GET /community` 요청
2. API Gateway → `getAllPosts.js` (Lambda) 호출
3. Lambda → DynamoDB에서 모든 게시글 조회 (페이지네이션 지원 가능)
4. 클라이언트에 게시글 목록 응답

### **PUT /community/{postId}/like (게시글 좋아요 추가)**

1. 클라이언트 → `PUT /community/123/like` 요청
2. API Gateway → `likePost.js` (Lambda) 호출
3. Lambda → DynamoDB에서 해당 postId의 "likeCount" 증가
4. 클라이언트에 "좋아요 반영 완료" 응답

### **PUT /community/{postId} (게시글 수정)**

1. 클라이언트 → `PUT /community/123` 요청 (`title`, `content` 수정 데이터 포함)
2. API Gateway → `updatePost.js` (Lambda) 호출
3. Lambda → DynamoDB에서 postId=123인 게시글 수정
4. 클라이언트에 "게시글 수정 완료" 응답

### **DELETE /community/{postId} (게시글 삭제)**

1. 클라이언트 → `DELETE /community/123` 요청
2. API Gateway → `deletePost.js` (Lambda) 호출
3. Lambda → DynamoDB에서 postId=123 삭제
4. 클라이언트에 "게시글 삭제 완료" 응답

---

### **POST /community/{postId}/comments (댓글 생성)**

1. 클라이언트 → `POST /community/123/comments` 요청 (본문: {"content": "좋은 글이네요!"})
2. API Gateway → `createComment.js` (Lambda) 호출
3. Lambda → DynamoDB에서 postId=123 게시글 존재 여부 확인
4. Lambda → 새로운 commentId를 생성 후, 해당 게시글에 댓글 저장
5. 클라이언트에 "댓글 작성 완료" 응답

### **GET /community/{postId}/comments (댓글 조회)**

1. 클라이언트 → `GET /community/123/comments` 요청
2. API Gateway → `getComments.js` (Lambda) 호출
3. Lambda → DynamoDB에서 postId=123에 속한 모든 댓글 조회
4. 조회된 댓글 리스트를 클라이언트에 응답

### **DELETE /community/{postId}/comments/{commentId} ( 댓글 삭제)**

1. 클라이언트 → `DELETE /community/123/comments/456` 요청
2. API Gateway → `deleteComment.js` (Lambda) 호출
3. Lambda → DynamoDB에서 postId=123 & commentId=456 댓글 검색
4. 해당 댓글 삭제
5. 클라이언트에 "댓글 삭제 완료" 응답

### **API Gateway 예시 코드** (`infrastructure/api-gateway.yml`)

```yaml

Resources:
  CommunityAPI:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: "CommunityAPI"

  CommunityResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref CommunityAPI
      ParentId: !GetAtt CommunityAPI.RootResourceId
      PathPart: "community"

  CommunityPostMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref CommunityAPI
      ResourceId: !Ref CommunityResource
      HttpMethod: "POST"
      AuthorizationType: "NONE"
      Integration:
        Type: AWS_PROXY
        IntegrationHttpMethod: "POST"
        Uri: !Sub "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${CommunityLambda.Arn}/invocations"

  CommunityPostIdResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref CommunityAPI
      ParentId: !Ref CommunityResource
      PathPart: "{postId}"

  CommunityPostIdCommentsResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref CommunityAPI
      ParentId: !Ref CommunityPostIdResource
      PathPart: "comments"

  CreateCommentMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref CommunityAPI
      ResourceId: !Ref CommunityPostIdCommentsResource
      HttpMethod: "POST"
      AuthorizationType: "NONE"
      Integration:
        Type: AWS_PROXY
        IntegrationHttpMethod: "POST"
        Uri: !Sub "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${CreateCommentLambda.Arn}/invocations"

  GetCommentsMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref CommunityAPI
      ResourceId: !Ref CommunityPostIdCommentsResource
      HttpMethod: "GET"
      AuthorizationType: "NONE"
      Integration:
        Type: AWS_PROXY
        IntegrationHttpMethod: "GET"
        Uri: !Sub "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${GetCommentsLambda.Arn}/invocations"

  DeleteCommentResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref CommunityAPI
      ParentId: !Ref CommunityPostIdCommentsResource
      PathPart: "{commentId}"

  DeleteCommentMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref CommunityAPI
      ResourceId: !Ref DeleteCommentResource
      HttpMethod: "DELETE"
      AuthorizationType: "NONE"
      Integration:
        Type: AWS_PROXY
        IntegrationHttpMethod: "DELETE"
        Uri: !Sub "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${DeleteCommentLambda.Arn}/invocations"
```