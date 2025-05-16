## ALPACO : AI & 클라우드 기반 코딩 테스트 학습 플랫폼

<br/><br/>

<p align="center">
  <img src="assets/logo.png" alt="ALPACO Logo" width="220"/>
</p>

<br/><br/>

---

## 🔗 목차

#### 1️⃣ [💡 프로젝트 소개](#-프로젝트-소개)  

#### 2️⃣ [🚀 주요 기능](#-주요-기능)  

#### 3️⃣ [🎬 소개 영상](#-소개-영상)  

#### 4️⃣ [👋 팀원 소개](#-팀원-소개)  

#### 5️⃣ [🌐 시스템 구조](#-시스템-구조)  

#### 6️⃣ [⚒️ 기술 스택](#️-기술-스택)  

#### 7️⃣ [📖 사용법](#사용법)  

#### 8️⃣ [📂 폴더 구조](#-폴더-구조)  

#### 9️⃣ [📝 참고 자료](#-참고-자료)

---

## 💡 프로젝트 소개

<p align="center">
  <img src="assets/key.png" alt="Why ALPACO?" width="100%"/>
</p>

### 이제 문제는 '고르는' 것이 아니라 '생성하는' 것입니다

- ALPACO는 사용자의 입력에 따라 AI가 문제를 즉석에서 생성하고 풀이 중엔 AI 헬퍼가 상황을 인식해 실시간 도움을 줍니다.
- AWS Lambda 기반으로 필요할 때만 작동하는 서버리스 구조를 채택해 전력 낭비 없이 운영됩니다.
- 문제 생성부터 풀이, 피드백, 기록, 공유까지 알고리즘 학습의 전 과정을 하나의 AI 기반 서버리스 생태계에 담았습니다.

---

## 🚀 주요 기능

### ✏️ 코딩 테스트

- LLM 기반 알고리즘 문제 자동 생성 (주제 + 난이도 입력)
- 웹 기반 코드 에디터에서 문제 풀이
- 자동 채점 시스템을 통해 즉시 채점 결과 확인

### 🤖 AI 헬퍼

- 사용자의 코딩 테스트 상황을 실시간으로 인식
- 힌트 요청 시 문제 맥락에 맞는 설명, 유사 문제, 알고리즘 개념을 자동 추천
- 사용자에게 이해 중심 피드백 ****제공 (예: “이 문제는 DFS를 써야 해요!”)

### 📁 내 저장소

- 사용자가 생성한 문제 목록을 한눈에 확인
- 다시 풀기, 문제 은행화 가능

### 💬 커뮤니티

- 생성된 문제에 대해 사용자들끼리 댓글, 의견 공유
- 문제 퀄리티 개선을 위한 참여형 피드백 시스템

### 📊 채점 현황 보드

- 전체 제출 기록을 문제별 / 사용자별 / 조합별로 필터링
- 최신순 + 페이지네이션 기능
- 추후 사용자 통계 및 랭킹 시스템으로 확장 가능

---

## 🎬 소개 영상

**(예정)**

---

## 👋 팀원 소개

<p align="center">
  <img src="assets/people.png" alt="Team Members" width="80%"/>
</p>

---

## 🌐 시스템 구조

<p align="center">
  <img src="assets/architecture.png" alt="System Architecture" width="90%"/>
</p>

> LLM 기반 문제 생성부터 채점까지의 전체 흐름을 시각화한 다이어그램입니다.

---

## ⚒️ 기술 스택

<p align="center">
  <img src="assets/skills.png" alt="Tech Stack" width="80%"/>
</p>

---

## 📖 사용법 (개발 환경 설정)

이 섹션은 ALPACO 프로젝트의 개발 환경을 설정하는 방법에 대한 간략한 안내입니다. 더 자세한 내용은 각 모듈별 개발 문서를 참고하세요.

### 1. 저장소 복제

```bash
git clone https://github.com/kookmin-sw/capstone-2025-04.git
cd capstone-2025-04
```

### 2. 프론트엔드 (Next.js)

프론트엔드 애플리케이션을 로컬에서 실행하는 방법입니다.
(상세: [🎨 프론트엔드 애플리케이션 가이드](https://kookmin-sw.github.io/capstone-2025-04/documents/deployment/application/))

1. **프론트엔드 디렉토리로 이동:**

    ```bash
    cd frontend
    ```

2. **의존성 설치:**

    ```bash
    npm install
    # 또는 yarn install / pnpm install / bun install
    ```

3. **환경 변수 설정:**
    `.env.local.sample` 파일을 복사하여 `.env.local` 파일을 만들고, 필요한 환경 변수(API 엔드포인트, Cognito 설정 등)를 입력합니다. 이 값들은 백엔드 및 인프라 배포 후 얻을 수 있습니다.

    ```bash
    cp .env.local.sample .env.local
    # .env.local 파일 편집
    ```

4. **개발 서버 실행:**

    ```bash
    npm run dev
    ```

    기본적으로 `http://localhost:3000`에서 애플리케이션이 실행됩니다.

### 3. 백엔드 (AWS Lambda 마이크로서비스)

각 Lambda 함수는 독립적으로 개발되고 테스트될 수 있습니다.
(상세: [🏗️ MSA Lambda 개발 가이드](https://kookmin-sw.github.io/capstone-2025-04/documents/deployment/backendLambda/))

- **Node.js Lambda 함수:**
  - 해당 Lambda 디렉토리 (예: `backend/lambdas/chatbot-query/`)로 이동합니다.
  - `npm install`을 실행하여 의존성을 설치합니다.
  - Lambda 함수별 로컬 테스트 스크립트(있는 경우, 예: `problem-generator-v3/local-test.mjs`) 또는 AWS SAM CLI, Serverless Framework 등을 사용하여 테스트할 수 있습니다.
  - 필요한 환경 변수 (예: API 키, DynamoDB 테이블 이름)는 `.env` 파일 또는 테스트 스크립트를 통해 설정합니다.
- **Python Lambda 함수 (예: `code-executor`):**
  - 해당 Lambda 디렉토리 (예: `backend/lambdas/code-executor/`)로 이동합니다.
  - 필요한 경우 가상 환경을 설정하고 `requirements.txt`에 명시된 의존성을 설치합니다: `pip install -r requirements.txt`.
  - 로컬 테스트는 AWS SAM CLI 등을 사용하거나, 간단한 테스트 스크립트를 작성하여 수행할 수 있습니다.

### 4. 인프라 (Terraform)

AWS 인프라는 Terraform을 사용하여 모듈별로 관리됩니다.
(상세: [🛠️ Terraform 인프라 사용 가이드](https://kookmin-sw.github.io/capstone-2025-04/documents/deployment/InfrastructureAsCode/))

1. **Terraform CLI 설치:** 시스템에 Terraform을 설치합니다.
2. **AWS CLI 설정:** AWS 자격 증명 및 기본 리전을 구성합니다: `aws configure`.
3. **모듈별 배포:**
    - 각 인프라 모듈 디렉토리 (예: `infrastructure/cognito/`)로 이동합니다.
    - **`terraform init` 실행:** Terraform 백엔드 및 프로바이더를 초기화합니다. 백엔드 구성은 `backend.tf` 파일에 정의되어 있거나, `-backend-config` 옵션을 사용하여 명령줄에서 지정할 수 있습니다.

        ```bash
        # 예시 (backend-setup 모듈 제외, 다른 모듈은 원격 S3 백엔드 사용)
        terraform init \
          -backend-config="bucket=alpaco-tfstate-bucket-kmu" \
          -backend-config="key=<module-name>/terraform.tfstate" \
          -backend-config="region=ap-northeast-2" \
          -backend-config="dynamodb_table=alpaco-tfstate-lock-table"
        ```

    - **`terraform plan` 실행 (선택 사항):** 변경될 내용을 미리 확인합니다. 필요한 변수는 `-var` 또는 `-var-file` 옵션, 또는 `terraform.auto.tfvars` 파일을 통해 전달합니다.
    - **`terraform apply` 실행:** 인프라를 배포합니다. 필요한 변수를 전달합니다.
    - **주의:** 모듈 간 의존성이 있으므로, [Terraform 인프라 가이드](https://kookmin-sw.github.io/capstone-2025-04/documents/deployment/InfrastructureAsCode/#7-전체-배포-전략-및-순서)에 설명된 권장 배포 순서를 따르십시오. (예: `backend-setup` -> `cognito` -> `problem-generator-v3` 1단계 -> ...)

---

## 📂 폴더 구조

ALPACO 프로젝트의 주요 폴더 구조는 다음과 같습니다:

```
capstone-2025-04/
├── .github/                      # GitHub 관련 설정
│   └── workflows/                # GitHub Actions CI/CD 워크플로우 파일
├── backend/                      # AWS Lambda 함수 소스 코드
│   └── lambdas/                  # 각 마이크로서비스별 Lambda 함수 디렉토리
│       ├── chatbot-query/        # AI 챗봇 서비스 Lambda
│       ├── code-executor/        # 코드 실행 서비스 Lambda (Python)
│       ├── code-grader/          # 코드 채점 서비스 Lambda (Python)
│       ├── community-lambda-functions/ # 커뮤니티 API Lambda
│       ├── problem-generator-v3/ # 문제 생성 서비스 V3 Lambda
│       ├── problems-api/         # 문제 정보 조회 API Lambda
│       └── submissions-api/      # 제출 기록 조회 API Lambda
├── docs/                         # 프로젝트 문서 (Jekyll, Just the Docs 기반)
│   ├── assets/                   # 문서에 사용되는 이미지, 로고 등
│   ├── documents/                # Markdown 형식의 상세 문서
│   │   ├── deployment/           # 개발 가이드 (프론트엔드, 백엔드, 인프라, 서비스 API)
│   │   └── serving/              # 서비스 가이드 (사용자, 운영자)
│   ├── _config.yml               # Jekyll 사이트 설정 파일
│   └── index.md                  # 문서 사이트 메인 페이지 (이 파일)
├── frontend/                     # Next.js 프론트엔드 애플리케이션
│   ├── public/                   # 정적 에셋 (파비콘, 이미지 등)
│   ├── src/                      # 프론트엔드 소스 코드
│   │   ├── app/                  # Next.js App Router (페이지, 레이아웃)
│   │   ├── components/           # 재사용 가능한 React 컴포넌트
│   │   ├── api/                  # 백엔드 API 통신 클라이언트
│   │   └── ...
│   ├── next.config.ts            # Next.js 설정 파일
│   ├── package.json              # 프론트엔드 의존성 및 스크립트
│   └── ...
├── infrastructure/               # Terraform 코드 (AWS 인프라 정의)
│   ├── api/                      # 커뮤니티 API 인프라
│   ├── app/                      # 프론트엔드 호스팅 인프라 (S3, CloudFront)
│   ├── backend-setup/            # Terraform 원격 상태 백엔드 설정
│   ├── chatbot/                  # AI 챗봇 서비스 인프라
│   ├── code-execution-service/   # 코드 실행/채점 서비스 인프라
│   ├── cognito/                  # AWS Cognito 사용자 인증 서비스 인프라
│   ├── problem-generator-v3/     # 문제 생성 서비스 V3 인프라
│   ├── problems-api/             # 문제 정보 조회 API 인프라
│   └── submissions-api/          # 제출 기록 조회 API 인프라
├── .gitignore                    # Git에서 무시할 파일 및 폴더 패턴
└── README.md                     # 프로젝트 최상위 README 파일
```

---

## 📝 참고 자료

이 문서는 ALPACO 프로젝트의 전반적인 내용을 다루고 있습니다. 각 기술 요소 및 모듈에 대한 더 자세한 정보는 `docs/documents/` 내의 해당 문서를 참조하십시오.

- **[👋 안녕하세요! (문서 탐색 가이드)](https://kookmin-sw.github.io/capstone-2025-04/documents/greeting/)**
- **[🙋‍♀️ 서비스 가이드](https://kookmin-sw.github.io/capstone-2025-04/documents/serving/)**
- **[🧑‍💻 개발 가이드](https://kookmin-sw.github.io/capstone-2025-04/documents/deployment/)**
