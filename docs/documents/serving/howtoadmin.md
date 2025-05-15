## ⚙️ ALPACO 플랫폼 - 운영 매뉴얼 ⚙️

---

**목차:**

1.  [소개](#1-소개)
    *   [1.1. 이 매뉴얼의 목적](#11-이-매뉴얼의-목적)
    *   [1.2. 시스템 개요](#12-시스템-개요)
2.  [운영자를 위한 사전 준비 사항](#2-운영자를-위한-사전-준비-사항)
3.  [AWS 관리 콘솔 접근](#3-aws-관리-콘솔-접근)
4.  [핵심 운영 작업](#4-핵심-운영-작업)
    *   [4.1. 시스템 상태 및 로그 모니터링 (CloudWatch)](#41-시스템-상태-및-로그-모니터링-cloudwatch)
    *   [4.2. 데이터 관리 (DynamoDB)](#42-데이터-관리-dynamodb)
        *   [4.2.1. 문제 데이터 관리](#421-문제-데이터-관리)
        *   [4.2.2. 커뮤니티 데이터 관리 (게시물 및 댓글)](#422-커뮤니티-데이터-관리-게시물-및-댓글)
        *   [4.2.3. 제출 데이터 관리](#423-제출-데이터-관리)
        *   [4.2.4. Terraform 상태 잠금 테이블 관리 (참고용)](#424-terraform-상태-잠금-테이블-관리-참고용)
    *   [4.3. 사용자 관리 (Amazon Cognito)](#43-사용자-관리-amazon-cognito)
    *   [4.4. 애플리케이션 접근 및 도메인 관리](#44-애플리케이션-접근-및-도메인-관리)
        *   [4.4.1. DNS 관리 (Route 53)](#441-dns-관리-route-53)
        *   [4.4.2. SSL/TLS 인증서 관리 (ACM)](#442-ssltls-인증서-관리-acm)
        *   [4.4.3. 콘텐츠 전송 네트워크 (CloudFront)](#443-콘텐츠-전송-네트워크-cloudfront)
    *   [4.5. 프론트엔드 애플리케이션 호스팅 (S3)](#45-프론트엔드-애플리케이션-호스팅-s3)
5.  [일반적인 문제 해결](#5-일반적인-문제-해결)
6.  [운영자를 위한 보안 모범 사례](#6-운영자를-위한-보안-모범-사례)
7.  [연락처 및 지원](#7-연락처-및-지원)

---

### 1. 소개

#### 1.1. 이 매뉴얼의 목적

이 매뉴얼은 ALPACO 플랫폼의 관리자 및 운영자를 위한 운영 지침을 제공합니다. AWS 관리 콘솔을 사용하여 모니터링, 데이터 관리, 사용자 관리 및 기본 문제 해결과 관련된 일반적인 작업을 다룹니다.

#### 1.2. 시스템 개요

ALPACO는 AI 기반 알고리즘 학습 환경을 제공하도록 설계된 클라우드 네이티브 서버리스 애플리케이션입니다. 다음과 같은 AWS 서비스를 광범위하게 활용합니다:

*   **컴퓨팅:** AWS Lambda - 백엔드 마이크로서비스(문제 생성, 코드 실행, 커뮤니티 API, 챗봇 등) 실행.
*   **API 계층:** Amazon API Gateway 및 Lambda 함수 URL (CloudFront 연동) - 서비스 노출.
*   **데이터베이스:** Amazon DynamoDB - 문제 데이터, 사용자 제출물, 커뮤니티 콘텐츠 저장.
*   **인증:** Amazon Cognito - 사용자 가입, 로그인 및 관리.
*   **스토리지 및 호스팅:** Amazon S3 - 프론트엔드 정적 자산 호스팅 및 Terraform 상태 저장.
*   **네트워킹 및 콘텐츠 전송:** Amazon CloudFront - CDN, SSL/TLS 종료, Lambda 함수 URL 보안 접근. Amazon Route 53 - DNS 관리.
*   **모니터링:** Amazon CloudWatch - 로그 및 지표 수집.
*   **코드형 인프라 (IaC):** Terraform - 모든 AWS 리소스 정의 및 관리. 배포는 일반적으로 GitHub Actions를 통해 자동화됩니다.

운영자는 주로 모니터링을 위해 CloudWatch, 데이터 검사/수정을 위해 DynamoDB, 사용자 관리를 위해 Cognito, 그리고 때때로 도메인/CDN 관련 작업을 위해 Route 53/CloudFront와 상호 작용합니다.

### 2. 운영자를 위한 사전 준비 사항

*   **AWS 계정 접근 권한:** 관련 AWS 서비스(CloudWatch, DynamoDB, Cognito, S3, CloudFront, Route 53)에 접근할 수 있는 적절한 권한을 가진 IAM 사용자 자격 증명.
*   **AWS 콘솔 이해:** AWS 관리 콘솔 탐색에 대한 기본적인 익숙함.
*   **Terraform 출력 값:** Terraform 배포로부터 얻은 출력 값(예: 특정 S3 버킷 이름, DynamoDB 테이블 이름, CloudFront 배포 ID, Cognito 사용자 풀 ID)에 대한 접근 권한. 이 값들은 일반적으로 각 Terraform 모듈 내의 `output.txt` 파일(예: `infrastructure/app/output.txt`, `infrastructure/backend-setup/output.txt`)에 저장되거나 배포팀으로부터 제공됩니다.

### 3. AWS 관리 콘솔 접근

1.  웹 브라우저를 열고 [https://aws.amazon.com/](https://aws.amazon.com/)으로 이동합니다.
2.  "콘솔에 로그인"을 클릭합니다.
3.  IAM 사용자 자격 증명을 입력합니다.

### 4. 핵심 운영 작업

#### 4.1. 시스템 상태 및 로그 모니터링 (CloudWatch)

CloudWatch는 애플리케이션의 상태, 성능 모니터링 및 문제 해결에 필수적입니다.

*   **로그 접근:**
    1.  AWS 콘솔에서 "CloudWatch"를 검색하여 이동합니다.
    2.  왼쪽 탐색 창에서 "로그 그룹 (Log groups)"을 클릭합니다.
    3.  다양한 서비스에 대한 로그 그룹을 찾을 수 있습니다. 일반적인 패턴은 다음과 같습니다:
        *   **Lambda 함수:** `/aws/lambda/alpaco-<함수-이름>-<환경>`
            *   예시: `/aws/lambda/alpaco-createPost-production` (커뮤니티 API용)
            *   예시: `/aws/lambda/alpaco-problem-generator-v3-production`
            *   예시: `/aws/lambda/alpaco-chatbot-query-production`
            *   예시: `/aws/lambda/alpaco-code-grader-production`
        *   **API Gateway:** `/aws/api-gateway/<API-이름>/<스테이지-이름>` (실행 로깅이 활성화된 경우)
            *   예시: `/aws/api-gateway/alpaco-CommunityAPI-production/production`
        *   **CloudFront:** 접근 로그는 일반적으로 S3 버킷으로 전달되도록 구성됩니다. 필요한 경우 CloudFront 배포 설정에서 S3 버킷 세부 정보를 확인하십시오.
*   **로그 보기:**
    1.  로그 그룹 이름을 클릭합니다.
    2.  그러면 로그 스트림 목록이 표시됩니다 (일반적으로 Lambda 컨테이너 인스턴스 또는 기간당 하나).
    3.  로그 스트림을 클릭하여 로그 이벤트를 봅니다.
    4.  필터 표시줄을 사용하여 특정 오류, 요청 ID 또는 키워드를 검색합니다.
*   **주요 확인 사항:**
    *   오류 메시지, 스택 트레이스.
    *   Lambda 호출 시간, 메모리 사용량.
    *   API Gateway 요청/응답 세부 정보.

#### 4.2. 데이터 관리 (DynamoDB)

ALPACO는 DynamoDB를 사용하여 애플리케이션 데이터를 저장합니다. 운영자는 관리 목적으로 항목을 보거나, 추가, 편집 또는 삭제해야 할 수 있습니다.
**주의:** 프로덕션 데이터의 직접 수정은 극도의 주의를 기울여 수행해야 하며, 가능하다면 애플리케이션 인터페이스를 통해 수행하는 것이 이상적입니다. 변경하기 전에 항상 데이터를 백업하거나 영향을 완전히 이해하십시오.

*   **DynamoDB 테이블 접근:**
    1.  AWS 콘솔에서 "DynamoDB"를 검색하여 이동합니다.
    2.  왼쪽 탐색 창에서 "테이블 (Tables)"을 클릭합니다.
    3.  필터/검색 창을 사용하여 특정 테이블을 찾습니다. 테이블 이름은 `alpaco-<서비스명>-<환경>` 패턴을 따릅니다.

##### 4.2.1. 문제 데이터 관리

*   **테이블 이름:** `alpaco-Problems-v3-production` (또는 유사한 이름, `problem-generator-v3` 모듈의 Terraform 출력 확인).
*   **목적:** AI가 생성한 문제(설명, 테스트 케이스, 솔루션, 난이도 등)를 저장합니다.
*   **기본 키:** `problemId` (문자열)
*   **일반적인 작업:**
    *   **문제 보기:**
        1.  테이블을 선택합니다.
        2.  "테이블 항목 탐색 (Explore table items)" 탭을 클릭합니다.
        3.  "스캔 (Scan)" 또는 "쿼리 (Query)" 옵션을 사용합니다. 특정 문제의 경우 `problemId`를 파티션 키로 사용하여 "쿼리"합니다.
    *   **문제 편집:**
        1.  위와 같이 항목을 찾습니다.
        2.  항목을 선택합니다.
        3.  "작업 (Actions)" -> "항목 편집 (Edit item)"을 클릭합니다.
        4.  JSON 또는 양식 보기에서 속성을 수정합니다. 주요 속성: `title`, `description`, `difficulty`, `finalTestCases` (JSON 문자열), `validatedSolutionCode`, `startCode`, `constraints` (JSON 문자열).
    *   **문제 삭제:**
        1.  항목을 찾습니다.
        2.  항목을 선택합니다.
        3.  "작업 (Actions)" -> "항목 삭제 (Delete item)"를 클릭하고 삭제를 확인합니다.
    *   **문제 추가 (수동 - AI 생성 콘텐츠에는 권장되지 않음):**
        1.  "항목 생성 (Create item)"을 클릭합니다.
        2.  `documents/services/gen-problem.md`의 `ProblemDetailAPI` 스키마에 따라 모든 필수 속성을 수동으로 입력합니다. 이는 복잡하고 오류가 발생하기 쉽습니다.
*   **유용한 GSI (쿼리용):**
    *   `CompletedProblemsByCreatedAtGSI`: (PK: `generationStatus`, SK: `createdAt`) - "completed" 상태의 모든 문제를 생성 시간순으로 찾습니다.
    *   `CreatorIdCreatedAtGSI`: (PK: `creatorId`, SK: `createdAt`) - 특정 생성자가 만든 문제를 찾습니다.

##### 4.2.2. 커뮤니티 데이터 관리 (게시물 및 댓글)

*   **테이블 이름:** `alpaco-Community-production` (또는 유사한 이름, `api` 모듈의 Terraform 출력 확인).
*   **목적:** 커뮤니티 게시물, 댓글, 좋아요를 저장합니다.
*   **기본 키:** `PK` (문자열 - `postId`), `SK` (문자열 - 게시물의 경우 `"POST"`, 댓글의 경우 `"COMMENT#{commentId}"`).
*   **일반적인 작업:**
    *   **게시물/댓글 보기:**
        1.  테이블을 선택하고 "테이블 항목 탐색 (Explore table items)"으로 이동합니다.
        2.  모든 게시물을 보려면: `GSI1PK = "POST"`로 `postOnlyIndex` GSI를 쿼리합니다.
        3.  특정 게시물과 해당 댓글을 보려면: `PK = "<postId>"`로 기본 테이블을 쿼리합니다.
    *   **게시물/댓글 편집:**
        1.  항목을 찾습니다.
        2.  선택 후 "작업 (Actions)" -> "항목 편집 (Edit item)"을 클릭합니다.
        3.  `title`, `content` 등을 수정합니다. 소유권을 위해 `userId`와 `author`를 기억하십시오.
    *   **게시물/댓글 삭제:**
        1.  항목을 찾습니다.
        2.  선택 후 "작업 (Actions)" -> "항목 삭제 (Delete item)"를 클릭합니다.
        3.  **참고:** API를 통해 게시물을 삭제하면 관련 댓글도 삭제됩니다. 수동 삭제 시에는 게시물 항목(`SK="POST"`)과 모든 댓글 항목(`SK`가 `COMMENT#`로 시작)을 삭제해야 합니다.
    *   **좋아요 관리:** `likesCount` (숫자) 및 `likedUsers` (문자열 집합 - 사용자 ID) 속성은 게시물 항목에 있습니다.
*   **유용한 GSI:**
    *   `postOnlyIndex`: (PK: `GSI1PK="POST"`, SK: `GSI1SK="createdAt"`) - 모든 게시물 목록 표시용.
    *   `commentSortIndex`: (PK: `PK="postId"`, SK: `createdAt`) - 게시물의 댓글을 생성 시간순으로 정렬하여 목록 표시용.

##### 4.2.3. 제출 데이터 관리

*   **테이블 이름:** `alpaco-Submissions-production` (또는 유사한 이름, `code-execution-service` 모듈의 Terraform 출력 확인).
*   **목적:** 사용자 코드 제출 결과를 저장합니다.
*   **기본 키:** `submissionId` (문자열).
*   **일반적인 작업:**
    *   **제출물 보기:**
        1.  테이블을 선택하고 "테이블 항목 탐색 (Explore table items)"으로 이동합니다.
        2.  모든 제출물을 보려면 (데이터가 클 수 있음): `AllSubmissionsByTimeIndex` GSI (PK: `is_submission`, SK: `submissionTime`)를 쿼리합니다.
        3.  특정 사용자의 제출물을 보려면: `UserIdSubmissionTimeIndex` GSI (PK: `userId`, SK: `submissionTime`)를 쿼리합니다.
        4.  특정 문제의 제출물을 보려면: `ProblemIdSubmissionTimeIndex` GSI (PK: `problemId`, SK: `submissionTime`)를 쿼리합니다.
        5.  특정 제출물을 보려면: `submissionId`로 기본 테이블을 쿼리합니다.
    *   **제출물 편집/삭제:** 잘못된 데이터를 수정하는 경우를 제외하고는 일반적으로 권장되지 않습니다. 표준 DynamoDB 항목 편집/삭제 절차를 따릅니다. 주요 속성: `status`, `userCode`, `results` (테스트 케이스 결과 배열).
*   **유용한 GSI (`documents/services/submission.md` 기반 쿼리용):**
    *   `ProblemIdSubmissionTimeIndex`
    *   `UserIdSubmissionTimeIndex`
    *   `AllSubmissionsByTimeIndex`
    *   `AuthorSubmissionTimeIndex`
    *   `ProblemTitleSubmissionTimeIndex`
    *   `ProblemTitleTranslatedSubmissionTimeIndex`

##### 4.2.4. Terraform 상태 잠금 테이블 관리 (참고용)

*   **테이블 이름:** `alpaco-tfstate-lock-table` (`backend-setup` 출력값).
*   **목적:** Terraform이 인프라 상태에 대한 동시 수정을 방지하기 위해 사용합니다.
*   **운영자 작업:** **일반적으로 이 테이블을 수동으로 수정하지 마십시오.** 오래된 잠금으로 인해 Terraform 실행이 중단된 경우 수동으로 잠금을 제거해야 할 수 있지만, 이는 Terraform의 잠금 메커니즘(`terraform force-unlock`)을 이해하고 극도의 주의를 기울여 수행해야 합니다. 개발/DevOps 팀과 상의하십시오.

#### 4.3. 사용자 관리 (Amazon Cognito)

Cognito는 사용자 ID, 인증(Google 연동), 사용자 그룹을 관리합니다.

*   **Cognito 사용자 풀 접근:**
    1.  AWS 콘솔에서 "Cognito"를 검색하여 이동합니다.
    2.  "사용자 풀 (User pools)"을 클릭합니다.
    3.  사용자 풀(일반적으로 `alpaco-user-pool-production` 또는 유사한 이름, `cognito` 모듈 출력 확인)을 선택합니다.
*   **일반적인 작업:**
    *   **사용자 보기:** "사용자 (Users)" 탭으로 이동합니다. 사용자를 검색하고 필터링할 수 있습니다.
    *   **사용자 세부 정보 보기:** `사용자 이름` (이메일이 아닌 Google의 `sub`)을 클릭합니다. 속성, 그룹 멤버십 등을 볼 수 있습니다.
    *   **사용자 비활성화/활성화:**
        1.  사용자를 찾습니다.
        2.  사용자를 선택합니다.
        3.  "작업 (Actions)" -> "사용자 비활성화 (Disable user)" 또는 "사용자 활성화 (Enable user)"를 클릭합니다.
    *   **그룹 멤버십 관리:**
        1.  사용자를 찾습니다.
        2.  사용자 이름을 클릭합니다.
        3.  사용자 세부 정보 페이지 내의 "그룹 (Groups)" 탭으로 이동합니다.
        4.  "사용자를 그룹에 추가 (Add user to group)"를 클릭합니다. 그룹(예: `alpaco-Admins-production`)을 선택하고 추가합니다. `alpaco-GeneralUsers-production` 그룹은 일반적으로 Lambda 트리거를 통해 가입 시 자동으로 할당됩니다.
    *   **호스팅된 UI/도메인:** Cognito 사용자 풀 도메인(예: `alpaco-auth-prod.auth.ap-northeast-2.amazoncognito.com`)이 구성되어 있습니다. 이는 애플리케이션이 Google 로그인 흐름을 시작하는 데 사용됩니다.
    *   **자격 증명 공급자 (Identity Providers):** "로그인 환경 (Sign-in experience)" -> "연동 자격 증명 공급자 로그인 (Federated identity provider sign-in)"에서 Google이 구성된 것을 볼 수 있습니다. 클라이언트 ID 및 시크릿은 Terraform을 통해 관리됩니다.
    *   **앱 클라이언트:** "앱 통합 (App integration)" -> "앱 클라이언트 및 분석 (App clients and analytics)"에서 앱 클라이언트(예: `alpaco-app-client-production`)를 찾습니다. 콜백 URL, OAuth 범위 등을 보여줍니다.

#### 4.4. 애플리케이션 접근 및 도메인 관리

이는 Route 53 (DNS), ACM (SSL/TLS 인증서), CloudFront (CDN)를 포함합니다. ALPACO의 기본 도메인은 `alpaco.us`입니다.

##### 4.4.1. DNS 관리 (Route 53)

*   **호스팅 영역 접근:**
    1.  AWS 콘솔에서 "Route 53"을 검색하여 이동합니다.
    2.  왼쪽 탐색 창에서 "호스팅 영역 (Hosted zones)"을 클릭합니다.
    3.  `alpaco.us`에 대한 호스팅 영역을 선택합니다.
*   **주요 레코드:**
    *   프론트엔드 애플리케이션용 CloudFront 배포를 가리키는 `alpaco.us` 및 `www.alpaco.us`에 대한 `A` 레코드.
    *   ACM 인증서 유효성 검사용 `CNAME` 레코드 (일반적으로 Terraform에서 관리).
    *   `auth.alpaco.us` 하위 도메인도 ACM 인증서의 일부이며, 사용자 지정 도인이 Cognito 도메인에 매핑된 경우 사용될 수 있습니다 (현재 Cognito는 자체 AWS 도메인 사용).
*   **운영자 작업:** 일반적으로 DNS 레코드는 Terraform에서 관리합니다. 수동 변경은 드물지만 문제 해결이나 외부 서비스 도메인 확인에 필요할 수 있습니다.

##### 4.4.2. SSL/TLS 인증서 관리 (ACM)

*   **인증서 접근:**
    1.  AWS 콘솔에서 "Certificate Manager (ACM)"를 검색하여 이동합니다.
    2.  **중요:** CloudFront와 함께 사용되는 인증서의 경우, 다른 리소스가 배포된 위치와 관계없이 **반드시 미국 동부 (버지니아 북부) `us-east-1`** 리전에 있어야 합니다.
    3.  `alpaco.us` (및 `www.alpaco.us`, `auth.alpaco.us`)에 대한 인증서를 찾습니다.
*   **주요 정보:**
    *   **상태 (Status):** "발급됨 (Issued)"이어야 합니다.
    *   **사용 중? (In use?):** CloudFront 배포와 연결된 경우 "예 (Yes)"로 표시되어야 합니다.
    *   **갱신 (Renewal):** ACM은 유효성 검사를 위해 생성된 CNAME 레코드가 Route 53에 남아 있는 한 DNS 유효성 검사 인증서의 자동 갱신을 처리합니다.
*   **운영자 작업:** 대부분 모니터링입니다. 갱신에 실패하면 종종 Route 53의 DNS 유효성 검사 레코드 문제 때문입니다.

##### 4.4.3. 콘텐츠 전송 네트워크 (CloudFront)

CloudFront는 프론트엔드 애플리케이션을 제공하고 백엔드 Lambda 함수 URL(챗봇 및 문제 생성기용)에 대한 보안 액세스를 제공합니다.

*   **배포 접근:**
    1.  AWS 콘솔에서 "CloudFront"를 검색하여 이동합니다.
    2.  여러 배포를 찾을 수 있습니다:
        *   **프론트엔드 앱:** `alpaco-frontend-production-alpaco-frontend-bucket`의 배포와 유사한 이름 (ID 예: `E3Q5IEHTZGF1U5`는 `app` 모듈 출력 확인). 도메인은 `d2rgzjzynamwq2.cloudfront.net`과 유사하며 `alpaco.us`로 별칭 지정됩니다.
        *   **챗봇 서비스:** 해당 CloudFront 도메인은 `chatbot` 모듈 출력 확인.
        *   **문제 생성기 서비스:** 해당 CloudFront 도메인은 `problem-generator-v3` 모듈 출력 확인.
*   **주요 설정 확인 (프론트엔드 배포용):**
    *   **원본 (Origins):** 프론트엔드 자산용 S3 버킷 (OAC 구성됨).
    *   **동작 (Behaviors):** 기본 동작은 S3 원본을 가리킵니다. `뷰어 프로토콜 정책 (Viewer Protocol Policy)` (redirect-to-HTTPS여야 함), `허용된 HTTP 메서드 (Allowed HTTP Methods)`를 확인합니다. 뷰어 요청에 연결된 `url_rewrite_function` CloudFront 함수에 유의하십시오.
    *   **사용자 지정 오류 응답 (Custom Error Responses):** 403/404 오류에 대해 `/index.html`을 200 상태로 반환하도록 구성되어 Next.js 클라이언트 측 라우팅을 지원합니다.
    *   **보안 (Security) -> 원본 액세스 (Origin access):** OAC 구성.
    *   **일반 (General) -> 별칭 (Aliases):** `alpaco.us`, `www.alpaco.us`.
    *   **일반 (General) -> SSL 인증서 (SSL Certificate):** 사용자 지정 SSL 인증서 (ACM `us-east-1`에서 발급).
*   **캐시 무효화 (프론트엔드 업데이트 시 중요):**
    *   S3를 통해 배포된 프론트엔드 업데이트(일반적으로 GitHub Actions에 의해)는 사용자가 변경 사항을 즉시 보려면 CloudFront 캐시 무효화가 필요합니다.
    *   **수동 무효화 방법:**
        1.  프론트엔드 CloudFront 배포를 선택합니다.
        2.  "무효화 (Invalidations)" 탭으로 이동합니다.
        3.  "무효화 생성 (Create invalidation)"을 클릭합니다.
        4.  전체 사이트 업데이트의 경우 객체 경로로 `/*`를 입력합니다.
        5.  "무효화 생성 (Create invalidation)"을 클릭합니다. 이 프로세스는 몇 분 정도 걸릴 수 있습니다.
    *   GitHub Actions 워크플로 (`.github/workflows/deploy.yml`)는 프론트엔드 배포 시 이를 자동으로 처리해야 합니다.

#### 4.5. 프론트엔드 애플리케이션 호스팅 (S3)

Next.js 프론트엔드는 정적으로 내보내져 S3 버킷에 호스팅됩니다.

*   **S3 버킷 접근:**
    1.  AWS 콘솔에서 "S3"를 검색하여 이동합니다.
    2.  `alpaco-frontend-production-alpaco-frontend-bucket` (또는 유사한 이름, `app` 모듈 출력)이라는 이름의 버킷을 찾습니다.
*   **운영자를 위한 주요 사항:**
    *   **직접 퍼블릭 액세스 차단됨:** 버킷은 `block_public_acls = true` 등으로 구성됩니다. 콘텐츠는 Origin Access Control (OAC)을 사용하여 CloudFront를 *통해서만* 제공됩니다.
    *   **콘텐츠:** `frontend` 디렉터리의 `npm run build` 출력(HTML, CSS, JS, 이미지)을 포함합니다.
    *   **관리:** 콘텐츠 업데이트는 주로 CI/CD 파이프라인(GitHub Actions)에서 처리합니다. 긴급 수정 외에는 수동 업로드가 일반적으로 필요하지 않으며, 그 경우에도 CloudFront 무효화가 필요합니다.

### 5. 일반적인 문제 해결

*   **애플리케이션 로드 안 됨 / 오류 발생:**
    1.  **CloudWatch 로그 확인:** 관련 서비스의 Lambda 함수 로그부터 확인합니다 (예: 커뮤니티 페이지 실패 시 `alpaco-getAllPosts-production` 및 `alpaco-getPost-production` 확인). 활성화된 경우 API Gateway 로그도 확인합니다.
    2.  **브라우저 개발자 콘솔:** JavaScript 오류, 네트워크 요청 실패(4xx, 5xx 오류), CORS 문제를 찾습니다.
    3.  **AWS 서비스 상태 대시보드:** `ap-northeast-2` 리전에 진행 중인 AWS 장애가 있는지 확인합니다.
*   **데이터가 올바르게 표시되지 않음:**
    1.  **DynamoDB에서 확인:** 관련 DynamoDB 테이블을 직접 확인하여 데이터가 존재하고 올바르게 포맷되었는지 확인합니다.
    2.  **Lambda 로그 확인:** 해당 데이터를 가져오거나 쓰는 Lambda 함수에 오류가 있을 수 있습니다.
*   **로그인 문제:**
    1.  **Cognito 사용자 풀 확인:** 사용자가 확인되었습니까? 올바른 그룹에 속해 있습니까?
    2.  **Cognito 앱 클라이언트 설정 확인:** 콜백 URL, 활성화된 ID 공급자.
    3.  **브라우저 개발자 콘솔:** OAuth 흐름 또는 토큰 획득과 관련된 오류를 찾습니다.
*   **도메인/SSL 문제 (`alpaco.us`):**
    1.  **Route 53:** `alpaco.us` 및 `www.alpaco.us`에 대한 DNS 레코드가 CloudFront 배포를 올바르게 가리키는지 확인합니다.
    2.  **ACM (`us-east-1` 리전):** SSL 인증서가 "발급됨 (Issued)" 상태이고 만료되지 않았는지 확인합니다. 문제가 발생하면 DNS 유효성 검사 상태를 확인합니다.
    3.  **CloudFront 배포:** "배포됨 (Deployed)" 상태이고 별칭 및 ACM 인증서가 올바르게 구성되었는지 확인합니다.
*   **느린 성능:**
    1.  **CloudWatch 지표:** Lambda 실행 시간, API Gateway 지연 시간을 확인합니다.
    2.  **DynamoDB 용량/스로틀링:** 프로비저닝된 용량을 사용하는 경우(ALPACO는 요청당 지불(PAY_PER_REQUEST)을 사용하므로 프로비저닝된 용량 문제는 덜 발생하지만, 요청이 많을 경우 여전히 스로틀링 확인). GSI 효율성을 확인합니다.
    3.  **CloudFront 캐싱:** 정적 자산에 대해 캐싱이 적절하게 구성되었는지 확인합니다. 이 설정에서 Lambda의 동적 콘텐츠는 일반적으로 CloudFront에 의해 캐시되지 않습니다.

### 6. 운영자를 위한 보안 모범 사례

*   **최소 권한:** IAM 사용자가 운영 작업에 필요한 권한만 갖도록 합니다. 루트 계정 사용을 피합니다.
*   **MFA:** IAM 사용자에 대해 다중 인증(Multi-Factor Authentication)을 활성화합니다.
*   **자격 증명:** AWS 자격 증명을 공유하지 마십시오. 보안 시스템 외부에서 접근 가능한 코드나 구성 파일에 자격 증명을 포함시키지 마십시오.
*   **비밀 관리:** 애플리케이션 비밀(예: `GOOGLE_AI_API_KEY`, `GOOGLE_CLIENT_SECRET`)은 Terraform에서 관리합니다 (변수로 전달되며, GitHub Secrets 또는 더 고급 설정에서는 HashiCorp Vault에서 가져올 수 있음). 운영자는 배포 후 Terraform을 재구성하지 않는 한 일반적으로 이러한 비밀을 직접 처리할 필요가 없습니다.
*   **IAM 권한 정기 검토:** 누가 어떤 접근 권한을 가지고 있는지 주기적으로 검토합니다.
*   **CloudTrail 모니터링:** AWS CloudTrail은 계정의 API 활동을 기록합니다. 의심스러운 활동이 있는지 검토합니다.

### 7. 연락처 및 지원

*   **내부 개발팀(팀 우서용):** 애플리케이션 관련 문제 문의.
*   **AWS 지원:** AWS 서비스 장애 관련 문제 문의.

---

이 매뉴얼은 시작점을 제공합니다. 특정 운영 절차는 변경될 수 있습니다. 복잡한 문제의 경우 항상 최신 프로젝트 문서를 참조하고 개발팀과 상의하십시오.
