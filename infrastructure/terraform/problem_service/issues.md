# 인프라 배포 문서

이 문서는 Alpaco 프로젝트의 문제 서비스 인프라 설정과 배포 중 발생했던 문제 해결 과정을 설명합니다.

## 개요

인프라는 Terraform을 사용하여 관리되며 다음과 같은 주요 구성 요소로 이루어집니다:

- **네트워킹:** VPC, 퍼블릭/프라이빗 서브넷, 인터넷 게이트웨이, 라우트 테이블, 보안 그룹.
- **컴퓨팅:**
  - AWS Lambda 함수 (Problem Grader, Problem Generator Streaming)
  - AWS ECS 클러스터 및 Fargate 작업 (Generator, Runner)
- **스토리지:** DynamoDB 테이블 (Problems, Submissions), S3 버킷 (Grader Output).
- **API:** API Gateway (Grader용 HTTP API, Streaming Generator용 WebSocket API).
- **오케스트레이션:** Step Functions 상태 머신 (Problem Grader).
- **컨테이너 레지스트리:** 컨테이너 이미지용 ECR 리포지토리.
- **IAM:** 서비스 간 안전한 접근을 위한 역할 및 정책.

## 배포 (`problem_service`)

문제 채점 서비스를 위한 핵심 인프라는 `terraform/problem_service` 디렉토리에 정의되어 있습니다.

인프라를 배포하거나 업데이트하려면:

1.  `infrastructure/terraform/problem_service` 디렉토리로 이동합니다.
2.  (처음이거나 공급자/백엔드 변경 후) `terraform init`을 실행합니다.
3.  `terraform plan`을 실행하여 변경 사항을 미리 봅니다.
4.  `terraform apply`를 실행하여 변경 사항을 적용합니다.

## 문제 해결 기록

초기 배포 중 다음과 같은 몇 가지 문제가 발생하여 해결했습니다:

1.  **예약된 환경 변수 (`AWS_REGION`):**

    - **오류:** 예약된 변수인 `AWS_REGION`이 Lambda 환경 변수에 설정되어 `terraform apply`가 실패했습니다.
    - **해결:** `api_lambda.tf`의 `environment.variables` 블록에서 `AWS_REGION`을 제거했습니다.

2.  **선언되지 않은 서브넷 리소스:**

    - **오류:** `locals.tf`에서 `aws_subnet.private_subnet_a` 및 `aws_subnet.private_subnet_c`에 대한 "Reference to undeclared resource" 오류로 `terraform apply`가 실패했습니다.
    - **해결:** `network.tf`에 `aws_subnet.private_subnet_a`, `aws_subnet.private_subnet_c` 및 관련 라우트 테이블/연결 정의를 추가했습니다.

3.  **Lambda 소스 이미지를 찾을 수 없음 (초기):**

    - **오류:** `generator_streaming_lambda` 생성 시 `InvalidParameterValueException: Source image ...:latest does not exist.` 오류로 `terraform apply`가 실패했습니다.
    - **진단:** `aws ecr describe-images`를 사용하여 ECR을 확인하고 `latest` 태그가 있는 이미지가 없음을 확인했습니다.
    - **해결:** `backend/lambdas/problem-generator-streaming/` 디렉토리에 `Dockerfile`을 생성했습니다. 해당 ECR 리포지토리(`alpaco/problem-generator-streaming-dev`)에 Docker 이미지를 빌드하고 `latest` 태그로 푸시했습니다.

4.  **Lambda 소스 이미지 미디어 타입 미지원:**

    - **오류:** 이미지를 푸시한 후에도 `InvalidParameterValueException: The image manifest, config or layer media type for the source image ...:latest is not supported.` 오류로 `terraform apply`가 실패했습니다. 이 오류는 로컬에서 `--platform linux/amd64`로 빌드하고 `Dockerfile`을 수정(표준 파이썬 이미지 + RIC 사용)했을 때도 지속되었으며, AWS 콘솔에서 수동으로 Lambda 함수를 생성할 때도 동일한 오류가 발생했습니다.
    - **진단:** 올바른 플랫폼을 지정했음에도 불구하고 로컬 Docker 빌드 환경(macOS/Docker Desktop)과 AWS Lambda가 예상하는 이미지 형식 간의 비호환성 문제로 추정되었습니다.
    - **해결:** Lambda 실행 환경과 더 유사한 Linux 환경을 제공하는 **AWS CloudShell**을 사용하여 Docker 이미지를 빌드하고 푸시했습니다. 이를 통해 미디어 타입 비호환성 문제가 해결되었습니다.

5.  **Lambda 소스 이미지를 찾을 수 없음 (Destroy/재푸시 후):**

    - **오류:** `terraform destroy` (수동 ECR 리포지토리 삭제 포함) 후 CloudShell에서 이미지를 다시 푸시한 다음 `terraform apply`를 실행했을 때 "Source image ... does not exist" 오류가 다시 발생했습니다.
    - **진단:** `aws ecr describe-images`로 ECR을 확인한 결과 `:latest` 태그 이미지가 실제로 다시 누락된 것을 확인했습니다. 이는 CloudShell에서의 이미지 푸시 문제 또는 이전 단계에 대한 오해를 나타냅니다. 추가 조사 결과 Lambda 실행 역할에 필요한 ECR 권한이 누락된 것으로 밝혀졌습니다.
    - **해결:** `iam.tf`의 `generator_streaming_lambda_policy`에 ECR 권한(`ecr:GetDownloadUrlForLayer`, `ecr:BatchGetImage`, `ecr:BatchCheckLayerAvailability`)을 추가했습니다. `apply` 실행 전에 CloudShell에서 이미지를 다시 푸시(성공 확인)했습니다.

6.  **API Gateway 스테이지 생성 실패 (CloudWatch Logs 역할):**
    - **오류:** `generator_streaming_stage` 생성 시 `BadRequestException: CloudWatch Logs role ARN must be set in account settings to enable logging` 오류로 `terraform apply`가 실패했습니다.
    - **진단:** 대상 리전(`ap-northeast-2`)의 AWS 계정 API Gateway 설정에 CloudWatch Logs IAM 역할이 구성되어 있지 않았으며, 이는 Terraform에서 스테이지 로깅을 활성화할 때 필요합니다.
    - **해결:** AWS Management Console을 통해 `ap-northeast-2` 리전의 API Gateway 설정에서 CloudWatch Logs 역할 ARN을 수동으로 구성했습니다. 이는 계정/리전 수준의 일회성 설정입니다.

## 현재 상태

위 문제들을 해결하여 현재 인프라 배포가 **성공**했습니다.
