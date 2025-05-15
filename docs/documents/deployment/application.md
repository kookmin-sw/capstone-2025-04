# ALPACO 프론트엔드 애플리케이션

ALPACO (AI Learning PAth COmpanion)는 프로그래밍 및 관련 분야에서 사용자의 학습 여정을 지원하도록 설계된 현대적인 웹 애플리케이션입니다. 이 프론트엔드는 Next.js, TypeScript, Tailwind CSS로 구축되어 반응형 및 대화형 사용자 경험을 제공합니다. 인증을 위한 AWS Cognito, 마이크로서비스 접근을 위한 API Gateway, 호스팅 및 콘텐츠 전송을 위한 S3/CloudFront 등 다양한 백엔드 서비스와 통합됩니다.

## 목차

1.  [주요 기능](#주요-기능)
2.  [기술 스택](#기술-스택)
3.  [사전 준비 사항](#사전-준비-사항)
4.  [시작하기](#시작하기)
    *   [저장소 복제](#저장소-복제)
    *   [의존성 설치](#의존성-설치)
    *   [환경 변수 설정](#환경-변수-설정)
    *   [개발 서버 실행](#개발-서버-실행)
5.  [프로젝트 구조](#프로젝트-구조)
6.  [프로덕션 빌드](#프로덕션-빌드)
7.  [배포](#배포)
    *   [배포 전략](#배포-전략)
    *   [인프라 (Terraform)](#인프라-terraform)
    *   [GitHub Actions를 이용한 CI/CD](#github-actions를-이용한-cicd)
    *   [URL 재작성을 위한 CloudFront 함수](#url-재작성을-위한-cloudfront-함수)
8.  [린팅 및 포맷팅](#린팅-및-포맷팅)
9.  [주요 Next.js 설정 (`next.config.ts`)](#주요-nextjs-설정-nextconfigts)
10. [스타일링 (Tailwind CSS)](#스타일링-tailwind-css)
11. [TypeScript 설정](#typescript-설정)
12. [더 알아보기](#더-알아보기)

## 주요 기능

*   **사용자 인증:** AWS Cognito를 통한 안전한 회원가입, 로그인 및 사용자 관리.
*   **대화형 문제 해결:** 코딩 문제 인터페이스 (Monaco 기반 코드 편집기 사용 가능성).
*   **Markdown 콘텐츠 표시:** `react-markdown`을 사용한 리치 텍스트 콘텐츠 렌더링.
*   **반응형 디자인:** Tailwind CSS를 사용한 다양한 화면 크기에 적응하는 UI.
*   **동적 UI 요소:** Framer Motion을 사용한 애니메이션 및 Sonner를 사용한 알림.
*   **크기 조절 가능 패널:** 유연한 레이아웃 조정을 위함.
*   **구문 강조:** 코드 스니펫을 명확하게 표시.
*   **백엔드 서비스 연동:** 문제 생성, 코드 채점, 커뮤니티 기능, 챗봇 상호작용을 위한 다양한 API 연결.

## 기술 스택

*   **프레임워크:** [Next.js](https://nextjs.org/) (v15.x, 개발 시 Turbopack 사용)
*   **언어:** [TypeScript](https://www.typescriptlang.org/)
*   **UI 라이브러리:** [React](https://react.dev/) (v19)
*   **스타일링:** [Tailwind CSS](https://tailwindcss.com/) (v3.3) with PostCSS and Autoprefixer
*   **인증:** [AWS Amplify](https://aws.amazon.com/amplify/) (AWS Cognito 연동)
*   **상태 관리:** React Context / Hooks (Amplify 및 일반적인 React 패턴에서 암시)
*   **코드 편집기 (컴포넌트):** [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react)
*   **Markdown 렌더링:** `react-markdown`, `remark-gfm`, `rehype-raw`
*   **UI 컴포넌트 & 유틸리티:**
    *   `@heroicons/react` (아이콘)
    *   `react-resizable-panels` (레이아웃)
    *   `react-syntax-highlighter` (코드 표시)
    *   `sonner` (토스트 알림)
    *   `framer-motion` (애니메이션)
    *   `date-fns` (날짜 유틸리티)
*   **린팅:** [ESLint](https://eslint.org/) (`eslint-config-next` 사용)
*   **배포:** AWS S3 (정적 웹사이트 호스팅) + AWS CloudFront (CDN)

## 사전 준비 사항

*   [Node.js](https://nodejs.org/) (LTS 버전 권장, 예: v18.x, v20.x)
*   패키지 매니저:
    *   [npm](https://www.npmjs.com/) (Node.js와 함께 제공)
    *   [yarn](https://yarnpkg.com/)
    *   [pnpm](https://pnpm.io/)
    *   [bun](https://bun.sh/)
*   프로젝트의 AWS 계정 접근 권한 (백엔드 서비스의 환경 변수 값 필요).

## 시작하기

### 저장소 복제

```bash
git clone <repository-url>
cd capstone-2025-04/frontend
```

### 의존성 설치

선호하는 패키지 매니저를 선택하여 사용하세요:

```bash
# npm 사용 시
npm install

# yarn 사용 시
yarn install

# pnpm 사용 시
pnpm install

# bun 사용 시
bun install
```

### 환경 변수 설정

애플리케이션이 백엔드 서비스에 연결하려면 여러 환경 변수가 필요합니다.

1.  샘플 환경 파일을 복사합니다:
    ```bash
    cp .env.local.sample .env.local
    ```
2.  `.env.local` 파일을 편집하고 값을 채웁니다. 이 값들은 일반적으로 백엔드 인프라 배포(예: `infrastructure/app` Terraform 모듈의 Cognito, API Gateway, CloudFront 출력) 결과로부터 얻습니다.

    ```ini
    # .env.local
    # 브라우저에서 접근 가능하도록 NEXT_PUBLIC_ 접두사로 시작해야 합니다.

    # AWS 설정
    NEXT_PUBLIC_AWS_REGION=ap-northeast-2 # 사용하는 AWS 리전

    # AWS Cognito (`infrastructure/auth` Terraform 출력값)
    NEXT_PUBLIC_COGNITO_USER_POOL_ID=YOUR_USER_POOL_ID
    NEXT_PUBLIC_COGNITO_CLIENT_ID=YOUR_APP_CLIENT_ID
    NEXT_PUBLIC_COGNITO_DOMAIN=YOUR_COGNITO_AUTH_DOMAIN # 예: alpaco-auth-prod.auth.ap-northeast-2.amazoncognito.com

    # 애플리케이션 기본 URL (`infrastructure/app` Terraform 출력값: cloudfront_distribution_domain_name 또는 사용자 정의 도메인)
    NEXT_PUBLIC_APP_BASE_URL=YOUR_CLOUDFRONT_OR_CUSTOM_DOMAIN_NAME # 예: https://d2rgzjzynamwq2.cloudfront.net 또는 https://www.alpaco.us

    # API Gateway 호출 URL (각 백엔드 Terraform 출력값)
    NEXT_PUBLIC_COMMUNITY_API_BASE_URL=YOUR_COMMUNITY_API_GATEWAY_INVOKE_URL
    NEXT_PUBLIC_PROBLEM_GENERATION_API_BASE_URL=YOUR_PROBLEM_GEN_API_GATEWAY_INVOKE_URL
    NEXT_PUBLIC_PROBLEM_API_BASE_URL=YOUR_PROBLEM_API_GATEWAY_INVOKE_URL
    NEXT_PUBLIC_CODE_GRADER_BASE_URL=YOUR_CODE_GRADER_API_GATEWAY_INVOKE_URL
    NEXT_PUBLIC_SUBMISSIONS_API_BASE_URL=YOUR_SUBMISSIONS_API_GATEWAY_INVOKE_URL

    # 챗봇 API 엔드포인트 (API Gateway 또는 WebSocket API를 위한 특정 CloudFront 배포일 수 있음)
    NEXT_PUBLIC_CHATBOT_API_ENDPOINT=YOUR_CHATBOT_API_ENDPOINT
    ```
    **참고:** `.env.local` 파일은 `.gitignore`에 포함되어 있으며, 저장소에 **절대로** 커밋해서는 안 됩니다.

### 개발 서버 실행

의존성 설치 및 `.env.local` 설정 후:

```bash
npm run dev
# 또는
yarn dev
# 또는
pnpm dev
# 또는
bun dev
```

애플리케이션은 일반적으로 [http://localhost:3000](http://localhost:3000)에서 사용할 수 있습니다. Next.js 개발 서버는 `package.json`에 명시된 대로 더 빠른 빌드를 위해 Turbopack을 사용합니다.

## 프로젝트 구조

일반적인 Next.js 프로젝트 구조를 사용합니다:

```
frontend/
├── public/               # 정적 에셋 (파비콘, 이미지 등)
├── src/
│   ├── app/              # Next.js App Router (레이아웃, 페이지, 라우트 핸들러)
│   ├── components/       # 재사용 가능한 React 컴포넌트
│   ├── api/              # API 클라이언트 함수 (예: API Gateway와 상호작용)
│   ├── hooks/            # 사용자 정의 React Hooks
│   ├── lib/              # 유틸리티 함수, 설정 (예: Amplify 설정)
│   ├── styles/           # 전역 스타일, Tailwind 기본 스타일
│   └── ...               # 기타 특정 디렉토리 (컨텍스트, 타입 등)
├── .env.local            # 로컬 환경 변수 (Gitignored)
├── .env.local.sample     # 샘플 환경 변수
├── next.config.ts        # Next.js 설정
├── tailwind.config.js    # Tailwind CSS 설정
├── postcss.config.js     # PostCSS 설정
├── tsconfig.json         # TypeScript 설정
├── eslint.config.mjs     # ESLint 설정 (새로운 flat config 형식)
├── package.json          # 프로젝트 의존성 및 스크립트
└── README.md             # 이 파일
```

## 프로덕션 빌드

프로덕션을 위해 애플리케이션을 빌드(정적 익스포트)하려면:

```bash
npm run build
```
이 명령어는 다음을 수행합니다:
1.  코드 린트 (Next.js 빌드 프로세스에 따라).
2.  TypeScript 및 React 코드 컴파일.
3.  `out/` 디렉토리에 정적 HTML, CSS, JavaScript 파일 생성. 이는 `next.config.ts`의 `output: "export"` 설정 때문입니다.

## 배포

### 배포 전략

프론트엔드는 AWS S3에 **정적 사이트**로 배포되며, AWS CloudFront를 통해 전 세계적으로 제공됩니다. 이 접근 방식은 다음을 활용합니다:
*   **정적 익스포트:** Next.js의 `output: "export"` 기능은 사이트의 완전한 정적 버전을 생성합니다.
*   **S3:** 저렴하고 안정적인 정적 파일 호스팅.
*   **CloudFront:** 글로벌 콘텐츠 전송(CDN), HTTPS/SSL 종료(ACM 인증서 사용), 사용자 정의 도메인 지원.
*   **Origin Access Control (OAC):** S3 버킷 콘텐츠가 CloudFront를 통해서만 접근 가능하도록 보장.

### 인프라 (Terraform)

AWS 인프라(S3 버킷, CloudFront 배포, ACM 인증서, Route 53 레코드, GitHub Actions용 IAM 역할)는 Terraform에 의해 프로비저닝되고 관리됩니다. 관련 Terraform 설정은 `capstone-2025-04/infrastructure/app/` 디렉토리에 있습니다. 인프라 설정에 대한 자세한 내용은 해당 디렉토리의 `README.md`를 참조하십시오.

Terraform에 의해 생성되는 주요 인프라 구성 요소는 다음과 같습니다:
*   `aws_s3_bucket`: `out/` 디렉토리의 정적 빌드 출력을 저장합니다.
*   `aws_cloudfront_distribution`: S3에서 콘텐츠를 제공하고 SSL 및 사용자 정의 도메인을 처리합니다.
*   `aws_acm_certificate`: 사용자 정의 도메인(`alpaco.us` 및 `www.alpaco.us`, `auth.alpaco.us`와 같은 하위 도메인)에 대한 HTTPS용.
*   `aws_route53_record`: 사용자 정의 도메인을 CloudFront 배포로 지정합니다.
*   `aws_cloudfront_function`: 클라이언트 측 라우팅을 위한 URL 재작성을 처리합니다.
*   `aws_iam_role` (GitHub Actions용): GitHub Actions가 S3에 배포하고 CloudFront를 무효화할 수 있도록 허용합니다.

### GitHub Actions를 이용한 CI/CD

배포는 GitHub Actions를 사용하여 자동화됩니다. 워크플로우(`capstone-2025-04/.github/workflows/deploy.yml`에 위치)는 일반적으로 특정 트리거(예: `master` 브랜치 또는 `release/**` 브랜치로 푸시) 발생 시 다음 단계를 수행합니다:

1.  **코드 체크아웃 (`actions/checkout@v4`):** 최신 코드를 가져옵니다. 푸시된 참조(브랜치 또는 태그)를 체크아웃합니다.
2.  **Node.js 설정 (`actions/setup-node@v4`):** Node.js 20 버전을 설정하고 `frontend/package-lock.json`을 사용하여 npm 캐시를 구성합니다.
3.  **(선택적) OIDC 토큰 디버깅:** OIDC 토큰 검색 및 페이로드 디코딩을 시도하여 문제를 해결합니다.
4.  **AWS 자격 증명 구성 (`aws-actions/configure-aws-credentials@v4`):** GitHub Secrets (`AWS_IAM_ROLE_ARN`, `AWS_REGION`)에 저장된 정보를 사용하여 OIDC를 통해 IAM 역할을 수임하여 AWS에 안전하게 접근합니다.
5.  **의존성 설치:** `./frontend` 디렉토리에서 `npm install`을 실행합니다.
6.  **Next.js 정적 사이트 빌드:** `./frontend` 디렉토리에서 `npm run build`를 실행합니다. 빌드 프로세스에 필요한 `NEXT_PUBLIC_` 환경 변수들이 GitHub Secrets로부터 주입됩니다.
    *   `NEXT_PUBLIC_AWS_REGION`
    *   `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
    *   `NEXT_PUBLIC_COGNITO_CLIENT_ID`
    *   `NEXT_PUBLIC_COGNITO_DOMAIN`
    *   `NEXT_PUBLIC_APP_BASE_URL`: `https://${{ secrets.ROUTE53_DOMAIN_NAME }}` (CloudFront 도메인 또는 사용자 정의 도메인)
    *   각 API 서비스의 `NEXT_PUBLIC_*_API_BASE_URL` 및 `NEXT_PUBLIC_CHATBOT_API_ENDPOINT`
7.  **S3에 파일 동기화:** `aws s3 sync ./frontend/out s3://${{ secrets.AWS_S3_BUCKET_NAME }} --delete` 명령을 사용하여 빌드된 `out/` 디렉토리의 내용을 S3 버킷에 동기화하고, 기존에 있지만 새 빌드에는 없는 파일을 삭제합니다.
8.  **CloudFront 캐시 무효화:** `aws cloudfront create-invalidation --distribution-id ${{ secrets.AWS_CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"` 명령을 사용하여 CloudFront 캐시를 무효화하여 사용자가 최신 버전을 받을 수 있도록 합니다.

**배포에 필요한 GitHub Secrets:**
*   `AWS_IAM_ROLE_ARN`: GitHub Actions가 사용할 IAM 역할의 ARN (예: `arn:aws:iam::897722694537:role/alpaco-github-actions-deploy-role-production`)
*   `AWS_REGION`: AWS 리전 (예: `ap-northeast-2`)
*   `AWS_S3_BUCKET_NAME`: 대상 S3 버킷 이름 (예: `alpaco-frontend-production-alpaco-frontend-bucket`)
*   `AWS_CLOUDFRONT_DISTRIBUTION_ID`: CloudFront 배포 ID (예: `E3Q5IEHTZGF1U5`)
*   `ROUTE53_DOMAIN_NAME`: 애플리케이션의 기본 도메인 이름 (예: `www.alpaco.us` 또는 `d2rgzjzynamwq2.cloudfront.net`)
*   `NEXT_PUBLIC_AWS_REGION`: 프론트엔드 빌드 시 사용될 AWS 리전
*   `NEXT_PUBLIC_COGNITO_USER_POOL_ID`: Cognito 사용자 풀 ID
*   `NEXT_PUBLIC_COGNITO_CLIENT_ID`: Cognito 앱 클라이언트 ID
*   `NEXT_PUBLIC_COGNITO_DOMAIN`: Cognito 인증 도메인
*   `NEXT_PUBLIC_COMMUNITY_API_BASE_URL`: 커뮤니티 API Gateway URL
*   `NEXT_PUBLIC_CHATBOT_API_ENDPOINT`: 챗봇 API 엔드포인트
*   `NEXT_PUBLIC_PROBLEM_GENERATION_API_BASE_URL`: 문제 생성 API Gateway URL
*   `NEXT_PUBLIC_PROBLEM_API_BASE_URL`: 문제 API Gateway URL
*   `NEXT_PUBLIC_CODE_GRADER_BASE_URL`: 코드 채점기 API Gateway URL
*   `NEXT_PUBLIC_SUBMISSIONS_API_BASE_URL`: 제출 API Gateway URL

이 값들은 `infrastructure/app` Terraform 모듈의 출력이거나 해당 백엔드 서비스 설정에서 파생됩니다.

### URL 재작성을 위한 CloudFront 함수

이 애플리케이션은 정적으로 익스포트되므로, S3에서 `/profile`과 같은 경로에 직접 접근하면 해당 파일이 없기 때문에 403/404 오류가 발생합니다. S3는 `/profile/index.html`을 기대합니다. `infrastructure/app` Terraform 설정에는 CloudFront 배포의 "뷰어 요청(Viewer Request)" 이벤트와 연결된 `aws_cloudfront_function` (`url_rewrite_function`)이 포함되어 있습니다. 이 함수는 URI를 다음과 같이 재작성합니다:
*   URI가 `/`로 끝나면 `index.html`을 추가합니다.
*   URI에 파일 확장자가 없는 경우(예: `/profile`), `/index.html`을 추가합니다.

이를 통해 클라이언트 측 라우팅이 올바르게 작동하고 페이지 새로고침 시 적절한 `index.html` 파일이 로드되어 Next.js가 라우팅을 처리할 수 있도록 합니다.
또한, CloudFront에서 발생하는 403 및 404 오류는 200 상태 코드와 함께 `/index.html`을 반환하도록 구성되어 Next.js 클라이언트 측 라우터에 라우팅을 위임합니다.

## 린팅 및 포맷팅

코드베이스를 린트하려면:
```bash
npm run lint
```
이 프로젝트는 React, JSX 접근성, TypeScript에 대한 규칙을 포함하는 `eslint-config-next` 설정을 사용하는 ESLint를 사용합니다. ESLint 설정은 `eslint.config.mjs`에 있습니다.

## 주요 Next.js 설정 (`next.config.ts`)

`next.config.ts` 파일에는 정적 사이트 생성을 위한 중요한 설정이 포함되어 있습니다:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // 정적 HTML 익스포트 활성화
  trailingSlash: true, // URL 끝에 슬래시 추가 (예: /about/ 대신 /about) (S3 호환성)
  reactStrictMode: true,
  images: {
    unoptimized: true, // Next.js 이미지 최적화 API 비활성화 (`next export`에 필요)
  },
};

export default nextConfig;
```
*   **`output: "export"`**: 이것이 핵심입니다. Next.js에게 애플리케이션을 S3와 같은 정적 웹 서버에서 호스팅할 수 있는 정적 HTML, CSS, JavaScript 파일 모음으로 빌드하도록 지시합니다.
*   **`trailingSlash: true`**: S3가 웹사이트 호스팅용으로 구성되거나 CloudFront를 통해 접근될 때 S3 객체 확인에 도움이 됩니다. S3는 종종 슬래시로 끝나는 디렉토리와 유사한 경로에서 더 잘 작동합니다.
*   **`images: { unoptimized: true }`**: 기본 Next.js 이미지 최적화 API는 Node.js 서버가 필요합니다. 정적 익스포트의 경우 이미지는 정적 에셋으로 처리되어야 하므로 최적화가 비활성화됩니다. 필요한 경우 이미지 최적화는 일반적으로 빌드 시 또는 CloudFront 기능을 통해 처리됩니다(여기서는 기본적으로 구성되지 않음).

## 스타일링 (Tailwind CSS)

이 프로젝트는 유틸리티 우선 스타일링을 위해 [Tailwind CSS](https://tailwindcss.com/)를 사용합니다.
*   **설정:** `tailwind.config.js`
*   **PostCSS:** `postcss.config.js` (Tailwind 및 Autoprefixer 통합)
*   **사용자 정의:** `tailwind.config.js`에는 사용자 정의 색상 팔레트(`primary`, `secondary` 등) 및 키프레임 애니메이션(`slideDown`)이 포함됩니다.
*   **타이포그래피:** `@tailwindcss/typography` 플러그인은 마크다운으로 생성된 콘텐츠 스타일링을 위해 포함되어 있습니다.

## TypeScript 설정

이 프로젝트는 TypeScript용으로 설정되어 있습니다.
*   **설정:** `tsconfig.json`
*   **주요 설정:**
    *   `target: "ES2017"`
    *   `module: "esnext"`
    *   `moduleResolution: "bundler"` (최신 모듈 확인 방식)
    *   `jsx: "preserve"`
    *   `strict: true` (모든 엄격한 타입 검사 옵션 활성화)
    *   `noEmit: true` (TypeScript 컴파일러는 JS를 생성하지 않음; Next.js가 처리)
    *   `paths: { "@/*": ["./src/*"] }` (`src` 디렉토리에서 절대 경로 임포트 허용, 예: `import MyComponent from '@/components/MyComponent'`).

## 더 알아보기

이 프로젝트에서 사용된 기술에 대해 더 알아보려면 다음 자료를 참조하십시오:

*   [Next.js 문서](https://nextjs.org/docs) - Next.js 기능 및 API에 대해 알아보세요.
*   [Learn Next.js](https://nextjs.org/learn) - 대화형 Next.js 튜토리얼.
*   [React 문서](https://react.dev/)
*   [Tailwind CSS 문서](https://tailwindcss.com/docs)
*   [TypeScript 문서](https://www.typescriptlang.org/docs/)
*   [AWS Amplify 문서](https://docs.amplify.aws/)
*   [Terraform 문서](https://developer.hashicorp.com/terraform/docs)
*   [AWS CloudFront 문서](https://aws.amazon.com/cloudfront/)
*   [GitHub Actions 문서](https://docs.github.com/en/actions)
