# 문제 채점 Lambda 함수 (`problem-grader`) - 순수 Lambda + subprocess 방식

이 Lambda 함수는 사용자 코드 제출을 받아 직접 Lambda 환경 내에서 `subprocess`를 사용하여 실행하고 채점하는 역할을 합니다. 기존 Fargate 기반 방식과 달리 별도의 컨테이너 실행 없이 Lambda 자체 컴퓨팅 자원을 활용합니다.

## 주요 기능

- DynamoDB(`problems_table`)에서 문제 정보(시간 제한) 및 테스트 케이스 조회
- 입력받은 사용자 코드(현재 Python만 지원)를 임시 파일로 저장
- `subprocess.run()`을 사용하여 각 테스트 케이스에 대해 사용자 코드 실행 (시간 제한 적용)
  - 표준 입력(stdin)으로 테스트 케이스 입력 전달
  - 표준 출력(stdout), 표준 에러(stderr), 실행 시간, 종료 코드 캡처
- 실행 결과 및 예상 출력을 비교하여 채점 상태 (AC, WA, TLE, RE, IE) 판정
- Fail Fast 로직 적용 (오답, 시간 초과, 런타임 에러 발생 시 즉시 중단)
- 최종 채점 결과를 집계하여 DynamoDB(`submissions_table`)에 저장
- 처리된 최종 결과를 반환

## 필수 인프라 / 구성 요소

- **AWS Lambda:** 채점 로직을 실행하는 컴퓨팅 환경.
  - **IAM Role:** Lambda 함수가 DynamoDB 테이블에 접근하고 CloudWatch Logs에 로그를 작성할 수 있는 권한 필요.
  - **환경 변수:**
    - `DYNAMODB_PROBLEMS_TABLE_NAME`: 문제 정보가 저장된 DynamoDB 테이블 이름.
    - `DYNAMODB_SUBMISSIONS_TABLE_NAME`: 채점 결과가 저장될 DynamoDB 테이블 이름.
  - **Python 런타임:** 사용자 코드 실행을 위해 Lambda 환경에 Python 인터프리터가 포함되어 있어야 합니다. (표준 Python 런타임 사용)
  - **충분한 메모리 및 시간 제한:** 사용자 코드 실행 및 데이터 처리를 위한 충분한 메모리(e.g., 512MB 이상)와 시간 제한(e.g., 30초 이상) 설정 필요.
- **Amazon DynamoDB:**
  - **Problems Table:** 문제 ID, 설명, 제약 조건(시간 제한 등), 테스트 케이스 목록 저장.
  - **Submissions Table:** 각 제출에 대한 채점 결과(상태, 실행 시간, 테스트 케이스별 결과 등) 저장.

## 데이터 구조 (DynamoDB)

### Problems Table (`alpaco-Problems-production`)

이 테이블은 문제에 대한 상세 정보를 저장합니다.

- `problemId` (String, Partition Key): 문제 고유 ID
- `constraints` (String): 제약 조건. **JSON 형식의 문자열**로 저장됩니다.
  - 채점 시 이 문자열을 파싱하여 `constraints['timeLimitSeconds']` (Number) 값을 시간 제한(초)으로 사용합니다.
- `testSpecifications` (String): 테스트 케이스 목록. **JSON 형식의 문자열**로 저장됩니다.
  - 채점 시 이 문자열을 파싱하며, 각 항목은 `input` (String) 과 `expectedOutput` (String) 키를 포함해야 합니다.
- `analyzedIntent` (String, Optional)
- `author` (String, Optional)
- `completedAt` (String, Optional)
- `createdAt` (String, Optional)
- `creatorId` (String, Optional)
- `description` (String, Optional)
- `description_translated` (String, Optional) # 참고: snake_case 필드가 남아있을 수 있음
- `difficulty` (String, Optional)
- `errorMessage` (String, Optional)
- `generationStatus` (String, Optional)
- `language` (String, Optional)
- `solutionCode` (String, Optional)
- `targetLanguage` (String, Optional)
- `testGeneratorCode` (String, Optional)
- `title` (String, Optional)
- `title_translated` (String, Optional) # 참고: snake_case 필드가 남아있을 수 있음
- `userPrompt` (String, Optional)
- `validationDetails` (Map, Optional)

_참고: 위 목록은 제공된 정보를 기반으로 하며, 실제 테이블 스키마에는 다른 필드가 포함될 수 있습니다. 채점 로직은 주로 `problemId`, `constraints` (`timeLimitSeconds` 포함), `testSpecifications` 필드를 사용합니다._

### Submissions Table (`problem-submissions`)

이 테이블은 각 제출에 대한 채점 결과를 저장합니다.

- `submissionId` (String, Partition Key): 제출 고유 ID (Lambda에서 생성)
- `problemId` (String): 문제 ID
- `language` (String): 제출 언어 (현재 'python'만 지원)
- `status` (String): 최종 채점 상태 (ACCEPTED, WRONG_ANSWER, TIME_LIMIT_EXCEEDED, RUNTIME_ERROR, INTERNAL_ERROR, NO_TEST_CASES)
- `executionTime` (Number): 모든 테스트 케이스 중 최대 실행 시간 (초 단위, Decimal로 저장)
- `results` (List of Maps): 각 테스트 케이스별 채점 결과
  - `caseNumber` (Number): 테스트 케이스 번호 (1부터 시작)
  - `status` (String): 해당 케이스 채점 상태
  - `executionTime` (Number): 해당 케이스 실행 시간 (초 단위, Decimal로 저장)
  - `stderr` (String, Optional): 런타임 에러 또는 내부 에러 발생 시 stderr 일부 저장
- `submissionTime` (Number): 제출 시각 (Unix 타임스탬프)
- `userCode` (String): 제출된 사용자 코드 (크기 제한 초과 시 일부만 저장될 수 있음)
- `errorMessage` (String, Optional): 채점 중 발생한 오류 메시지 (첫 실패 케이스 정보 등)

## 실행 흐름

1.  Lambda 함수는 외부 트리거(API Gateway, 다른 Lambda 등)로부터 `problemId`, `userCode`, `language` 를 포함한 이벤트를 수신합니다.
2.  환경 변수에서 DynamoDB 테이블 이름을 읽어옵니다.
3.  `problemId`를 사용하여 `alpaco-Problems-production` 테이블에서 문제 정보(`constraints`, `testSpecifications` 등)를 조회합니다.
4.  `testSpecifications` 목록이 비어있거나 유효하지 않으면 `NO_TEST_CASES` 상태로 처리하고 종료합니다.
5.  각 테스트 명세(`testSpecification`)에 대해 다음 과정을 반복합니다:
    a. `userCode`를 `/tmp` 디렉토리에 임시 Python 파일로 저장합니다.
    b. `subprocess.run(['python', temp_file_path], input=testSpecification['input'], capture_output=True, text=True, timeout=constraints['timeLimitSeconds'])`를 호출하여 사용자 코드를 실행합니다.
    c. `subprocess`의 반환 코드, stdout, stderr, 실행 시간(또는 Timeout 여부)을 확인합니다.
    d. 임시 파일을 삭제합니다.
    e. 결과를 분석하여 케이스 상태 (AC, WA, TLE, RE, IE)를 결정합니다.
    f. 만약 케이스 상태가 `ACCEPTED`가 아니면 Fail Fast 플래그를 설정하고 루프를 중단합니다.
6.  모든 (또는 Fail Fast 이전까지의) 케이스 결과를 집계하여 최종 `status`와 최대 `executionTime`을 결정합니다.
7.  최종 결과를 `problem-submissions` 테이블에 저장합니다. (크기 제한 초과 시 일부 데이터는 잘릴 수 있음)
8.  호출자에게 최종 채점 결과를 담은 응답을 반환합니다.

## 제약 사항 및 고려 사항

- **언어 지원:** 현재 구현은 Python 코드 실행만 지원합니다. 다른 언어를 지원하려면 `subprocess.run` 호출 방식 변경 및 해당 언어 런타임/컴파일러를 Lambda Layer 등을 통해 포함해야 합니다.
- **메모리 제한:** 코드 실행 중 메모리 사용량 제한 기능은 별도로 구현되어 있지 않습니다. Lambda 함수 자체의 메모리 설정에 의존하며, 초과 시 Lambda 환경에 의해 강제 종료될 수 있습니다.
- **보안 위험:** **가장 중요한 고려 사항입니다.** `subprocess`를 사용한 임의 코드 실행은 매우 위험합니다. 신뢰할 수 있는 코드만 실행하거나, 별도의 격리된 실행 환경(예: Fargate, Firecracker) 사용을 강력히 권장합니다.
- **파일 시스템 접근:** 사용자 코드는 Lambda의 임시 스토리지(`/tmp`)에 접근할 수 있습니다.
- **네트워크 접근:** 기본적으로 Lambda 함수는 네트워크에 접근할 수 있습니다. 사용자 코드가 외부 네트워크 호출을 시도할 수 있으므로 VPC 설정 등을 통해 제한하는 것이 좋습니다.
- **시스템 호출:** 사용자 코드가 Python의 `os` 모듈 등을 통해 시스템 호출을 시도할 수 있습니다. Lambda 실행 환경의 제한 내에서 동작합니다.
