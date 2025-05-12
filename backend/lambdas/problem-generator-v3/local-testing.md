# Problem Generator V3 로컬 테스트 가이드

이 문서는 Problem Generator V3 파이프라인을 로컬 환경에서 테스트하는 방법을 설명합니다.

## 사전 준비

### 필수 요구사항

1. Node.js 18 이상 설치
2. Python 3.12 설치 (codeExecutor에서 사용)
3. Google AI API 키 (Gemini 모델 액세스)

### 선택 사항

1. AWS 자격 증명 (실제 DynamoDB 연결을 위해)
   - AWS_ACCESS_KEY_ID 및 AWS_SECRET_ACCESS_KEY 환경 변수 설정
   - AWS CLI 구성 (~/.aws/credentials)

## 환경 설정

1. 필요한 패키지 설치:

```bash
npm install
```

2. 환경 변수 설정:

`.env` 파일을 프로젝트 루트 디렉토리에 생성하고 다음 내용을 입력하세요:

```
# 필수 설정
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# 선택 설정
PROBLEMS_TABLE_NAME=your_problems_table_name
GEMINI_MODEL_NAME=gemini-2.5-pro-exp-03-25
DEFAULT_LANGUAGE=python3.12
DEFAULT_TARGET_LANGUAGE=Korean
GENERATOR_VERBOSE=true
MAX_RETRIES=2

# 로컬 테스트 설정
MOCK_DYNAMODB=true  # DynamoDB 모킹 활성화
```

### 참고: 환경 변수

- `MOCK_DYNAMODB=true`: 로컬 파일 시스템을 사용하여 DynamoDB를 시뮬레이션합니다. 실제 AWS 자격 증명이 없어도 테스트가 가능합니다.
- `MOCK_DYNAMODB=false`: 실제 AWS DynamoDB에 연결합니다. 유효한 AWS 자격 증명이 필요합니다.

## 로컬 테스트 실행

### 대화형 모드

직접 프롬프트를 입력하여 문제 생성을 테스트할 수 있습니다:

```bash
node local-test.mjs
```

### 자동 모드

미리 정의된 샘플 프롬프트를 사용하여 자동으로 실행할 수 있습니다:

```bash
# 기본 자동 테스트 (기본 설정 사용)
node local-test.mjs auto

# DynamoDB 모킹 사용 (로컬 파일 시스템)
node local-test.mjs mock

# 실제 DynamoDB 연결 (AWS 자격 증명 필요)
node local-test.mjs real
```

### 샘플 프롬프트 수정

`local-test.mjs` 파일에서 `sampleEvent` 객체를 수정하여 자동 모드에서 사용할 프롬프트를 변경할 수 있습니다:

```javascript
const sampleEvent = {
  body: {
    prompt: "원하는 프롬프트 내용으로 변경하세요",
    difficulty: "Medium",  // Easy, Medium, Hard
    creatorId: "test-user",
    author: "Local Tester"
  }
};
```

## 테스트 결과 확인

1. 테스트가 완료되면 결과가 `problem-gen-result-[timestamp].json` 파일로 저장됩니다.
2. `mock-data` 디렉토리에서 DynamoDB 모킹 모드 사용 시 저장된 중간 상태 데이터를 확인할 수 있습니다.

## 문제 해결

### Python 의존성 문제

코드 실행 단계에서 Python 의존성 관련 오류가 발생하면 Python 환경이 올바르게 설정되었는지 확인하세요:

```bash
python3.12 -V  # Python 3.12.x 버전 확인
```

### DynamoDB 접근 오류

실제 DynamoDB 연결 모드에서 오류가 발생하면 다음을 확인하세요:

1. AWS 자격 증명이 올바르게 설정되었는지 확인
2. 지정한 DynamoDB 테이블이 존재하고 접근 가능한지 확인
3. DynamoDB 테이블의 스키마가 올바른지 확인

## 고급: 코드 실행 샌드박스 설정

테스트 중 `codeExecutor` 모듈이 코드를 실행하기 위해 Python 3.12를 사용합니다. 보안 강화를 위한 추가 설정:

1. 제한된 Python 환경 설정 (선택 사항)
2. 더 엄격한 시간/메모리 제한 설정
3. 더 안전한 실행 환경 구성 (Docker 기반 샌드박스)

이러한 기능이 필요한 경우 `src/utils/codeExecutor.mjs` 파일을 수정하여 구현할 수 있습니다. 