---
layout: default
title: "🔌 마이크로서비스 API"
parent: "🧑‍💻 개발 가이드"
has_children: true
nav_order: 4
description: "ALPACO 마이크로서비스 API 가이드"
permalink: /documents/deployment/services/
---

# 🔌 마이크로서비스 API 상세 가이드

ALPACO 플랫폼의 각 마이크로서비스에 대한 상세 API 명세 및 기술 가이드입니다.

## 각 마이크로서비스 상세 API 명세 및 기술 가이드:

* **[🤖 AI 챗봇 (Chatbot)](./chatbot)**: 사용자 문제 풀이를 돕는 AI 챗봇 서비스의 아키텍처, API 엔드포인트, 인증 방식 및 배포 방법을 설명합니다.
* **[⚖️ 코드 실행 및 채점 서비스 (Code Execution Service)](./code-execution-service)**: 사용자가 제출한 코드를 안전하게 실행하고 채점하는 `code-executor` 및 `code-grader` Lambda의 아키텍처, API, 데이터 모델을 다룹니다.
* **[🗣️ 커뮤니티 API (Community API)](./community)**: 게시물, 댓글, 좋아요 등 커뮤니티 기능을 제공하는 API의 엔드포인트, 데이터 모델, Lambda 함수 및 배포 방법을 안내합니다.
* **[🧩 문제 생성 서비스 V3 (Problem Generator V3)](./gen-problem)**: LLM을 이용해 코딩 문제를 동적으로 생성하는 서비스의 아키텍처, 핵심 파이프라인, 인프라 및 API 사용법을 상세히 설명합니다.
* **[📚 문제 API (Problems API)](./problem)**: 생성된 코딩 문제 정보를 조회하는 API의 엔드포인트, 데이터 모델, Lambda 함수 및 배포 방법을 안내합니다.
* **[💾 제출 API (Submissions API)](./submission)**: 사용자의 코드 제출 기록을 조회하는 API의 엔드포인트, Lambda 함수, 프론트엔드 연동 방식 및 배포 방법을 설명합니다. 