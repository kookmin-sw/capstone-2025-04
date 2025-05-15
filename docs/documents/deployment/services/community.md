# 📖 ALPACO 커뮤니티 API: 기능 및 기술 가이드

## 1. 개요

ALPACO 커뮤니티 API는 게시물, 댓글, 좋아요 생성 및 관리를 포함한 커뮤니티 기반 기능을 위한 백엔드 서비스를 제공합니다. AWS 서버리스 기술을 기반으로 구축된 견고하고 확장 가능하며 안전한 API를 목표로 합니다. 이 가이드에서는 기능, 기본 기술, 데이터 구조 및 배포 절차를 자세히 설명합니다.

**프로젝트 경로:** `capstone-2025-04`
**API 인프라 경로:** `infrastructure/api`
**Lambda 소스 경로:** `backend/lambdas/community-lambda-functions/`

## 2. 주요 기능

*   **게시물 관리:**
    *   새 게시물 작성 (텍스트 기반, Markdown 지원).
    *   선택적으로 게시물을 특정 프로그래밍 문제와 연결.
    *   모든 게시물 목록 검색 (페이지네이션).
    *   특정 게시물의 상세 정보 검색.
    *   기존 게시물 업데이트 (제목, 내용).
    *   게시물 삭제 (관련 댓글도 함께 삭제).
*   **댓글 관리:**
    *   특정 게시물에 댓글 작성.
    *   게시물의 모든 댓글 검색 (페이지네이션, 생성 날짜 기준 정렬).
    *   댓글 삭제.
*   **좋아요 관리:**
    *   게시물 좋아요/좋아요 취소.
    *   게시물의 좋아요 수 추적.
*   **사용자 인증:**
    *   Amazon Cognito를 사용하여 중요 작업(생성, 업데이트, 삭제, 좋아요) 보안.
    *   읽기 작업(게시물 가져오기, 댓글 가져오기)은 공개 액세스.
*   **데이터 영속성:**
    *   Amazon DynamoDB를 활용하여 게시물과 댓글을 저장하고 효율적인 쿼리 패턴 사용.

## 3. 기술 스택

*   **백엔드 로직:**
    *   **AWS Lambda:** 각 API 작업을 위한 비즈니스 로직을 실행하는 서버리스 함수 (Node.js 20.x 런타임).
    *   **AWS Lambda Layer:** Lambda 함수에서 공통으로 사용하기 위해 공유 Node.js 의존성(예: `uuid`)을 패키징한 레이어.
*   **API 노출:**
    *   **Amazon API Gateway:** Lambda 함수를 HTTP 엔드포인트로 노출하는 RESTful API. 요청 라우팅, 권한 부여, CORS 처리.
*   **데이터베이스:**
    *   **Amazon DynamoDB:** 커뮤니티 데이터(게시물, 댓글) 저장을 위한 NoSQL 데이터베이스. 효율적인 쿼리를 위해 글로벌 보조 인덱스(GSI)로 설계.
*   **인증 및 권한 부여:**
    *   **Amazon Cognito:** 사용자 풀을 통해 사용자 ID를 관리하고 보호된 API 엔드포인트에 JWT 기반 인증 제공.
*   **코드형 인프라 (IaC):**
    *   **Terraform:** 모든 AWS 리소스를 선언적으로 정의하고 프로비저닝.
        *   상태 관리: AWS S3 (Terraform 상태 파일용) 및 DynamoDB (상태 잠금용).
*   **CI/CD:**
    *   **GitHub Actions:** `main` 브랜치에 푸시 시 인프라 및 Lambda 업데이트를 위한 자동화된 워크플로우. 안전한 AWS 인증을 위해 OIDC 활용.
*   **프론트엔드 (연동 지점):**
    *   Next.js 애플리케이션.
    *   프론트엔드 인증 및 Cognito와의 상호작용을 위한 AWS Amplify.
    *   API Gateway로 요청을 보내기 위한 커스텀 API 클라이언트 (`communityApi.ts` - 개념적).

## 4. API 엔드포인트

API는 `/community` 기본 경로 하위에 배포됩니다. 전체 호출 URL은 Terraform 배포의 출력 값입니다 (예: `https://{api_id}.execute-api.{region}.amazonaws.com/{stage}/community`).

| 메서드 | 경로                                        | 인증 필요 | Lambda 함수       | 설명                                           |
| :----- | :------------------------------------------ | :-------- | :-------------------- | :--------------------------------------------- |
| `POST` | `/community`                                | ✅ 예     | `createPost`          | 새 커뮤니티 게시물을 생성합니다.                   |
| `GET`  | `/community`                                | ⬜ 아니요 | `getAllPosts`         | 모든 게시물의 페이지네이션된 목록을 검색합니다.        |
| `GET`  | `/community/{postId}`                       | ⬜ 아니요 | `getPost`             | 특정 게시물의 상세 정보를 검색합니다.                |
| `PATCH`| `/community/{postId}`                       | ✅ 예     | `updatePost`          | 기존 게시물을 업데이트합니다.                      |
| `DELETE`| `/community/{postId}`                       | ✅ 예     | `deletePost`          | 게시물과 관련 댓글을 삭제합니다.                   |
| `POST` | `/community/{postId}/like`                  | ✅ 예     | `likePost`            | 게시물에 좋아요를 누르거나 취소합니다.                |
| `POST` | `/community/{postId}/comments`              | ✅ 예     | `createComment`       | 게시물에 새 댓글을 생성합니다.                     |
| `GET`  | `/community/{postId}/comments`              | ⬜ 아니요 | `getComments`         | 게시물의 페이지네이션된 댓글 목록을 검색합니다.        |
| `DELETE`| `/community/{postId}/comments/{commentId}`  | ✅ 예     | `deleteComment`       | 특정 댓글을 삭제합니다.                          |
| `OPTIONS`| *위의 모든 경로*                          | ⬜ 아니요 | *API Gateway MOCK*    | CORS 사전 요청(preflight request)을 처리합니다. |

**인증:**
"✅ 예"로 표시된 엔드포인트는 Amazon Cognito에서 얻은 JWT ID 토큰을 포함하는 `Authorization` 헤더가 필요합니다. 예: `Authorization: Bearer <your_cognito_id_token>`.

**요청/응답 예시 (게시물 생성):**

*   **요청:** `POST /community`
    ```json
    // 헤더:
    // Content-Type: application/json
    // Authorization: Bearer <token>
    {
      "title": "문제 X에 대한 나의 첫 게시물",
      "content": "제 해결 방법은 이렇습니다...\n\n```python\nprint('hello')\n```",
      "problemId": "optional-problem-uuid", // 선택 사항
      "author": "사용자닉네임" // 사용자 표시 이름
    }
    ```

*   **응답 (201 Created):**
    ```json
    {
      "message": "게시글이 성공적으로 작성되었습니다.",
      "postId": "generated-uuid-for-post",
      "author": "사용자닉네임",
      "title": "문제 X에 대한 나의 첫 게시물",
      "content": "제 해결 방법은 이렇습니다...\n\n```python\nprint('hello')\n```",
      "createdAt": "iso-timestamp",
      "problemId": "optional-problem-uuid" // 또는 null
    }
    ```

## 5. 데이터 모델 (DynamoDB)

단일 DynamoDB 테이블(기본값: `alpaco-Community-production`)에 모든 커뮤니티 데이터가 저장됩니다.

*   **테이블 이름:** `${var.project_name}-Community-${var.environment}`
*   **기본 키:**
    *   `PK`: 파티션 키
    *   `SK`: 정렬 키
*   **속성 (핵심):**
    *   `PK` (문자열): 게시물 항목과 댓글 항목 모두에 대해 `postId`.
    *   `SK` (문자열):
        *   게시물 항목: `"POST"`
        *   댓글 항목: `"COMMENT#{commentId}"`
    *   `userId` (문자열): 작성자/댓글 작성자의 Cognito 사용자 ID.
    *   `author` (문자열): 작성자/댓글 작성자의 표시 이름.
    *   `title` (문자열): 게시물 제목 (게시물 항목에만 해당).
    *   `content` (문자열): 게시물 또는 댓글 내용 (Markdown).
    *   `createdAt` (문자열): ISO 8601 타임스탬프.
    *   `updatedAt` (문자열): ISO 8601 타임스탬프 (게시물 항목용).
    *   `likesCount` (숫자): 좋아요 수 (게시물 항목용).
    *   `likedUsers` (문자열 집합): 게시물을 좋아한 `userId` 집합 (게시물 항목용).
    *   `commentCount` (숫자): 게시물의 댓글 수 (게시물 항목용).
    *   `problemId` (문자열): 연관된 프로그래밍 문제의 선택적 ID (게시물 항목용).
    *   `commentId` (문자열): 댓글의 고유 ID (댓글 항목용, SK의 일부이기도 함).
*   **글로벌 보조 인덱스 (GSI):**
    1.  `postOnlyIndex`:
        *   목적: 모든 게시물을 생성 시간순으로 효율적으로 나열. `getAllPosts` Lambda에서 사용.
        *   `GSI1PK` (문자열): `"POST"` (모든 게시물 항목에 대한 상수).
        *   `GSI1SK` (문자열): `createdAt` 타임스탬프.
        *   프로젝션: 게시물 목록 보기에 필요한 속성 포함 (`PK`, `title`, `author`, `createdAt`, `likesCount`, `commentCount`, `problemId`, `userId`).
        *   *참고:* `createPost` Lambda는 새 게시물에 대해 `GSI1PK`와 `GSI1SK`를 작성해야 합니다.
    2.  `commentSortIndex`:
        *   목적: 특정 게시물의 모든 댓글을 생성 시간순으로 효율적으로 나열. `getComments` Lambda에서 사용.
        *   `PK` (문자열): `postId` (기본 테이블 PK를 GSI 해시 키로 재사용).
        *   `createdAt` (문자열): 댓글의 `createdAt` 타임스탬프 (기존 속성을 GSI 범위 키로 재사용).
        *   필터: Lambda는 이 GSI를 쿼리할 때 `SK`가 `COMMENT#`로 시작하는지 추가로 필터링합니다.
        *   프로젝션: 댓글 목록 보기에 필요한 속성 포함 (`content`, `author`, `commentId`, `userId`, `SK`).

## 6. Lambda 함수

`backend/lambdas/community-lambda-functions/`에 위치합니다. 모든 함수는 Node.js 20.x 런타임을 사용하고, 공통 IAM 실행 역할을 공유하며, `common-deps` Lambda 레이어를 활용합니다. `COMMUNITY_TABLE_NAME` 환경 변수를 예상합니다. `_modified.mjs` 접미사는 현재 인프라에 맞게 수정된 버전임을 나타냅니다 (예: AWS SDK v3 사용, 특정 DynamoDB 상호작용).

*   **게시물 함수:**
    *   `createPost_modified.mjs`: GSI 키 작성을 포함하여 게시물 생성을 처리합니다.
    *   `deletePost_modified.mjs`: 게시물과 관련된 모든 댓글을 트랜잭션 내에서 삭제합니다. 소유권을 확인합니다.
    *   `getAllPosts_modified.mjs`: `postOnlyIndex`를 사용하여 페이지네이션된 결과로 게시물을 가져옵니다.
    *   `getPost_modified.mjs`: ID로 단일 게시물을 가져옵니다.
    *   `likePost_modified.mjs`: 게시물의 `likedUsers` 집합에 사용자를 추가/제거하고 `likesCount`를 업데이트합니다.
    *   `updatePost_modified.mjs`: 게시물 제목/내용을 업데이트합니다. 소유권을 확인합니다.
*   **댓글 함수:**
    *   `comment/createComment_modified.mjs`: 댓글을 생성하고 부모 게시물의 `commentCount`를 트랜잭션 내에서 증가시킵니다.
    *   `comment/deleteComment_modified.mjs`: 댓글을 삭제하고 부모 게시물의 `commentCount`를 트랜잭션 내에서 감소시킵니다. 소유권을 확인합니다.
    *   `comment/getComments_modified.mjs`: `commentSortIndex`를 사용하여 게시물의 댓글을 페이지네이션하고 정렬하여 가져옵니다.

## 7. 코드형 인프라 (Terraform)

인프라는 `infrastructure/api/`에 위치한 Terraform으로 관리됩니다.

*   **주요 파일:**
    *   `providers.tf`: AWS 프로바이더를 정의합니다.
    *   `backend.tf`: S3 원격 상태 백엔드를 설정합니다 (`key = "api/community/terraform.tfstate"`).
    *   `variables.tf`: 입력 변수 (리전, 프로젝트 이름, 환경)를 정의합니다.
    *   `outputs.tf`: API Gateway 호출 URL과 같은 출력 값을 정의합니다.
    *   `iam.tf`: IAM 역할 (Lambda 실행, API Gateway CloudWatch 로깅) 및 정책 (DynamoDB 접근)을 정의합니다.
    *   `dynamodb.tf`: `Community` DynamoDB 테이블 및 GSI를 정의합니다.
    *   `layer.tf`: `layers/common-deps/nodejs/`의 `common-deps` Lambda 레이어를 정의합니다.
    *   `lambdas.tf`: 모든 `aws_lambda_function` 리소스를 정의하며, `../../backend/lambdas/community-lambda-functions/`에서 소스 코드를 압축합니다.
    *   `apigateway.tf`: API Gateway (REST API, 리소스, 메서드, 통합, Cognito Authorizer, 배포, 스테이지)를 정의합니다.
*   **원격 상태:** `infrastructure/backend-setup` 모듈에서 생성된 S3 버킷(`alpaco-tfstate-bucket-kmu`)과 DynamoDB 테이블(`alpaco-tfstate-lock-table`)을 사용합니다.
*   **Cognito 의존성:** `cognito/terraform.tfstate` 원격 상태에서 Cognito 사용자 풀 ARN을 읽어 API Gateway Authorizer를 설정합니다.
*   **초기화 및 배포:**
    ```bash
    # infrastructure/api로 이동
    cd infrastructure/api

    # 초기화 (플레이스홀더를 실제 값으로 교체)
    terraform init \
      -backend-config="bucket=<YOUR_TFSTATE_BUCKET_NAME>" \
      -backend-config="key=api/community/terraform.tfstate" \
      -backend-config="region=<YOUR_AWS_REGION>" \
      -backend-config="dynamodb_table=<YOUR_TFSTATE_LOCK_TABLE_NAME>"

    # 변경 계획 검토
    terraform plan

    # 변경 사항 적용
    terraform apply
    ```

## 8. CI/CD (GitHub Actions)

자동화는 `.github/workflows/deploy-api.yml`에 정의된 GitHub Actions 워크플로우에 의해 처리됩니다 (`PLAN.md` 참조).

*   **트리거:** `backend/lambdas/community/**` 또는 `infrastructure/api/**`에 영향을 미치는 `main` 브랜치로의 푸시.
*   **인증:** OpenID Connect (OIDC)를 사용하여 AWS에서 IAM 역할을 안전하게 수임하여 장기 자격 증명을 사용하지 않습니다.
*   **단계:**
    1.  코드 체크아웃.
    2.  Node.js 설정.
    3.  **Lambda 레이어 의존성을 준비하기 위해 `infrastructure/api/layers/common-deps/nodejs/`에서 `npm install` 실행.**
    4.  `secrets.AWS_IAM_ROLE_ARN_API`의 역할 ARN을 사용하여 OIDC를 통해 AWS 자격 증명 설정.
    5.  `infrastructure/api` 디렉토리 내에서 `terraform init` (secrets의 백엔드 설정 사용), `terraform plan`, `terraform apply` 실행.
*   **필수 Secrets:**
    *   `AWS_IAM_ROLE_ARN_API`: GitHub Actions가 수임할 IAM 역할의 ARN.
    *   `AWS_REGION`: 대상 AWS 리전.
    *   `TF_STATE_BUCKET`: Terraform 상태용 S3 버킷.
    *   `TF_STATE_LOCK_TABLE`: Terraform 상태 잠금용 DynamoDB 테이블.

## 9. 프론트엔드 연동

프론트엔드(Next.js 애플리케이션)는 이 API와 상호작용합니다.

*   **API 클라이언트:** API 호출을 캡슐화하기 위해 개념적인 `communityApi.ts`(또는 유사한 서비스 모듈)가 사용됩니다.
*   **엔드포인트 설정:** API Gateway 호출 URL은 일반적으로 환경 변수(예: `NEXT_PUBLIC_API_ENDPOINT`)를 통해 프론트엔드에 제공됩니다.
*   **인증:**
    *   AWS Amplify의 `useAuthenticator` 훅이 사용자 인증 상태를 관리합니다.
    *   Amplify Auth의 `fetchAuthSession`을 사용하여 현재 사용자의 JWT ID 토큰을 검색합니다.
    *   보호된 API 호출(생성, 업데이트, 삭제, 좋아요)의 경우 이 JWT 토큰이 `Authorization` 헤더에 포함됩니다: `Authorization: Bearer <id_token>`.
    *   사용자 속성(예: 페이로드 또는 UI에 사용할 `nickname` 또는 `sub` (userId용))은 `fetchUserAttributes`를 사용하여 가져옵니다.
*   **오류 처리:** 프론트엔드 컴포넌트는 API 오류를 처리하며, 종종 토스트 알림(예: `sonner` 사용)을 표시합니다.
*   **예제 페이지:**
    *   `frontend/src/app/community/page.tsx`: 게시물 목록 표시 및 게시물 상세 정보 표시를 처리합니다.
    *   `frontend/src/app/community/create/page.tsx`: 새 게시물 작성을 위한 폼입니다.
    *   `frontend/src/app/community/edit/page.tsx`: 기존 게시물 수정을 위한 폼입니다.

## 10. CORS 설정

CORS(Cross-Origin Resource Sharing)는 API Gateway에서 처리됩니다.
*   각 리소스 경로에 대해 `OPTIONS` 메서드가 MOCK 통합으로 정의됩니다.
*   이러한 `OPTIONS` 메서드 및 실제 엔드포인트 메서드에는 다음과 같은 응답 헤더가 포함됩니다:
    *   `Access-Control-Allow-Origin: '*'` (프로덕션 환경에서는 특정 프론트엔드 URL)
    *   `Access-Control-Allow-Methods: 'POST,GET,PATCH,DELETE,OPTIONS'` (리소스마다 다름)
    *   `Access-Control-Allow-Headers: 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'`
*   Lambda 함수도 응답에 CORS 헤더를 포함하여 견고성을 높이지만, API Gateway가 기본 처리기입니다.

이 가이드는 ALPACO 커뮤니티 API 시스템에 대한 포괄적인 이해를 제공해야 합니다. 개별 Terraform 파일 및 Lambda 소스 코드는 구체적인 구현 사항을 참조하십시오.
