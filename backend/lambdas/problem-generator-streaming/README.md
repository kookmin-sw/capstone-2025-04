# Problem Generator Streaming API Lambda

이 Lambda 함수는 코딩 문제 생성을 위한 실시간 스트리밍 API 엔드포인트를 제공합니다. 사용자의 요청을 받아 LangChain 파이프라인을 실행하고, 생성 과정의 상태 업데이트, LLM 토큰, 최종 결과 또는 오류를 정의된 JSON Lines 형식으로 클라이언트에 스트리밍합니다. **또한, 최종 생성된 문제는 DynamoDB 테이블에 저장됩니다.**

## 목표

- 문제 생성 파라미터(프롬프트, 난이도) 수신
- `@problem-generator` 모듈의 LangChain 로직을 사용하여 문제 생성
- 생성 과정의 상태 업데이트(`status`), LLM 토큰(`token`), 최종 결과(`result`), 오류(`error`)를 스트리밍 응답(**`application/x-ndjson`**)으로 클라이언트에 실시간 제공
- **생성된 최종 문제를 식별자(`problemId`)와 함께 DynamoDB에 저장**
- AWS Lambda 함수 URL (**`RESPONSE_STREAM`** 호출 모드)을 통해 API 노출

## 기술 스택

- **컴퓨팅:** AWS Lambda (Python 런타임)
- **API 노출:** AWS Lambda 함수 URL (`RESPONSE_STREAM` 모드)
- **데이터 저장:** AWS DynamoDB (`Problems` 테이블 - 테이블 이름은 환경 변수로 설정 가능)
- **핵심 로직:** Python, LangChain, `langchain-google-genai` (Gemini 모델 활용)
- **AWS SDK:** `boto3` (DynamoDB 연동)
- **의존성 관리:** `requirements.txt`
- **환경 변수 관리:** `.env` 파일 (로컬 개발 시), Lambda 환경 변수 (배포 시)

## 개발 계획 (수정됨)

1.  **Lambda 핸들러 구현 (`lambda_function.py`):**
    - `async def handler(event, context)` 정의.
    - `context.get_response_stream()`을 사용하여 스트림 객체 획득.
    - `event`에서 요청 본문 파싱 (`prompt`, `difficulty`). (필요시 `prompt`에서 `algorithm_type` 추출 로직 추가).
    - `@problem-generator`의 `ProblemGenerator` 클래스를 임포트하고 스트리밍 지원 메서드 호출.
    - **스트리밍 완료 후, 반환된 최종 문제 데이터를 `uuid`로 `problemId` 생성 후 `boto3`를 사용하여 DynamoDB (`Problems` 테이블)에 저장하는 로직 추가.**
    - **저장된 `problemId`를 스트리밍으로 전송되는 최종 결과(`result`) 메시지에 포함.**
    - 기본적인 오류 처리 및 로깅 구현.
    - `finally` 블록에서 `response_stream.close()` 호출 보장.
2.  **핵심 로직 수정 (`@problem-generator` 모듈):**
    - `problem-generator/generation/generator.py`의 `ProblemGenerator` 클래스 수정 또는 확장:
      - 스트리밍 전용 메서드 (예: `generate_problem_stream(self, ..., response_stream)`) 추가.
      - 이 메서드는 `response_stream` 객체를 인자로 받음.
      - LangChain 파이프라인 수정:
        - 초기 단계 (분석, 변형)는 `.invoke()` 사용, 각 단계 전후로 `status` 메시지 스트리밍.
        - 최종 문제 설명 생성 단계에서 `.astream()` 사용하여 `token` 메시지 스트리밍. (`full_llm_response` 누적).
        - 스트리밍 완료 후, 누적된 응답과 다른 중간 결과들을 통합하여 최종 `GeneratedProblem` 구조로 파싱 (기존 `integration_prompt` 로직 대체 또는 활용). Python 코드 레벨에서 파싱/구조화하는 것이 더 안정적일 수 있음. (`GeneratedProblem` 최종 필드 결정 필요).
        - 파싱된 최종 결과를 `result` 메시지로 스트리밍.
        - 전체 과정 중 오류 발생 시 `error` 메시지 스트리밍.
3.  **`requirements.txt` 작성:**
    - 필요한 라이브러리 명시 (`langchain`, `langchain-google-genai`, `boto3`, `python-dotenv` 등).
4.  **헬퍼 함수 구현:**
    - `format_stream_message(type, payload)` 구현.
    - **`save_problem_to_dynamodb(problem_data)` 구현 (DynamoDB 저장 로직).**
    - (필요시) LLM 출력 파싱 함수 구현.
5.  **`.env` 파일 작성:**
    - 로컬 개발 및 테스트를 위해 `PROBLEMS_TABLE_NAME` 환경 변수 설정.
6.  **배포 설정:**
    - AWS SAM 또는 유사 도구를 사용하여 Lambda 함수 배포 설정.
    - 함수 URL `RESPONSE_STREAM` 모드 활성화.
    - **Lambda 실행 역할에 DynamoDB 테이블 (`Problems`)에 대한 `PutItem` 권한 추가.**
    - CORS, 타임아웃, 메모리, IAM 권한, **`PROBLEMS_TABLE_NAME` 환경 변수 설정.**

## 다음 단계

1.  `lambda_function.py` 핸들러 및 DynamoDB 저장 로직 상세 구현 확인 및 테스트.
2.  `@problem-generator`의 `ProblemGenerator.generate_problem_stream` 반환 값 스키마 확인 및 `save_problem_to_dynamodb` 함수 내 `item_to_save` 매핑 정확하게 구현.
3.  AWS 환경에 배포 및 DynamoDB 저장 기능 통합 테스트.
