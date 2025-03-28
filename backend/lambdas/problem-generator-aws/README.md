# Problem Generator AWS 서버리스 구현

이 프로젝트는 알고리즘 문제 생성기(Problem Generator)를 AWS 서버리스 환경에서 운영하기 위한 구현체입니다. SQS와 S3를 활용하여 비동기 처리 파이프라인을 구성하였습니다.

## 목차

- [아키텍처 설명](#아키텍처-설명)
- [시스템 구성 요소](#시스템-구성-요소)
- [설치 및 설정](#설치-및-설정)
- [로컬 테스트](#로컬-테스트)
- [AWS 배포 방법](#aws-배포-방법)
- [API 사용 방법](#api-사용-방법)
- [문제 해결](#문제-해결)

## 아키텍처 설명

이 시스템은 다음과 같은 아키텍처로 구성되어 있습니다:

```
+----------------+      +------+      +--------------------+      +------+
| API Gateway    | ---> | SQS  | ---> | Lambda (Generator) | ---> | S3   |
+----------------+      +------+      +--------------------+      +------+
       |                    ㅅ
       v                    |
+--------------------+     |
| Lambda (Request)   | -----
+--------------------+
```

### 처리 흐름

1. **요청 처리 단계**:

   - API Gateway를 통해 사용자로부터 문제 생성 요청 수신
   - Lambda(Request Handler)가 요청을 검증하고 SQS 큐에 작업 등록
   - 사용자에게 작업 ID와 추후 결과를 확인할 수 있는 URL 반환

2. **문제 생성 단계**:
   - Lambda(Problem Generator)가 SQS 큐에서 작업을 가져와 처리
   - LLM을 이용하여 알고리즘 문제를 생성
   - 생성된 문제를 S3에 저장
   - 처리 완료된 메시지를 SQS에서 삭제

이 아키텍처는 다음과 같은 이점을 제공합니다:

- **확장성**: 요청이 증가하더라도 SQS를 통한 버퍼링으로 안정적인 처리 가능
- **비용 효율성**: 서버리스 아키텍처로 필요한 경우에만 자원 사용
- **견고성**: 문제 생성 실패 시에도 시스템 전체 안정성 유지
- **분리된 관심사**: 요청 처리와 문제 생성 로직의 분리

## 시스템 구성 요소

### 핵심 컴포넌트

1. **Request Handler Lambda**

   - 사용자 요청 검증
   - 작업 ID 생성
   - SQS 메시지 등록

2. **Problem Generator Lambda**

   - SQS 메시지 처리
   - LLM 연동을 통한 문제 생성
   - S3에 결과 저장

3. **AWS 서비스**
   - **Amazon SQS**: 작업 대기열 관리
   - **Amazon S3**: 생성된 문제 저장
   - **Amazon API Gateway**: API 엔드포인트 제공

### 파일 구조

```
problem-generator-aws/
├── config.py               # 설정 파일
├── local_simulate.py       # 로컬 테스트 스크립트
├── requirements.txt        # 의존성 패키지 목록
├── lambdas/
│   ├── request_handler/    # 요청 처리 Lambda
│   │   └── lambda_function.py
│   └── problem_generator/  # 문제 생성 Lambda
│       └── lambda_function.py
└── utils/
    └── aws_utils.py        # AWS 서비스 유틸리티 함수
```

## 설치 및 설정

### 사전 요구사항

- Python 3.8 이상
- AWS CLI (로컬 테스트 및 배포용)
- Docker 및 Docker Compose (LocalStack 실행용)

### Docker 설치

#### macOS

```bash
# Homebrew를 이용한 설치
brew install --cask docker

# Docker 실행
open /Applications/Docker.app
```

#### Ubuntu/Debian

```bash
# 필요한 패키지 설치
sudo apt-get update
sudo apt-get install docker.io docker-compose

# Docker 서비스 실행
sudo systemctl start docker
sudo systemctl enable docker

# 사용자를 docker 그룹에 추가 (sudo 없이 실행하기 위해)
sudo usermod -aG docker $USER
```

#### Windows

1. [Docker Desktop for Windows](https://hub.docker.com/editions/community/docker-ce-desktop-windows/)에서 설치 파일을 다운로드하여 실행
2. WSL2 지원을 활성화하라는 안내에 따라 설정

### 의존성 패키지 설치

```bash
pip install -r requirements.txt
```

### 환경 변수 설정

프로젝트의 루트 디렉토리에 `.env` 파일을 생성하고 다음 설정을 추가하세요:

```bash
# Google AI API 키 설정 (필수)
export GOOGLE_AI_API_KEY="your-api-key-here"

# 로컬 테스트용 설정
export IS_LOCAL="true"
export LOCALSTACK_HOSTNAME="localhost"
export LOCALSTACK_PORT="4566"
```

## 로컬 테스트

### LocalStack 시작

docker-compose를 사용하여 LocalStack을 실행할 수 있습니다:

```bash
# docker-compose.yml 파일이 있는 디렉토리에서 실행
docker-compose up -d
```

또는 Docker 명령어를 직접 사용할 수도 있습니다:

```bash
docker run --rm -it -p 4566:4566 -p 4571:4571 localstack/localstack
```

### AWS 리소스 초기화

```bash
python local_simulate.py --setup
```

### 문제 생성 요청 테스트

```bash
# 기본 옵션으로 실행
python local_simulate.py

# 특정 알고리즘 및 난이도 지정
python local_simulate.py -a "그래프" -d "보통"

# API 키 직접 지정
python local_simulate.py -a "다이나믹 프로그래밍" -d "어려움" -k "your-api-key"
```

## AWS 배포 방법

### Lambda 함수 패키징

```bash
# Lambda 레이어용 패키지 생성
mkdir -p package/python
pip install -r requirements.txt -t package/python
cd package && zip -r ../lambda-layer.zip python/ && cd ..

# Lambda 함수 코드 패키징
mkdir -p deployment
cp -r lambdas utils config.py *.py deployment/
cd deployment && zip -r ../request-handler.zip lambdas/request_handler/ utils/ config.py && cd ..
cd deployment && zip -r ../problem-generator.zip lambdas/problem_generator/ utils/ config.py && cd ..
```

### AWS CLI를 이용한 수동 배포

1. **Lambda 레이어 생성**:

```bash
aws lambda publish-layer-version \
    --layer-name problem-generator-dependencies \
    --zip-file fileb://lambda-layer.zip \
    --compatible-runtimes python3.8 python3.9
```

2. **IAM 역할 생성**:

AWS 콘솔에서 Lambda 함수에 필요한 권한을 가진 IAM 역할을 생성하세요:

- AWSLambdaBasicExecutionRole
- AmazonSQSFullAccess
- AmazonS3FullAccess

3. **Lambda 함수 생성**:

```bash
# 요청 처리 Lambda
aws lambda create-function \
    --function-name problem-request-handler \
    --runtime python3.9 \
    --handler lambdas.request_handler.lambda_function.handler \
    --role arn:aws:iam::<YOUR_ACCOUNT_ID>:role/<YOUR_ROLE_NAME> \
    --zip-file fileb://request-handler.zip \
    --layers arn:aws:lambda:<YOUR_REGION>:<YOUR_ACCOUNT_ID>:layer:problem-generator-dependencies:<VERSION> \
    --timeout 10 \
    --memory-size 128 \
    --environment "Variables={GOOGLE_AI_API_KEY=<YOUR_API_KEY>}"

# 문제 생성 Lambda
aws lambda create-function \
    --function-name problem-generator-worker \
    --runtime python3.9 \
    --handler lambdas.problem_generator.lambda_function.handler \
    --role arn:aws:iam::<YOUR_ACCOUNT_ID>:role/<YOUR_ROLE_NAME> \
    --zip-file fileb://problem-generator.zip \
    --layers arn:aws:lambda:<YOUR_REGION>:<YOUR_ACCOUNT_ID>:layer:problem-generator-dependencies:<VERSION> \
    --timeout 900 \
    --memory-size 2048 \
    --environment "Variables={GOOGLE_AI_API_KEY=<YOUR_API_KEY>}"
```

4. **SQS 큐 생성**:

```bash
aws sqs create-queue --queue-name problem-generator-queue
```

5. **S3 버킷 생성**:

```bash
aws s3 mb s3://problem-generator-results
```

6. **Lambda 트리거 설정**:

```bash
# SQS에서 Lambda 트리거 설정
aws lambda create-event-source-mapping \
    --function-name problem-generator-worker \
    --event-source-arn arn:aws:sqs:<YOUR_REGION>:<YOUR_ACCOUNT_ID>:problem-generator-queue \
    --batch-size 1
```

7. **API Gateway 설정**:

AWS 콘솔에서 API Gateway를 설정하고 요청 처리 Lambda를 연결하세요.

## API 사용 방법

### 문제 생성 요청

**엔드포인트**: `POST /generate`

**요청 본문**:

```json
{
  "algorithm_type": "그래프",
  "difficulty": "보통",
  "api_key": "your-api-key-here" // 선택 사항, 환경 변수로 설정 가능
}
```

**응답 예시**:

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "QUEUED",
  "algorithm_type": "그래프",
  "difficulty": "보통",
  "result_url": "https://problem-generator-results.s3.amazonaws.com/results/550e8400-e29b-41d4-a716-446655440000.json"
}
```

### 결과 확인

생성이 완료되면 `result_url`에서 결과를 확인할 수 있습니다. S3에서 파일을 다운로드하여 내용을 확인하세요.

## 문제 해결

### 일반적인 문제

1. **"API key is required" 오류**:

   - 환경 변수 `GOOGLE_AI_API_KEY`가 설정되어 있는지 확인
   - 요청에 `api_key` 필드 추가

2. **LocalStack 연결 문제**:

   - "Could not connect to the endpoint URL" 오류가 발생하면:
     - Docker가 실행 중인지 확인 (Docker Desktop이 실행 중이어야 함)
     - `docker ps` 명령어로 LocalStack 컨테이너가 실행 중인지 확인
     - LocalStack 컨테이너가 실행되지 않은 경우 `docker-compose up -d` 명령어로 시작
     - `curl http://localhost:4566/health` 로 LocalStack 상태 확인

3. **Docker 관련 문제**:

   - "Cannot connect to the Docker daemon" 오류는 Docker 서비스가 실행되지 않았음을 의미
   - Docker Desktop 앱이 실행되어 있는지 확인하고, 완전히 시작될 때까지 기다린 후 다시 시도
   - macOS의 경우: `open -a Docker` 명령어로 Docker Desktop 시작
   - Linux의 경우: `sudo systemctl start docker` 명령어로 Docker 서비스 시작

4. **Lambda 임포트 오류**:

   - Lambda의 파이썬 패키지 경로 문제일 수 있음
   - 배포 패키지에 모든 필요한 파일이 포함되었는지 확인

5. **SQS 메시지 처리 문제**:
   - CloudWatch 로그에서 Lambda 실행 로그 확인
   - SQS 데드레터 큐 설정 고려

### Lambda 타임아웃 해결

문제 생성 Lambda는 LLM 호출로 시간이 오래 걸릴 수 있습니다. 필요에 따라 타임아웃 값을 최대 15분으로 늘리세요.

```bash
aws lambda update-function-configuration \
    --function-name problem-generator-worker \
    --timeout 900
```

---

## 향후 개선 사항

1. **상태 추적 개선**: DynamoDB를 추가하여 작업 상태를 체계적으로 관리
2. **웹훅 알림**: 문제 생성 완료 시 웹훅을 통한 알림 기능
3. **모니터링 대시보드**: CloudWatch 지표를 활용한 대시보드 구성
4. **간소화된 배포**: AWS SAM 또는 CloudFormation 템플릿 개발
