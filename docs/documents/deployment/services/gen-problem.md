---
layout: default
title: "🧩 문제 생성 서비스"
parent: "🔌 마이크로서비스 API"
grand_parent: "🧑‍💻 개발 가이드"
nav_order: 1
description: "문제 생성 서비스 API 가이드"
permalink: /documents/deployment/services/gen-problem/
---

# Problem Generator V3 - 기술 매뉴얼

**버전:** 2.0 (Updated for V3 Improvements)
**최종 업데이트:** 2025년 5월 23일

## 최신 업데이트 (v3 개선사항)

### 🚀 주요 개선사항

1. **검증 실패 수정**
   - Validation 실패 시 자동으로 "Pass"를 반환하던 fallback 로직 제거
   - 검증 실패 시 파이프라인 종료 또는 적절한 재생성 로직 구현

2. **향상된 피드백 시스템**
   - `validation_feedback` 파라미터를 모든 검증 체인에 추가
   - 지능적인 컴포넌트 재생성 함수 `regenerateBasedOnValidationFeedback()` 구현
   - 각 단계별 구체적이고 상세한 피드백 제공
   - `analyzeFeedbackAndDetermineActions()` 함수로 피드백 분석 및 재생성 결정

3. **Intent Analysis 창의적 컨텍스트 지원**
   - `creative_context` 필드 추가: `theme_elements`, `narrative_style`, `should_integrate_theme`
   - 창의적 요청 (예: "딸기가 등장하는 피보나치 문제") 처리 개선
   - Description Generation에서 테마 요소 통합 지원

4. **파이프라인 구조 개선**
   - 품질 검증 함수 추가: `validateIntentQuality()`, `validateTestSpecsQuality()`, `validateSolutionCodeQuality()`
   - 향상된 에러 핸들링 및 재시도 로직
   - 단계별 맞춤형 피드백 누적

## 목차

1. [소개](#1-소개)
    - [1.1 목적](#11-목적)
    - [1.2 주요 기능](#12-주요-기능)
2. [시스템 아키텍처](#2-시스템-아키텍처)
    - [2.1 개요](#21-개요)
    - [2.2 구성 요소](#22-구성-요소)
3. [기술 스택](#3-기술-스택)
4. [핵심 백엔드 로직: 문제 생성 파이프라인](#4-핵심-백엔드-로직-문제-생성-파이프라인)
    - [4.1 파이프라인 개요](#41-파이프라인-개요)
    - [4.2 상세 단계](#42-상세-단계)
    - [4.3 지능적 피드백 시스템](#43-지능적-피드백-시스템)
    - [4.4 창의적 컨텍스트 처리](#44-창의적-컨텍스트-처리)
5. [인프라 (Terraform을 사용한 AWS IaC)](#5-인프라-terraform을-사용한-aws-iac)
    - [5.1 개요](#51-개요)
    - [5.2 주요 리소스](#52-주요-리소스)
    - [5.3 설정 변수](#53-설정-변수)
    - [5.4 Lambda 레이어 빌드 프로세스](#54-lambda-레이어-빌드-프로세스)
6. [배포](#6-배포)
    - [6.1 전제 조건](#61-전제-조건)
    - [6.2 배포 단계](#62-배포-단계)
    - [6.3 모듈 간 의존성](#63-모듈-간-의존성)
7. [로컬 개발 및 테스트 (백엔드)](#7-로컬-개발-및-테스트-백엔드)
    - [7.1 설정](#71-설정)
    - [7.2 로컬 테스트 실행](#72-로컬-테스트-실행)
    - [7.3 모의(Mocking) 처리](#73-모의mocking-처리)
8. [API 사용법 (프론트엔드 관점)](#8-api-사용법-프론트엔드-관점)
    - [8.1 엔드포인트](#81-엔드포인트)
    - [8.2 인증](#82-인증)
    - [8.3 요청](#83-요청)
    - [8.4 응답 (SSE 스트림)](#84-응답-sse-스트림)
9. [문제 해결 및 알려진 문제](#9-문제-해결-및-알려진-문제)
10. [향후 개선 사항 및 TODO](#10-향후-개선-사항-및-todo)
11. [결론](#11-결론)

---

## 1. 소개

### 1.1 목적

Problem Generator V3는 대규모 언어 모델(LLM), 특히 LangChain 프레임워크를 통해 Google의 Gemini 모델을 사용하여 프로그래밍 문제를 자동으로 생성하도록 설계된 AWS 기반 서버리스 애플리케이션입니다. 포괄적인 문제 설명, 예제 테스트 케이스, 솔루션 코드, 제약 조건 및 시작 코드 템플릿 생성을 목표로 합니다. V3의 핵심 기능은 생성된 솔루션을 검증하고 정확한 테스트 출력을 결정하기 위해 실제 코드 실행에 의존하여 이전 버전에 비해 안정성을 크게 향상시킨다는 점입니다.

**최신 V3 개선사항**으로는 검증 실패 시 적절한 재생성을 통한 안정성 향상, 지능적 피드백 시스템을 통한 품질 개선, 그리고 창의적 요청 (테마가 있는 문제) 처리 능력이 추가되었습니다.

### 1.2 주요 기능

- **LLM 기반 생성:** Google Gemini 모델을 활용하여 창의적이고 복잡한 문제를 생성합니다.
- **실행 기반 검증:** 생성된 솔루션 코드를 설계된 테스트 입력에 대해 실행하여 정확성을 검증하고 예상 출력을 도출합니다.
- **지능적 피드백 시스템:** 검증 실패 시 구체적인 피드백을 기반으로 관련 컴포넌트만 선택적으로 재생성합니다.
- **창의적 컨텍스트 지원:** 테마 요소가 포함된 요청 (예: "딸기가 등장하는 피보나치 문제")을 이해하고 적절히 반영합니다.
- **단계별 파이프라인:** 다단계 모듈식 파이프라인(LangChain 사용)이 의도 분석에서 최종 번역에 이르기까지 문제 생성의 다양한 측면을 처리합니다.
- **서버-전송 이벤트(SSE):** Lambda 함수 URL 스트림을 통해 생성 과정 중 실시간 상태 업데이트를 클라이언트에 제공합니다.
- **DynamoDB 통합:** 문제 메타데이터, 생성 상태 및 최종 결과물을 저장합니다.
- **안전한 코드 실행:** 생성된 Python 코드의 샌드박스 실행을 위해 별도의 AWS Lambda 함수(`code-execution-service`)를 활용합니다.
- **코드형 인프라(IaC):** AWS 리소스는 Terraform을 사용하여 관리됩니다.
- **모듈식 백엔드:** 코드베이스는 서비스, 체인, 프롬프트, 스키마 및 유틸리티로 구성되어 유지 관리성을 향상시킵니다.
- **시작 코드 생성:** 사용자를 위한 시작 코드 템플릿을 생성합니다.
- **번역:** 문제 제목 및 설명 번역을 지원합니다.
- **품질 검증:** 각 단계에서 생성된 결과물의 품질을 검증하고 개선합니다.

---

## 2. 시스템 아키텍처

### 2.1 개요

```mermaid
graph TD
    User[최종 사용자] -->|상호작용| Frontend[프론트엔드 (Next.js/React 앱)]
    Frontend -->|API 호출 (SSE)| CloudFront[AWS CloudFront 배포]
    CloudFront -->|요청 전달 (OAC를 통한 IAM 인증)| ProblemGenLambdaURL[Problem Generator Lambda 함수 URL]
    ProblemGenLambdaURL --> ProblemGenLambda[Problem Generator Lambda (Node.js, LangChain, Gemini API)]
    ProblemGenLambda -->|문제 데이터 읽기/쓰기| ProblemsDB[AWS DynamoDB (Problems 테이블)]
    ProblemGenLambda -->|모델 추론 호출| GeminiAPI[Google Gemini API]
    ProblemGenLambda -->|코드 실행 호출| CodeExecutorLambda[Code Executor Lambda (Python)]

    subgraph AWS 클라우드
        CloudFront
        ProblemGenLambdaURL
        ProblemGenLambda
        ProblemsDB
        CodeExecutorLambda
    end
```

### 2.2 구성 요소

- **프론트엔드 애플리케이션:** (`frontend/src/app` 기반으로 추정된 Next.js/React) 문제 생성 요청을 시작하고 결과를 표시하는 사용자 인터페이스입니다.
- **AWS CloudFront:** 공개적으로 접근 가능한 진입점 역할을 하며, Origin Access Control(OAC)을 통해 Lambda 함수 URL에 대한 캐싱, HTTPS 및 보안 액세스를 제공합니다.
- **Problem Generator Lambda 함수 URL:** Problem Generator Lambda용 HTTPS 엔드포인트로, IAM 인증 및 SSE용 `RESPONSE_STREAM` 호출 모드로 구성됩니다.
- **Problem Generator Lambda (`problem-generator-v3`):**
  - Node.js로 작성된 핵심 백엔드 서비스입니다.
  - LangChain.js를 사용하여 Google Gemini API와의 상호 작용을 조정합니다.
  - 다단계 문제 생성 파이프라인을 관리합니다.
  - DynamoDB와 상호 작용하여 문제 생성 상태 및 결과를 저장하고 업데이트합니다.
  - 생성된 Python 솔루션을 실행하기 위해 `Code Executor Lambda`를 호출합니다.
  - SSE를 통해 진행 상황 업데이트 및 최종 결과를 클라이언트에 스트리밍합니다.
- **Code Executor Lambda (`code-execution-service`):**
  - 사용자가 생성한 Python 코드 조각을 샌드박스 환경에서 안전하게 실행하는 역할을 하는 별도의 AWS Lambda 함수(일반적으로 Python)입니다.
  - 코드와 입력 데이터를 수신하고 stdout, stderr, 실행 시간 및 상태를 반환합니다.
- **AWS DynamoDB (`alpaco-Problems-v3-production` 테이블):**
  - 원본 프롬프트, 생성된 콘텐츠(제목, 설명, 솔루션, 테스트, 제약 조건), 생성 상태, 타임스탬프 및 `creatorId`, `author`와 같은 메타데이터를 포함한 문제 세부 정보를 저장하는 데 사용되는 NoSQL 데이터베이스입니다.
  - 효율적인 쿼리를 위한 글로벌 보조 인덱스(GSI)를 포함합니다 (예: `CompletedProblemsByCreatedAtGSI`, `CreatorIdCreatedAtGSI`).
- **Google Gemini API:** 프로그래밍 문제의 다양한 구성 요소를 생성하는 데 사용되는 LLM 서비스입니다.
- **AWS S3 (Terraform 상태용):** `alpaco-tfstate-bucket-kmu`는 Terraform 상태 파일을 저장합니다.
- **AWS IAM:** 모든 AWS 리소스에 대한 권한을 관리하여 안전한 상호 작용을 보장합니다.

---

## 3. 기술 스택

| 분류              | 기술/서비스                                         | 목적                                                                 |
| ----------------- | ---------------------------------------------------- | -------------------------------------------------------------------- |
| **프론트엔드**    | React, Next.js, TypeScript                           | 사용자 인터페이스 및 클라이언트 측 로직 (추정)                         |
|                   | AWS Amplify (Auth)                                   | 사용자 인증 (추정, `fetchAuthSession` 기반)                         |
| **백엔드 (문제 생성)** | AWS Lambda (Node.js 20.x)                        | 문제 생성 로직을 위한 서버리스 컴퓨팅                                  |
|                   | LangChain.js                                         | LLM 애플리케이션 개발 프레임워크                                       |
|                   | Google Gemini API                                    | 콘텐츠 생성을 위한 대규모 언어 모델                                    |
|                   | AWS SDK for JavaScript v3 (DynamoDB, Lambda)         | AWS 서비스와 상호 작용                                                 |
|                   | Zod                                                  | LLM 출력 및 데이터 구조에 대한 스키마 유효성 검사                        |
|                   | `uuid`                                               | 고유한 문제 ID 생성                                                    |
| **백엔드 (코드 실행)** | AWS Lambda (Python - 추정)                           | 샌드박스 코드 실행                                                     |
| **데이터베이스**  | AWS DynamoDB                                         | 문제 데이터 저장을 위한 NoSQL 데이터베이스                             |
| **API 및 네트워킹** | AWS CloudFront                                     | CDN, HTTPS, Lambda에 대한 보안 액세스                                  |
|                   | AWS Lambda 함수 URL                                  | Lambda용 HTTPS 엔드포인트, SSE 스트리밍                                |
| **인프라**        | Terraform                                            | 코드형 인프라 (Infrastructure as Code)                                 |
|                   | AWS S3                                               | Terraform 상태 저장소                                                  |
|                   | AWS IAM                                              | 자격 증명 및 액세스 관리                                               |
| **빌드/DevOps**   | Docker                                               | Lambda 레이어 빌드 (`build-layer.sh`, `Dockerfile.build`)            |
|                   | npm                                                  | Node.js 패키지 관리                                                    |

---

## 4. 핵심 백엔드 로직: 문제 생성 파이프라인

### 4.1 파이프라인 개요

문제 생성 프로세스는 Problem Generator Lambda의 `src/services/pipeline.mjs`에 의해 조정됩니다. 이는 LLM 및 기타 서비스를 활용하는 순차적인 다단계 프로세스입니다. 각 주요 단계는 실패 시 재시도를 시도합니다 (`MAX_RETRIES`까지). 각 단계에서 SSE 업데이트가 클라이언트로 전송됩니다.

### 4.2 상세 단계

파이프라인은 각 생성 단계에 대한 LLM 프롬프트, 출력 파서 및 특정 로직을 캡슐화하는 "체인" 모듈(`src/chains/`에 위치)을 동적으로 호출합니다.

| 단계   | 함수 (`pipeline.mjs`) / 체인 모듈                      | 설명                                                                                                                                                                | 주요 입력                                                                 | 주요 출력                                                                                                 |
| :----- | :------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------- |
| 0      | 입력 파싱 / 초기 DB 레코드                                  | 사용자 요청(프롬프트, 난이도, creatorId, author)을 파싱합니다. `problemId`를 생성합니다. `generationStatus: "started"`로 DynamoDB에 초기 레코드를 생성합니다.           | 사용자 요청 본문                                                          | `problemId`, `userPrompt`, `difficulty`, `creatorId`, `author`                                              |
| 1      | `runIntentAnalysis` (`intentAnalysis/`)                       | **[개선됨]** 사용자의 프롬프트를 분석하여 핵심 문제 목표, 주요 제약 조건, 관련 개념, 입출력 스키마 설명, 타이 브레이킹 규칙, **그리고 창의적 컨텍스트(theme_elements, narrative_style, should_integrate_theme)**를 추출합니다. | `user_prompt`, `difficulty`                                               | `intent` (구조화된 객체), `intentJson` **+ creative_context 포함**                                                                |
| 2      | `runTestDesign` (`testDesign/`)                               | **[개선됨]** 추출된 의도와 난이도를 기반으로 다양한 테스트 케이스 *입력*과 *근거*를 설계합니다. 이전 시도 실패 시 구체적인 피드백을 받아 개선된 테스트 케이스를 생성합니다.                                             | `intent`, `intent_json`, `difficulty`, `language`, **`feedback_section`**                         | `testSpecs` (입력 및 근거 배열), `testSpecsJson`                                                          |
| 3      | `runSolutionGeneration` (`solutionGen/`)                      | **[개선됨]** 의도 및 테스트 설계 입력을 기반으로 대상 언어(`python3.12`)로 솔루션 코드를 생성합니다. 지정된 경우 타이 브레이킹 규칙을 구현하며, 피드백을 받아 개선된 솔루션을 생성할 수 있습니다.                                           | `intent.goal`, `testSpecsJson`, `language`, `input_schema_description`, `tie_breaking_rule`, **`feedback_section`** | `solutionCode` (문자열)                                                                                   |
| 4      | 솔루션 실행 및 검증 루프                                       | **V3 핵심 단계 + 피드백 기반 재생성**                                                                                                                                                        |                                                                           |                                                                                                           |
| 4.a    | `executeSolutionWithTestCases` (`solutionExecution.mjs`)      | Code Executor Lambda를 호출하여 `testSpecs`의 각 입력에 대해 `solutionCode`를 실행합니다. 실제 출력, 실행 시간 및 오류를 캡처합니다.                                         | `solutionCode`, `testSpecs` (JSON에서 파싱됨), `language`                 | `executionResults` (`success` 플래그, 실제 출력이 포함된 `testResults` 배열, `errors` 배열, LLM용 `feedback`이 포함된 객체) |
| 4.b    | (4.a 실패 시) `runSolutionGeneration` (재시도)                | **[개선됨]** 실행이 실패하면(구문 오류, 런타임 오류, 시간 초과), 상세한 실행 피드백과 함께 `solutionCode`를 다시 생성합니다. `MAX_RETRIES`까지 반복하며, 품질 검증 함수로 개선된 솔루션을 확인합니다.                         | `intent.goal`, `testSpecsJson`, `language`, **`detailed_execution_feedback`**            | 새로운 `solutionCode`                                                                                     |
|        |                                                               |                                                                                                                                                                          |                                                                           | `validatedSolutionCode` (모든 실행을 통과한 버전)                                                           |
| 5      | `finalizeTestCasesWithEdgeCases` (`testCaseFinalization.mjs`) | `executionResults`를 최종 테스트 케이스 구조(입력, *실행 검증된* 예상 출력, 근거)로 형식화합니다. 선택적으로 LLM에 추가 에지 케이스 제안을 요청할 수 있습니다.            | `validatedSolutionCode`, `executionResults`, `llm` (선택 사항), `language` | `finalTestCases` (배열), `finalTestCasesJson`                                                             |
| 6      | `runConstraintsDerivation` (`constraints/`)                   | **[개선됨]** 문제 제약 조건(시간/메모리 제한, 입력 값 범위)을 도출하고 솔루션 및 테스트를 기반으로 `judge_type`(예: `equal`, `float_eps`) 및 `epsilon`을 결정합니다. 피드백을 받아 개선된 제약조건을 생성할 수 있습니다.                     | `validatedSolutionCode`, `finalTestCasesJson`, `difficulty`, `input_schema_description`, `output_format_description`, **`feedback_section`** | `constraints` (객체), `constraintsJson`                                                               |
| 6.5    | `runStartCodeGeneration` (`startCode/`)                       | 문제 스키마 및 솔루션 코드 조각을 기반으로 함수 서명 및 기본 I/O 힌트를 포함한 사용자용 시작 코드 템플릿을 생성합니다.                                                  | `language`, `input_schema_description`, `output_format_description`, `constraints_json`, `solution_code_snippet` | `startCode` (문자열)                                                                                      |
| 7      | `runValidation` (`validation/`)                               | **[대폭 개선됨]** 전체 생성된 패키지(의도, 솔루션, 테스트, 제약 조건)에 대해 일관성, 완전성을 LLM 기반으로 검토합니다. **검증 실패 시 자동 "Pass" 반환하는 fallback 로직 제거**하고, 대신 `regenerateBasedOnValidationFeedback()` 함수를 통해 지능적으로 관련 컴포넌트만 재생성합니다.                                                                       | 이전에 생성된 모든 결과물, **`validation_feedback`**                                                   | `validationResult` (`status` 및 `details` 포함 객체) **또는 재생성된 컴포넌트들**                                                      |
| 8      | `runDescriptionGeneration` (`description/`)                   | **[개선됨]** 내러티브, 입출력 형식, 제약 조건 및 예제(`finalTestCases`에서 가져옴)를 포함하여 사용자용 문제 설명을 Markdown으로 생성합니다. **창의적 컨텍스트가 제공된 경우 테마 요소를 창의적으로 내러티브에 통합합니다.**                                                | `intent.goal`, `constraintsJson`, `exampleTestCasesJson`, `difficulty`, `language`, `epsilon_value_from_constraints`, `tie_breaking_rule`, **`creative_context`** | `description` (Markdown 문자열)                                                                         |
| 9      | `runTitleGeneration` (`title/`)                               | 간결한 문제 제목을 생성합니다.                                                                                                                                           | `difficulty`, `intent.goal`, `description_snippet`                        | `problemTitle` (문자열)                                                                                   |
| 10     | `runTranslation` (`translation/`)                             | `problemTitle` 및 `description`을 `DEFAULT_TARGET_LANGUAGE`(예: 한국어)로 번역합니다.                                                                                    | `target_language`, `text_to_translate` (제목 및 설명용)                   | `translatedTitle`, `translatedDescription`                                                                |
| 11     | 최종화                                                        | `generationStatus: "completed"` 및 모든 생성된 결과물로 DynamoDB 레코드를 업데이트합니다. 최종 `ProblemDetailAPI` 객체를 SSE를 통해 클라이언트에 전송합니다.             | 모든 생성된 결과물                                                        | 최종 SSE "result" 이벤트                                                                                  |

### 4.3 지능적 피드백 시스템

**V3의 핵심 개선사항 중 하나는 검증 실패를 적절히 처리하는 지능적 피드백 시스템입니다.**

#### 4.3.1 검증 실패 처리 개선

**이전 버전의 문제점:**

- Validation 실패 시 자동으로 "Pass"를 반환하는 fallback 로직이 있어 부정확한 결과가 통과되는 문제
- 단순한 재시도 메커니즘으로 구체적인 개선 방향 부족

**V3 개선사항:**

- **Fallback 로직 제거**: 검증 실패 시 파이프라인을 적절히 종료하거나 지능적으로 재생성
- **`regenerateBasedOnValidationFeedback()` 함수**: 검증 피드백을 분석하여 관련 컴포넌트만 선택적으로 재생성
- **`analyzeFeedbackAndDetermineActions()` 함수**: 피드백 내용을 분석하여 어떤 컴포넌트를 재생성할지 결정

#### 4.3.2 피드백 기반 재생성 로직

```javascript
// 피드백 분석 및 재생성 결정
const feedbackAnalysis = analyzeFeedbackAndDetermineActions(validationFeedback);

if (feedbackAnalysis.regenerateSolution) {
  // 솔루션 코드 재생성 + 재실행 + 테스트 케이스 재완성
}

if (feedbackAnalysis.regenerateTests) {
  // 테스트 설계 재생성
}

if (feedbackAnalysis.regenerateConstraints) {
  // 제약조건 재생성
}
```

#### 4.3.3 단계별 피드백 통합

모든 주요 생성 체인에 `feedback_section` 파라미터가 추가되어, 이전 시도의 실패 원인을 구체적으로 전달합니다:

- **Test Design**: 이전 테스트 케이스의 커버리지 부족이나 품질 문제 피드백
- **Solution Generation**: 실행 실패, 구문 오류, 로직 오류에 대한 상세한 피드백
- **Constraints Derivation**: 부적절한 judge_type이나 제약조건에 대한 피드백
- **Validation**: 컴포넌트 간 일관성 문제에 대한 구체적인 피드백

#### 4.3.4 품질 검증 함수

각 생성 단계에서 품질을 사전 검증하는 함수들이 추가되었습니다:

- **`validateIntentQuality()`**: Goal, 입출력 스키마 설명의 적절성 검증
- **`validateTestSpecsQuality()`**: 테스트 케이스 수, 에지 케이스 포함 여부, 난이도 적합성 검증
- **`validateSolutionCodeQuality()`**: 함수 정의, return 문, 코드 길이 등 기본 구조 검증

### 4.4 창의적 컨텍스트 처리

**V3에서는 테마가 있는 창의적 요청을 이해하고 적절히 반영하는 기능이 추가되었습니다.**

#### 4.4.1 창의적 컨텍스트 스키마

Intent Analysis 단계에서 `creative_context` 필드가 추가되었습니다:

```javascript
creative_context: {
  theme_elements: ["strawberries"],           // 테마 요소들
  narrative_style: "story-based with counting theme",  // 내러티브 스타일
  should_integrate_theme: true                // 테마 통합 여부
}
```

#### 4.4.2 창의적 요청 처리 예시

**사용자 요청**: "딸기가 등장하는 피보나치 간단 문제"

**Intent Analysis 결과**:

- `goal`: "Calculate the Nth term of a Fibonacci sequence"
- `creative_context.theme_elements`: ["strawberries"]
- `creative_context.should_integrate_theme`: true

**Description Generation 통합**:

- 프롬프트에 "CREATIVE INTEGRATION" 섹션 추가
- 딸기 → 카운팅 시나리오 매핑
- 내러티브에 딸기 수확, 딸기 배열 등의 스토리 통합

#### 4.4.3 테마별 통합 가이드

Description Generation에서 다양한 테마 요소들을 적절한 문제 내러티브로 변환:

- **딸기, 과일**: 카운팅, 수집, 정렬 시나리오
- **우주, 행성**: 탐험, 거리 계산, 궤도 시나리오  
- **게임**: 게임 메커니즘, 점수 시스템, 레벨링 시나리오
- **판타지**: 마법, 퀘스트, RPG 요소 시나리오

#### 4.4.4 기술적 요구사항과 창의성의 균형

창의적 컨텍스트 통합 시에도 핵심 알고리즘적 요구사항은 유지:

- **알고리즘 복잡도**: 난이도에 맞는 적절한 알고리즘 유지
- **입출력 스키마**: 명확하고 검증 가능한 형식 유지
- **테스트 커버리지**: 에지 케이스 포함한 충분한 테스트
- **판단 기준**: 명확한 tie-breaking rule과 judge_type 설정

---

## 5. 인프라 (Terraform을 사용한 AWS IaC)

인프라는 `capstone-2025-04/infrastructure/problem-generator-v3/`에 정의되어 있습니다.

### 5.1 개요

Terraform은 필요한 모든 AWS 리소스를 프로비저닝하고 관리하는 데 사용됩니다. 상태는 `backend.tf`에 정의된 대로 S3 버킷(`alpaco-tfstate-bucket-kmu`)에 원격으로 저장되며 DynamoDB(`alpaco-tfstate-lock-table`)를 통해 잠금 처리됩니다.

### 5.2 주요 리소스

- **Lambda 함수 (`aws_lambda_function.problem_generator_v3` - `lambda.tf`):**
  - 런타임: `nodejs20.x` (ARM64 아키텍처).
  - 핸들러: `var.lambda_handler`에 의해 정의됨 (예: `index.handler`는 `src/index.handler`를 가리킴).
  - 코드 소스: `var.lambda_code_path`에서 압축됨 (예: `../../backend/lambdas/problem-generator-v3/src`).
  - 시간 제한: 900초 (15분).
  - 메모리: 1024MB.
  - 레이어: `aws_lambda_layer_version.problem_generator_v3_deps`.
  - 환경 변수: `PROBLEMS_TABLE_NAME`, `GOOGLE_AI_API_KEY`, `GENERATOR_VERBOSE`, `GEMINI_MODEL_NAME`, `CODE_EXECUTOR_LAMBDA_ARN`.
- **Lambda 함수 URL (`aws_lambda_function_url.problem_generator_v3_url` - `lambda.tf`):**
  - 인증: `AWS_IAM`.
  - 호출 모드: SSE용 `RESPONSE_STREAM`.
  - CORS: 액세스를 허용하도록 구성됨 (프로덕션 환경에서는 `allow_origins` 조정).
- **Lambda 레이어 (`aws_lambda_layer_version.problem_generator_v3_deps` - `layer.tf`):**
  - Node.js 종속성 포함 (`package-lock.json` 기반).
  - `build-layer.sh` 스크립트 및 `Dockerfile.build`를 사용하여 Docker 이미지(`problem-generator-layer-builder`)를 빌드합니다.
  - Dockerfile은 `/opt` 내부에 프로덕션 종속성(`npm ci --omit=dev`)을 설치한 다음 Lambda 레이어가 예상하는 대로 `/opt/nodejs/node_modules`로 이동시킵니다.
    5. Docker 컨테이너에서 `nodejs` 디렉터리(`node_modules` 포함)를 로컬 출력 디렉터리로 복사합니다.
    6. `nodejs` 디렉터리를 `problem_generator_deps.zip`으로 압축합니다.
- `Dockerfile.build`: `public.ecr.aws/lambda/nodejs:20-arm64` 기본 이미지를 사용합니다. 종속성을 설치하고 Lambda 레이어 호환성을 위해 구조화합니다.
- `layer.tf`의 `aws_lambda_layer_version` 리소스는 이 `problem_generator_deps.zip`을 사용합니다.
- `null_resource.build_lambda_layer`는 `package-lock.json`, 빌드 스크립트 또는 Dockerfile이 변경되면 `build-layer.sh` 스크립트를 트리거합니다.

### 5.3 설정 변수 (`variables.tf`)

구성해야 하는 주요 변수 (`terraform.tfvars` 또는 환경 변수를 통해 설정):

- `google_ai_api_key`: Google AI (Gemini) API 키. **민감 정보.** `terraform.auto.tfvars.sample`에 샘플 있음.
- `code_executor_lambda_arn`: 배포된 Code Executor Lambda 함수의 ARN. 이는 의존성을 생성함 ([6. 배포](#6-배포) 참조).
- `project_name`, `environment`, `aws_region`: 리소스 이름 지정 및 지역 배포용.
- `lambda_runtime`, `lambda_handler`, `lambda_code_path`: Lambda 함수 구성.
- `gemini_model_name`, `generator_verbose`: LLM 및 로깅 구성.

### 5.4 Lambda 레이어 빌드 프로세스

`layers/` 하위 디렉터리에 정의됨:

- `build-layer.sh`: Node.js 종속성 레이어를 빌드하는 스크립트.
    1. 이전 빌드 결과물을 정리합니다.
    2. `../../backend/lambdas/problem-generator-v3/`에서 `package.json` 및 `package-lock.json`을 임시 Docker 빌드 컨텍스트로 복사합니다.
    3. `Dockerfile.build`를 사용하여 Docker 이미지(`problem-generator-layer-builder`)를 빌드합니다.
    4. Dockerfile은 `/opt` 내부에 프로덕션 종속성(`npm ci --omit=dev`)을 설치한 다음 Lambda 레이어가 예상하는 대로 `/opt/nodejs/node_modules`로 이동시킵니다.
    5. Docker 컨테이너에서 `nodejs` 디렉터리(`node_modules` 포함)를 로컬 출력 디렉터리로 복사합니다.
    6. `nodejs` 디렉터리를 `problem_generator_deps.zip`으로 압축합니다.
- `Dockerfile.build`: `public.ecr.aws/lambda/nodejs:20-arm64` 기본 이미지를 사용합니다. 종속성을 설치하고 Lambda 레이어 호환성을 위해 구조화합니다.
- `layer.tf`의 `aws_lambda_layer_version` 리소스는 이 `problem_generator_deps.zip`을 사용합니다.
- `null_resource.build_lambda_layer`는 `package-lock.json`, 빌드 스크립트 또는 Dockerfile이 변경되면 `build-layer.sh` 스크립트를 트리거합니다.

---

## 6. 배포

### 6.1 전제 조건

- Terraform CLI 설치.
- AWS CLI 설치 및 적절한 자격 증명 및 리전으로 구성.
- Google AI API 키.
- `code-execution-service` 모듈이 먼저 배포되어야 하며, 해당 Lambda ARN이 이 모듈의 입력값입니다.
- `code-execution-service`가 `problems_table`의 ARN에 의존하는 경우 (예: `readme.md`에 설명된 순환 의존성), `problems_table`(이 모듈)이 먼저 배포되어야 합니다.

### 6.2 배포 단계

순환 의존성에 대한 자세한 논의는 `capstone-2025-04/infrastructure/problem-generator-v3/readme.md`를 참조하십시오. 이를 해결하기 위한 권장 흐름은 다음과 같습니다:

1. **`problem-generator-v3` 1차 배포 (부분):**
    - `variables.tf`에서 `code_executor_lambda_arn`을 임시로 더미 값으로 설정하거나 apply 시 빈 변수로 제공합니다.
    - `terraform init`
    - `terraform apply`
    - 이렇게 하면 `problems_table`이 생성되고 해당 ARN(`problems_table_arn`)이 출력됩니다.

2. **`code-execution-service` 배포:**
    - 이 모듈(파일에 제공되지 않았지만 존재한다고 가정)은 `data "terraform_remote_state"`를 사용하여 `problem-generator-v3` 상태에서 `problems_table_arn`을 읽습니다.
    - `code-execution-service` 모듈을 배포합니다.
    - 이렇게 하면 `code_executor_lambda_arn`이 출력됩니다.

3. **`problem-generator-v3` 2차 배포 (전체):**
    - 2단계에서 얻은 실제 `code_executor_lambda_arn` 값으로 `problem-generator-v3`의 `terraform.tfvars` 파일을 업데이트합니다.
    - `problem-generator-v3` 모듈에 대해 다시 `terraform apply`를 실행합니다.
    - 이렇게 하면 Problem Generator Lambda가 올바른 Code Executor ARN으로 업데이트됩니다.

**`infrastructure/problem-generator-v3/` 내 일반적인 Terraform 명령어:**

```bash
# Terraform 초기화 (백엔드 구성 변경 시 한 번 실행)
terraform init

# 특정 값으로 terraform.tfvars 생성 또는 업데이트
# 예: google_ai_api_key = "YOUR_KEY"
#       code_executor_lambda_arn = "ARN_FROM_CODE_EXEC_SERVICE_OUTPUT" (2차 apply 시)

# 변경 사항 계획
terraform plan

# 변경 사항 적용
terraform apply
# (프롬프트 표시 시 'yes'로 확인)

# 리소스 삭제 (필요한 경우)
terraform destroy
```

### 6.3 모듈 간 의존성

인프라 README에서 강조된 것처럼 잠재적인 순환 의존성이 있습니다:

- `problem-generator-v3`는 `code-execution-service`의 `code_executor_lambda_arn`이 필요합니다.
- `code-execution-service`는 `problem-generator-v3`의 `problems_table_arn`이 필요할 수 있습니다 (예: 실행 시도 로깅 또는 DB 액세스가 필요한 테스트 케이스 검증 단계에 직접 관여하는 경우).

위에 설명된 3단계 배포 프로세스는 `terraform_remote_state`를 사용하여 이를 처리하는 가장 강력한 방법입니다. 더 깔끔한 대안 아키텍처는 DynamoDB 테이블을 두 서비스 모듈이 모두 의존하는 별도의 공통 `database` 모듈로 추출하는 것입니다.

---

## 7. 로컬 개발 및 테스트 (백엔드)

`problem-generator-v3`용 백엔드 Lambda 코드는 `local-test.mjs` 스크립트를 사용하여 로컬에서 테스트할 수 있습니다.

### 7.1 설정

1. **Lambda 디렉터리로 이동:**

    ```bash
    cd capstone-2025-04/backend/lambdas/problem-generator-v3/
    ```

2. **종속성 설치:**

    ```bash
    npm install
    ```

3. **이 디렉터리에 `.env` 파일 생성**하고 Google AI API 키를 입력합니다:

    ```env
    # capstone-2025-04/backend/lambdas/problem-generator-v3/.env
    GOOGLE_AI_API_KEY="실제_Google_AI_API_키_입력"

    # 선택 사항: local-test.mjs 또는 constants.mjs의 기본값 재정의
    # MOCK_DYNAMODB=true # 또는 false
    # PROBLEMS_TABLE_NAME=alpaco-Problems-v3-dev
    # GEMINI_MODEL_NAME=gemini-1.5-flash-latest
    # CODE_EXECUTOR_LAMBDA_ARN="개발용_코드_실행기_ARN"
    ```

    `local-test.mjs` 스크립트는 이 `.env` 파일을 로드합니다.

### 7.2 로컬 테스트 실행

`local-test.mjs` 스크립트는 Lambda 환경 및 파이프라인 실행을 시뮬레이션합니다.

- **대화형 모드:** 사용자 입력(문제 프롬프트, 난이도 등) 및 DynamoDB 모드를 묻습니다.

    ```bash
    node local-test.mjs
    ```

- **자동 모드 (스크립트의 `sampleEvent` 사용):**
  - 기본 자동 모드 (인수, `.env`, 스크립트 기본값 순으로 `MOCK_DYNAMODB` 설정 사용):

        ```bash
        node local-test.mjs auto
        ```

  - Mock DynamoDB 강제 사용:

        ```bash
        node local-test.mjs mock
        # 또는
        node local-test.mjs auto mock
        ```

  - 실제 DynamoDB 강제 사용 (AWS 자격 증명 구성 필요):

        ```bash
        node local-test.mjs real
        # 또는
        node local-test.mjs auto real
        ```

**출력:**

- 콘솔 로그는 SSE와 유사한 상태 업데이트를 보여줍니다.
- 최종 생성된 문제(성공 시)는 `problem-gen-result-[타임스탬프].json`에 저장됩니다.

### 7.3 모의(Mocking) 처리

- **DynamoDB:** `process.env.MOCK_DYNAMODB`가 `'true'`로 설정된 경우 `local-test.mjs`는 모의 DynamoDB 구현(`mock-dynamodb.mjs`)을 사용할 수 있습니다. 이 모의 구현은 인메모리 시뮬레이션입니다.
- **Code Executor Lambda:** `codeExecutor.mjs` 유틸리티는 `CODE_EXECUTOR_LAMBDA_ARN`(`constants.mjs`에서 가져오며 `.env`로 재정의 가능)으로 지정된 실제 AWS Lambda를 호출합니다. AWS 없이 완전히 로컬에서 테스트하려면 이를 모의 처리하거나 로컬 Python 실행 하위 프로세스를 (이전 버전에서처럼) 다시 구현해야 합니다. **현재 Python 코드 실행을 위한 로컬 테스트는 여전히 배포된 AWS Code Executor Lambda에 의존합니다.**

---

## 8. API 사용법 (프론트엔드 관점)

`frontend/src/api/generateProblemApi.ts` 및 `frontend/src/app/coding-test/solve/page.tsx` 기반.

### 8.1 엔드포인트

- API 엔드포인트는 환경 변수 `NEXT_PUBLIC_PROBLEM_GENERATION_API_BASE_URL`을 통해 구성됩니다.
- 이 URL은 CloudFront 배포 도메인 이름(예: `d123abc.cloudfront.net`)을 가리킵니다.

### 8.2 인증

- Lambda 함수 URL은 `AWS_IAM` 인증으로 구성됩니다.
- CloudFront는 SigV4 서명을 사용하는 Origin Access Control(OAC)을 사용하여 Lambda 함수 URL을 안전하게 호출합니다.
- 프론트엔드는 AWS Amplify(`fetchAuthSession`)를 사용하여 사용자 자격 증명(예: Cognito ID 토큰, 임시 AWS 자격 증명으로 교환되거나 요청 서명에 사용됨)을 가져올 가능성이 높습니다.
- CloudFront 엔드포인트에 대한 요청은 Amplify가 직접 처리하지 않는 경우 적절한 AWS SigV4 헤더를 포함해야 하거나, Lambda URL 자체가 IAM으로 보호되고 CloudFront가 단순히 통과하는 경우 CloudFront가 IAM을 적용하도록 의존해야 합니다. `generateProblemApi.ts`의 `Authorization: Bearer ${idToken}` 및 `x-amz-content-sha256` 헤더는 클라이언트에서 직접 IAM 서명된 요청을 보내거나 CloudFront가 오리진에 대한 요청을 다시 서명하는 통과 메커니즘을 시사합니다. OAC `signing_behavior = "always"`이므로 CloudFront는 오리진(Lambda URL)에 대한 요청에 서명합니다. 클라이언트가 CloudFront 자체에 보내는 요청은 CloudFront WAF/동작 설정에 따라 IAM 인증되거나 공개될 수 있습니다.

### 8.3 요청

- **메서드:** `POST`
- **헤더:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <ID_TOKEN>` (Cognito가 클라이언트 인증에 사용되는 경우. OAC가 있는 직접 Lambda URL의 경우 CloudFront가 오리진에 대한 인증을 처리)
  - `x-amz-content-sha256`: 요청 페이로드의 SHA256 해시 (SigV4 표준).
- **본문 (`CreateProblemRequest`):**

    ```json
    {
      "prompt": "string (사용자 문제 아이디어)",
      "difficulty": "Easy" | "Medium" | "Hard", // 또는 프론트엔드 타입에 따라 "튜토리얼", "쉬움", "보통", "어려움"
      "creatorId": "string (선택 사항, 사용자 ID)",
      "author": "string (선택 사항, 사용자 표시 이름)"
    }
    ```

### 8.4 응답 (SSE 스트림)

API는 서버-전송 이벤트 스트림(`Content-Type: text/event-stream`)으로 응답합니다. 메시지 구조는 다음과 같습니다:

```
event: <이벤트_타입>
data: <JSON_페이로드>

```

- **`event: status`**
  - 페이로드 (`ProblemStreamStatus`):

        ```json
        {
          "step": number (현재 파이프라인 단계),
          "message": "string (상태 메시지)"
        }
        ```

- **`event: result`**
  - 페이로드 (`ProblemStreamResult` - `ProblemDetailAPI` 래핑):

        ```json
        {
          "payload": { /* ProblemDetailAPI 객체 */ }
        }
        ```

        `ProblemDetailAPI` 객체 포함 내용:
        `problemId`, `title`, `title_translated`, `description`, `description_translated`, `difficulty`, `constraints` (JSON 문자열), `solutionCode`, `startCode`, `finalTestCases` (테스트 케이스 배열의 JSON 문자열), `generationStatus`, `language`, `targetLanguage`, `createdAt`, `completedAt`, `userPrompt`, `errorMessage`, `validationDetails`, `creatorId`, `author`, `judgeType`, `epsilon`, `schemaVersion`.

- **`event: error`**
  - 페이로드 (`ProblemStreamError`):

        ```json
        {
          "payload": "string (오류 메시지)"
        }
        ```

생성이 완료되거나 치명적인 오류가 발생하면 스트림이 종료됩니다. 프론트엔드의 `onComplete` 콜백이 트리거됩니다.

---

## 9. 문제 해결 및 알려진 문제

### 9.1 일반적인 문제들

- **LLM 실패:**
  - **잘못된 형식의 JSON 출력:** LLM이 가끔 올바르게 파싱되지 않는 JSON을 생성할 수 있습니다. `intentAnalysis` 체인에는 일부 복구 로직(`cleanJsonOutput`)이 있습니다. 이를 최소화하기 위해 새로운 체인에는 LangChain의 구조화된 출력 기능(`withStructuredOutput`)을 사용하는 것이 좋습니다.
  - **비어 있거나 유효하지 않은 콘텐츠:** LLM이 빈 문자열이나 의미 없는 콘텐츠를 반환할 수 있습니다. `pipeline.mjs`의 재시도 메커니즘이 이를 완화하려고 시도합니다.
  - **API 속도 제한/오류:** Google AI API 키가 유효하고 충분한 할당량을 가지고 있는지 확인합니다.

- **배포 문제:**
  - **순환 의존성:** `problem-generator-v3`와 `code-execution-service`가 서로의 출력에 의존하는 경우 3단계 배포 프로세스를 주의 깊게 따릅니다.
  - **IAM 권한:** 잘못된 IAM 정책은 Lambda 함수가 DynamoDB에 액세스하거나 다른 Lambda를 호출하거나 로그를 작성하려고 할 때 액세스 거부 오류를 발생시킬 수 있습니다. `iam.tf`의 정책을 다시 확인합니다.

- **설정:**
  - `GOOGLE_AI_API_KEY`는 Lambda 환경 변수(Terraform을 통해)에 올바르게 설정되어야 합니다.
  - `CODE_EXECUTOR_LAMBDA_ARN`은 올바르게 배포되고 작동하는 Code Executor Lambda를 가리켜야 합니다.

### 9.2 V3 특정 문제들

- **검증 실패 처리:**
  - **해결됨**: 이전에 검증 실패 시 자동으로 "Pass"를 반환하던 fallback 로직이 제거되었습니다.
  - **현재**: 검증 실패 시 `regenerateBasedOnValidationFeedback()` 함수를 통해 지능적으로 재생성하거나 적절히 실패 처리합니다.

- **피드백 루프 무한 반복:**
  - **위험**: 재생성이 계속 실패할 경우 `MAX_RETRIES`에 도달할 때까지 반복
  - **완화**: 각 단계별 품질 검증 함수로 사전 검증, 구체적인 피드백 제공으로 개선 방향 명확화

- **창의적 컨텍스트 과도한 적용:**
  - **위험**: 테마 요소가 알고리즘적 복잡성을 희석시킬 수 있음
  - **완화**: Description Generation에서 기술적 요구사항과 창의성의 균형 유지

### 9.3 코드 실행 관련

- **시간 초과:** 생성 또는 실행에 너무 오랜 시간이 걸리면 Code Executor Lambda 또는 Problem Generator Lambda 자체가 시간 초과될 수 있습니다. 테스트 케이스당 솔루션 실행에는 `EXECUTION_TIMEOUT_MS`가 있습니다.
- **Python 환경:** 생성된 솔루션에 필요한 라이브러리가 있는 경우 Code Executor Lambda의 Python 환경에 해당 라이브러리가 있어야 합니다 (현재 프롬프트는 표준 라이브러리 솔루션을 목표로 함).

### 9.4 로컬 테스트

- `.env` 파일은 `backend/lambdas/problem-generator-v3/`에 올바르게 구성되어야 합니다.
- Python 코드의 로컬 실행(4.a 단계)은 *여전히 배포된 AWS Code Executor Lambda에 의존합니다*. 완전히 오프라인으로 로컬 Python 실행을 하려면 `codeExecutor.mjs`에 로컬 Python 하위 프로세스 실행기를 구현해야 합니다.

### 9.5 네트워크 및 스트림

- **SSE 스트림 중단:** 네트워크 문제로 인해 SSE 스트림이 중단될 수 있습니다. 프론트엔드는 필요한 경우 재연결을 처리해야 합니다 (제공된 `generateProblemApi.ts`에는 명시적으로 구현되어 있지 않음).

---

## 10. 향후 개선사항 및 TODO

### 10.1 ✅ 완료된 개선사항 (V3 업데이트)

- ✅ **검증 실패 수정**: Fallback 로직 제거, 적절한 재생성 메커니즘 구현
- ✅ **지능적 피드백 시스템**: `regenerateBasedOnValidationFeedback()`와 `analyzeFeedbackAndDetermineActions()` 구현
- ✅ **창의적 컨텍스트 지원**: Intent Analysis와 Description Generation 간의 통합된 테마 처리
- ✅ **품질 검증 함수**: `validateIntentQuality()`, `validateTestSpecsQuality()`, `validateSolutionCodeQuality()` 추가
- ✅ **피드백 파라미터 통합**: 모든 주요 체인에 `feedback_section` 파라미터 추가

### 10.2 🔄 진행 중인 개선사항

- **API 문서화**: 새로운 기능들에 대한 문서 업데이트 (현재 진행 중)
- **테스트 커버리지**: 새로운 피드백 시스템과 창의적 컨텍스트 처리에 대한 테스트 추가

### 10.3 🚀 향후 계획

#### 10.3.1 핵심 기능 개선

- **다중 언어 지원 확장**:
  - JavaScript, Java, C++ 등 추가 프로그래밍 언어 지원
  - 언어별 최적화된 솔루션 생성 및 실행

- **동적 난이도 조정**:
  - 사용자의 이전 풀이 기록을 바탕으로 난이도 자동 조정
  - 실시간 난이도 스케일링

- **향상된 에지 케이스 생성**:
  - LLM 기반 에지 케이스 자동 생성 개선
  - 업계 표준 알고리즘 문제 패턴 분석

#### 10.3.2 성능 및 안정성

- **캐싱 메커니즘**:
  - 유사한 요청에 대한 결과 캐싱
  - 중간 단계 결과 캐싱으로 재생성 시 성능 향상

- **병렬 처리**:
  - 여러 솔루션 후보 동시 생성 및 최적해 선택
  - 테스트 케이스 병렬 실행

- **로드 밸런싱**:
  - 다중 LLM 모델 사용으로 부하 분산
  - API 호출 제한 및 큐잉 시스템

#### 10.3.3 사용자 경험

- **실시간 미리보기**:
  - 생성 중간 단계에서 부분 결과 미리보기 제공
  - 사용자 피드백 기반 실시간 조정

- **문제 템플릿 시스템**:
  - 사전 정의된 문제 패턴과 변형 시스템
  - 사용자 맞춤형 문제 생성

- **협업 기능**:
  - 팀 기반 문제 생성 및 검토
  - 커뮤니티 기반 문제 개선

#### 10.3.4 기술적 개선

- **완전한 로컬 개발 환경**:
  - AWS 의존성 없는 완전한 로컬 테스트 환경 구축
  - Docker 기반 로컬 Code Executor 구현

- **모니터링 및 관찰성**:
  - 상세한 메트릭 수집 및 분석
  - 실시간 성능 모니터링 대시보드
  - 오류 패턴 분석 및 자동 알림

- **보안 강화**:
  - 코드 실행 샌드박스 보안 강화
  - 사용자 입력 검증 및 필터링 개선
  - API 호출 횟수 제한 및 남용 방지

#### 10.3.5 AI/ML 기능 확장

- **개인화된 문제 생성**:
  - 사용자의 학습 패턴 분석을 통한 맞춤형 문제 생성
  - 약점 분야 집중 문제 생성

- **자동 힌트 시스템**:
  - 문제 해결 과정에서 적응형 힌트 제공
  - 학습 진도에 맞는 단계별 가이드

- **코드 품질 분석**:
  - 생성된 솔루션의 최적화 수준 평가
  - 대안 솔루션 자동 생성 및 비교

### 10.4 📋 기술 부채 및 리팩토링

- **코드 구조 개선**:
  - 체인 모듈 간 의존성 정리
  - 공통 유틸리티 함수 추출 및 재사용성 개선

- **에러 핸들링 표준화**:
  - 일관된 에러 메시지 형식
  - 구체적인 복구 전략 문서화

- **테스트 자동화**:
  - 통합 테스트 및 E2E 테스트 확장
  - 성능 벤치마크 테스트 추가

### 10.5 🔧 인프라 개선

- **다중 환경 지원**:
  - 개발/스테이징/프로덕션 환경 분리
  - 환경별 독립적인 배포 파이프라인

- **순환 의존성 해결**:
  - 공통 데이터베이스 모듈 분리
  - 서비스 간 의존성 최소화

- **비용 최적화**:
  - 사용량 기반 자동 스케일링
  - 리소스 사용량 모니터링 및 최적화

---

## 11. 결론

Problem Generator V3는 대규모 언어 모델(LLM), 특히 LangChain 프레임워크를 통해 Google의 Gemini 모델을 사용하여 프로그래밍 문제를 자동으로 생성하도록 설계된 AWS 기반 서버리스 애플리케이션입니다. V3의 핵심 기능은 생성된 솔루션을 검증하고 정확한 테스트 출력을 결정하기 위해 실제 코드 실행에 의존하여 이전 버전에 비해 안정성을 크게 향상시킨다는 점입니다.

**최신 V3 개선사항**으로는 검증 실패 시 적절한 재생성을 통한 안정성 향상, 지능적 피드백 시스템을 통한 품질 개선, 그리고 창의적 요청 (테마가 있는 문제) 처리 능력이 추가되었습니다.

### 주요 성과

1. **안정성 향상**: 검증 실패 시 자동으로 "Pass"를 반환하던 fallback 로직을 제거하고, 지능적인 재생성 메커니즘을 구현하여 부정확한 결과가 통과되는 문제를 해결했습니다.

2. **품질 개선**: 각 생성 단계에서 품질 검증 함수를 도입하고, 구체적인 피드백을 기반으로 관련 컴포넌트만 선택적으로 재생성하는 시스템을 구축했습니다.

3. **창의성 지원**: 테마가 있는 창의적 요청을 이해하고 적절히 반영하는 기능을 추가하여 사용자 경험을 개선했습니다.

4. **확장성**: 모듈식 아키텍처와 체계적인 피드백 시스템을 통해 향후 추가 기능 개발과 유지보수가 용이한 구조를 구축했습니다.

### 기술적 혁신

- **지능적 피드백 시스템**: `regenerateBasedOnValidationFeedback()`와 `analyzeFeedbackAndDetermineActions()` 함수를 통한 맞춤형 재생성
- **창의적 컨텍스트 처리**: Intent Analysis와 Description Generation 간의 통합된 테마 처리
- **품질 보증**: 각 단계별 품질 검증 함수를 통한 사전 검증 및 개선
- **실행 기반 검증**: 실제 코드 실행을 통한 정확한 테스트 출력 생성

### 향후 전망

Problem Generator V3는 현재의 개선사항을 바탕으로 다중 언어 지원, 개인화된 문제 생성, 실시간 미리보기 등의 고급 기능으로 확장될 예정입니다. 지속적인 모니터링과 피드백을 통해 더욱 정확하고 창의적인 문제 생성 서비스로 발전해 나갈 것입니다.

이 문서는 Problem Generator V3의 현재 상태와 최신 개선사항을 종합적으로 다루며, 개발자들이 시스템을 이해하고 활용하는 데 필요한 모든 정보를 제공합니다. 추가적인 질문이나 개선 제안이 있으시면 프로젝트 팀에 문의해 주시기 바랍니다.

---

**문서 버전**: 2.0 (Updated for V3 Improvements)  
**최종 업데이트**: 2025년 1월 20일  
**작성자**: ALPACO 개발팀
