---
layout: default
title: "🧑‍💻 개발 가이드"
nav_order: 3
has_children: true
description: "ALPACO 개발 가이드"
permalink: /documents/deployment/
---

# 🧑‍💻 개발자를 위한 가이드

ALPACO 개발에 참여하거나, 시스템의 기술적인 부분을 더 깊이 이해하고 싶으신 분들을 위한 문서입니다.

## 🖥️ 프론트엔드 (Application)

* **[🎨 프론트엔드 애플리케이션 가이드](./application)**:
  * Next.js, TypeScript, Tailwind CSS 등 주요 기술 스택 소개
  * 로컬 개발 환경 설정 및 실행 방법
  * 프로덕션 빌드 및 AWS S3/CloudFront를 이용한 배포 전략
  * GitHub Actions를 활용한 CI/CD 파이프라인 설명

## ⚙️ 백엔드 (Lambda 마이크로서비스)

* **[🏗️ MSA Lambda 개발 가이드](./backendLambda)**:
  * ALPACO 프로젝트의 MSA 원칙 및 Lambda 함수 설계 패턴
  * 서비스 간 통신 방법 (API Gateway, Lambda 직접 호출, SSE 스트리밍)
  * 데이터 관리 (DynamoDB) 전략 및 Lambda Layer 활용법
  * 로컬 개발 및 테스트 환경 구성

## ☁️ 인프라 (Infrastructure as Code - Terraform)

* **[🛠️ Terraform 인프라 사용 가이드](./InfrastructureAsCode)**:
  * Terraform을 사용한 AWS 인프라 배포 및 관리의 핵심 원칙
  * 원격 상태 관리 (S3, DynamoDB) 설정 (`backend-setup` 모듈)
  * 각 서비스 모듈(Cognito, App, API, Chatbot 등)별 배포 지침 및 순서
  * CI/CD 통합 및 시크릿 관리 전략 