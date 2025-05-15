---
layout: default
title: "👋 안녕하세요!"
nav_order: 1
description: "ALPACO 프로젝트 문서에 오신 것을 환영합니다"
permalink: /documents/greeting/
---
# 👋 안녕하세요! ALPACO 프로젝트 문서에 오신 것을 환영합니다

이 문서는 ALPACO 프로젝트의 방대한 문서들을 쉽게 탐색하고 원하는 정보를 빠르게 찾을 수 있도록 도와드리는 안내서입니다. 저희는 ALPACO를 이해하고, 사용하고, 개발하고, 운영하는 데 필요한 모든 정보를 체계적으로 정리해두었습니다.

아래 목차를 통해 관심 있는 분야의 문서를 찾아보세요!

## 🌟 프로젝트 전체 소개

ALPACO 프로젝트가 무엇인지, 어떤 목표를 가지고 있는지, 주요 기능과 전체 시스템 아키텍처, 그리고 사용된 기술 스택에 대한 전반적인 개요를 확인하고 싶으시다면 다음 문서를 참고하세요.

* **[🏠 ALPACO 프로젝트 메인 페이지](../index.md)**: 프로젝트의 시작점입니다. ALPACO의 비전과 핵심 가치를 담고 있습니다.

## 🙋‍♀️ 사용자를 위한 가이드

ALPACO 플랫폼을 직접 사용해보고 싶으신가요? 다음 문서는 회원가입부터 주요 기능 사용법까지 친절하게 안내해 드립니다.

* **[🚀 ALPACO 사용자 매뉴얼](./serving/howtouser.md)**:
  * 플랫폼 접속 및 구글 로그인 방법
  * AI를 이용한 코딩 문제 생성하기
  * 코딩 테스트 문제 풀이 (코드 에디터 사용, AI 헬퍼 활용, 코드 제출 및 채점)
  * 채점 결과 확인 및 풀이 공유
  * 커뮤니티 기능 활용 (게시글 작성, 댓글, 좋아요)
  * 내가 생성한 문제 관리 (내 저장소) 및 전체 제출 현황 보기

## 🧑‍💻 개발자를 위한 가이드

ALPACO 개발에 참여하거나, 시스템의 기술적인 부분을 더 깊이 이해하고 싶으신 분들을 위한 문서입니다.

### 🖥️ 프론트엔드 (Application)

ALPACO의 사용자 인터페이스를 구성하는 프론트엔드 애플리케이션에 대한 상세 가이드입니다.

* **[🎨 프론트엔드 애플리케이션 가이드](./deployment/application.md)**:
  * Next.js, TypeScript, Tailwind CSS 등 주요 기술 스택 소개
  * 로컬 개발 환경 설정 및 실행 방법
  * 프로덕션 빌드 및 AWS S3/CloudFront를 이용한 배포 전략
  * GitHub Actions를 활용한 CI/CD 파이프라인 설명

### ⚙️ 백엔드 (Lambda 마이크로서비스)

ALPACO의 핵심 로직을 담당하는 AWS Lambda 기반 마이크로서비스 아키텍처(MSA) 및 각 서비스별 상세 개발 가이드입니다.

* **[🏗️ MSA Lambda 개발 가이드](./deployment/backendLambda.md)**:
  * ALPACO 프로젝트의 MSA 원칙 및 Lambda 함수 설계 패턴
  * 서비스 간 통신 방법 (API Gateway, Lambda 직접 호출, SSE 스트리밍)
  * 데이터 관리 (DynamoDB) 전략 및 Lambda Layer 활용법
  * 로컬 개발 및 테스트 환경 구성

* **각 마이크로서비스 상세 API 명세 및 기술 가이드:**
  * **[🤖 AI 챗봇 (Chatbot)](./deployment/services/chatbot.md)**: 사용자 문제 풀이를 돕는 AI 챗봇 서비스의 아키텍처, API 엔드포인트, 인증 방식 및 배포 방법을 설명합니다.
  * **[⚖️ 코드 실행 및 채점 서비스 (Code Execution Service)](./deployment/services/code-execution-service.md)**: 사용자가 제출한 코드를 안전하게 실행하고 채점하는 `code-executor` 및 `code-grader` Lambda의 아키텍처, API, 데이터 모델을 다룹니다.
  * **[🗣️ 커뮤니티 API (Community API)](./deployment/services/community.md)**: 게시물, 댓글, 좋아요 등 커뮤니티 기능을 제공하는 API의 엔드포인트, 데이터 모델, Lambda 함수 및 배포 방법을 안내합니다.
  * **[🧩 문제 생성 서비스 V3 (Problem Generator V3)](./deployment/services/gen-problem.md)**: LLM을 이용해 코딩 문제를 동적으로 생성하는 서비스의 아키텍처, 핵심 파이프라인, 인프라 및 API 사용법을 상세히 설명합니다.
  * **[📚 문제 API (Problems API)](./deployment/services/problem.md)**: 생성된 코딩 문제 정보를 조회하는 API의 엔드포인트, 데이터 모델, Lambda 함수 및 배포 방법을 안내합니다.
  * **[💾 제출 API (Submissions API)](./deployment/services/submission.md)**: 사용자의 코드 제출 기록을 조회하는 API의 엔드포인트, Lambda 함수, 프론트엔드 연동 방식 및 배포 방법을 설명합니다.

### ☁️ 인프라 (Infrastructure as Code - Terraform)

ALPACO 플랫폼을 구성하는 모든 AWS 인프라를 코드로 관리(IaC)하는 방법에 대한 포괄적인 가이드입니다.

* **[🛠️ Terraform 인프라 사용 가이드](./deployment/InfrastructureAsCode.md)**:
  * Terraform을 사용한 AWS 인프라 배포 및 관리의 핵심 원칙
  * 원격 상태 관리 (S3, DynamoDB) 설정 (`backend-setup` 모듈)
  * 각 서비스 모듈(Cognito, App, API, Chatbot 등)별 배포 지침 및 순서
  * CI/CD 통합 및 시크릿 관리 전략

## 🛠️ 운영자를 위한 가이드

ALPACO 플랫폼의 안정적인 운영 및 관리를 책임지는 분들을 위한 매뉴얼입니다.

* **[⚙️ ALPACO 플랫폼 운영 매뉴얼](./serving/howtoadmin.md)**:
  * 시스템 상태 및 로그 모니터링 (CloudWatch)
  * 데이터 관리 (DynamoDB - 문제, 커뮤니티, 제출 데이터)
  * 사용자 관리 (Amazon Cognito)
  * 애플리케이션 접근 및 도메인 관리 (Route 53, ACM, CloudFront)
  * 프론트엔드 애플리케이션 호스팅 (S3) 관리
  * 일반적인 문제 해결 팁 및 보안 모범 사례

## 🎨 사이트 구성 및 로고

이 문서 사이트 자체의 구성과 사용된 로고에 대한 정보입니다.

* **[📜 사이트 설정 파일 (`_config.yml`)](../_config.yml)**: 이 문서 사이트(Just the Docs 테마)의 제목, 설명, 로고 경로 등 기본 설정을 담고 있습니다.
* **[🖼️ 로고 에셋 폴더 (`assets/`)](../assets/)**: 문서 및 애플리케이션에 사용되는 로고 SVG 파일(`alpaco_full_logo.svg`, `alpaco_square_logo_blue.svg`)과 기타 이미지(`logo.png` 등)가 저장되어 있습니다.

---

ALPACO 프로젝트 문서가 여러분께 유용한 정보를 제공하고, 프로젝트를 더 깊이 이해하는 데 도움이 되기를 바랍니다. 궁금한 점이 있다면 주저하지 말고 관련 문서를 찾아보거나 문의해 주세요!
