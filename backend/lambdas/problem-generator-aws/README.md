# Problem Generator AWS Lambda 현황 및 계획

이 문서는 기존 `problem-generator-streaming` Lambda의 스트리밍 기능을 제거하고, 비동기 문제 생성을 처리하는 `problem-generator-aws` Lambda의 현재 구현 상태와 초기 계획을 설명합니다.

## 현재 상태 (2025-04-13)

- **구현 완료:** API Gateway를 통해 요청을 받아 백그라운드에서 문제를 생성하고 DynamoDB에 저장하는 Lambda 함수(`ProblemGeneratorAWSFunction`)가 성공적으로 구현 및 배포되었습니다.
- **비동기 처리:** API 핸들러(`ProblemApiHandlerFunction`)는 생성 요청을 받으면 즉시 `202 Accepted`를 반환하고, 실제 생성 작업은 `ProblemGeneratorAWSFunction`에서 비동기적으로 처리됩니다. (주의: `ProblemGeneratorAWSFunction` 자체는 Step Functions와 통합되지 않고 직접 호출/실행되는 방식으로 구현되었습니다.)
- **핸들러:** `lambda_function.py`의 핸들러(`def handler(...)`)는 동기식이지만, 내부적으로 `ProblemGenerator`의 비동기 메서드(`generate_problem_stream`)를 `asyncio.run()`으로 호출하여 실행합니다.
- **LLM:** 문제 생성의 다양한 단계 (분석, 변환, 설명 생성, 테스트 케이스 생성 등)에 `gemini-2.0-flash` 모델을 사용합니다. (`utils/model_manager.py`의 `get_llm` 함수 참조).
  - `standard` 타입 모델 (JSON 출력 보조)에 `gemini-2.0-flash`를 사용하도록 수정되었습니다. (이전 `gemini-pro` 사용 시 `NotFound` 오류 발생)
  - 추론(`thinking`) 타입 모델로는 `gemini-2.0-flash-thinking-exp-01-21`이 사용됩니다.
- **JSON 처리:** LLM 출력에서 JSON을 안정적으로 얻기 위해 LangChain의 `JsonOutputParser`를 사용합니다.
- **DynamoDB 저장:** 생성된 최종 문제 데이터(딕셔너리)는 `lambda_function.py`의 `save_problem_to_dynamodb` 함수를 통해 `Problems` 테이블에 저장됩니다.
  - `creatorId` 필드는 현재 빈 문자열(`''`)로 저장되며, 추후 실제 사용자 ID로 업데이트해야 합니다 (`lambda_function.py` 내 `TODO` 주석 참조).
  - `testcases` 필드에는 생성된 **테스트 케이스 데이터 (입력/출력 딕셔너리 리스트)**가 JSON 문자열 형태로 저장됩니다.
  - `test_case_generation_code` 필드에는 이 테스트 케이스 데이터를 생성하는 **Python 코드**가 저장됩니다.
- **디버깅:** 구현 및 테스트 과정에서 다음과 같은 주요 문제들을 해결했습니다.
  - 템플릿 로딩 경로 및 배포 문제 해결 (`templates/` 디렉토리 구조 및 `load_template` 함수 수정).
  - `lambda_function.py`의 비동기/동기 처리 로직 수정 (`async def handler` -> `def handler` + `asyncio.run`).
  - LangChain 프롬프트 내 f-string 포맷 오류 및 파서 혼동 문제 해결.
  - LangChain 체인 호출 시 필요한 변수 누락 문제 해결.
  - `generate_problem_stream` 함수의 반환 값 타입 변경(list -> dict/None)에 따른 핸들러 로직 수정.
  - LLM 모델 호환성 문제 해결 (`gemini-pro` -> `gemini-2.0-flash` 변경).

## 초기 계획 (참고용)

(아래는 초기 구상 단계의 계획이며, 일부는 현재 구현과 다를 수 있습니다.)

1.  **코드 복사 및 정리:**

    - `problem-generator` 또는 `problem-generator-streaming`의 코드를 `problem-generator-aws` 디렉토리로 복사합니다.
    - 스트리밍 관련 코드 (`lambda_function.py`의 WebSocket 로직, `post_to_connection` 등)를 제거합니다.
    - 필요 없는 의존성 및 설정 (예: API Gateway Management API 클라이언트)을 제거합니다.

2.  **핸들러 구현:**

    - Lambda 핸들러 함수 (`def handler(event, context)`)를 구현합니다.
    - `ProblemGenerator` 클래스의 `generate_problem_stream` (비동기) 메소드를 `asyncio.run()`으로 호출하여 문제를 생성합니다.
    - 생성된 문제 데이터를 DynamoDB에 저장하는 로직 (`save_problem_to_dynamodb`)을 구현합니다.
    - 성공 시 저장된 문제 데이터(dict)를 반환하고, 실패 시 오류 정보를 포함한 dict를 반환합니다.

3.  **설정 및 의존성 관리:**

    - `requirements.txt` 파일은 현재 존재하지 않으며, `sam build` 시 의존성 없이 빌드됩니다. (필요 시 생성 및 라이브러리 명시 필요)
    - Lambda 함수에 필요한 환경 변수 (예: `PROBLEMS_TABLE_NAME`, `GOOGLE_AI_KEY`)는 SAM 템플릿(`backend/problem-infra/template.yaml`)을 통해 설정됩니다.
    - IAM 역할 정책은 SAM 템플릿에서 관리하며, DynamoDB 접근 권한 등이 포함됩니다.

4.  **SAM 템플릿 (`backend/problem-infra/template.yaml`):**

    - `ProblemGeneratorAWSFunction` 리소스가 정의되어 있습니다.
      - `Handler`: `lambda_function.handler`
      - `CodeUri`: `backend/lambdas/problem-generator-aws/`
      - `Runtime`: Python 3.12
      - 필요한 환경 변수 및 IAM 역할이 설정되어 있습니다.
      - VPC 설정이 포함되어 있습니다.
    - (참고: 초기 계획과 달리 Step Functions와 직접 통합되지는 않았습니다.)

5.  **로컬 테스트:**

    - 별도의 로컬 테스트 스크립트는 구성되지 않았습니다. 로컬 테스트가 필요하다면 `problem-generator-localstack` 프로젝트 구성을 참고할 수 있습니다.

6.  **배포 및 테스트:**

    - SAM CLI (`sam build`, `sam package`, `sam deploy`)를 사용하여 AWS에 배포합니다.
    - API Gateway 엔드포인트를 통해 테스트를 진행했습니다.

## 고려 사항 (초기 계획)

- **오류 처리:** 핸들러 내 `try...except` 블록 및 `save_problem_to_dynamodb` 함수에서 오류를 처리하고 적절한 반환 값을 생성합니다.
- **타임아웃:** Lambda 함수의 타임아웃 설정(현재 `template.yaml`에서 900초)이 문제 생성 시간을 고려하여 충분한지 확인해야 합니다.
- **비용:** 사용 중인 Gemini 모델 및 Lambda 실행 시간에 따른 비용을 고려합니다.
- **보안:** IAM 역할 권한은 SAM에 의해 관리되며, API 키는 환경 변수로 주입됩니다.
