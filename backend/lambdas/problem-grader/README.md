# Problem Grader Core Logic (`@problem-grader`)

이 문서는 `@problem-grader` 시스템의 핵심 채점 로직 구현에 대해 설명합니다. 이 컴포넌트의 목적은 사용자가 제출한 코드를 특정 문제에 대해 **사전에 정의된 테스트 케이스**를 사용하여 채점하고, 그 결과를 구조화된 형식으로 반환하는 것입니다.

**주요 목표:**

- 채점 로직(`lambda_function.py`)과 실행 환경(`docker/runner/python`) 제공.
- Terraform/인프라 담당자가 이 로직을 기존 시스템에 쉽게 통합할 수 있도록 명확한 인터페이스(필요한 환경 변수, 데이터 구조) 정의.
- 핵심 로직은 **동기식(Synchronous)**으로 동작하며, 외부 호출 시 채점 결과를 즉시 반환합니다.
- **AWS Step Functions는 이 로직에서 사용되지 않습니다.**
- **외부 호출 방식 (API Gateway, SQS 등)의 명세는 이 문서의 범위에 포함되지 않습니다.**

## 1. 개요 (Overview)

이 컴포넌트는 문제 ID, 사용자 코드, 사용 언어를 입력받습니다. 입력받은 문제 ID를 사용하여 **미리 정의된** 문제 설정(시간 제한 등) 및 테스트 케이스 목록을 외부 저장소(예: DynamoDB `problems_table`)에서 조회합니다. 각 테스트 케이스에 대해 격리된 컨테이너 환경(ECS Fargate Runner Task)에서 사용자 코드를 실행합니다. Runner Task는 실행 결과(상태, stdout, stderr, 실행 시간 등)를 **S3에 JSON 파일로 저장**합니다. Orchestrator Lambda 함수는 이 S3 파일을 읽어 결과를 처리하고, 모든 테스트 케이스 실행 후 종합하여 최종 채점 상태를 판정합니다. 최종 결과는 정의된 형식에 따라 반환되며, **외부 결과 저장소**(예: DynamoDB `submissions_table`)에 기록됩니다.

**S3 사용 이유:** Runner의 실행 결과, 특히 `stdout`과 `stderr`는 매우 길어질 수 있습니다. DynamoDB의 항목 크기 제한(400KB)을 초과할 가능성이 있으므로, 원본 결과는 크기 제한이 훨씬 덜 엄격한 S3에 저장하는 것이 안정적입니다. Lambda는 이 원본 S3 데이터를 가져와 처리 후, 필요한 정보만 요약/정제하여 DynamoDB `submissions_table`에 저장합니다.

**주요 특징 (Core Logic):**

- **동기식 처리:** 단일 Lambda 함수(`lambda_function.py`) 내에서 채점 과정을 동기적으로 처리하고 결과를 즉시 반환합니다.
- **사전 정의된 테스트 케이스 사용:** 외부 저장소(예: DynamoDB)에서 문제별 테스트 케이스 목록(입력/기대 출력 쌍)을 조회하여 사용합니다.
- **격리된 코드 실행:** 제공된 Python Runner (`docker/runner/python`)를 사용하여 ECS Fargate에서 사용자 코드를 안전하게 실행합니다.
- **결과 저장 분리:** Runner의 상세/원본 결과는 S3에, Lambda가 처리한 최종/집계 결과는 DynamoDB에 저장합니다.
- **명확한 데이터 인터페이스:** 필요한 입력 데이터(문제 정보, 테스트 케이스) 및 출력 데이터(채점 결과)의 구조를 상세히 정의합니다.
- **Python 지원:** Python 코드 채점을 위한 Runner를 제공하며, 다른 언어 추가가 용이하도록 설계되었습니다.

## 2. 핵심 로직 워크플로우 (`lambda_function.py`)

Orchestrator Lambda 함수(`lambda_function.py`)는 다음과 같은 단계를 동기적으로 수행합니다.

1.  **입력 수신:** 외부 호출로부터 문제 ID(`problem_id`), 사용자 코드(`user_code`), 언어(`language`)를 포함한 입력을 받습니다.
2.  **문제 데이터 조회:** `problem_id`를 사용하여 **외부 문제 저장소**(예: DynamoDB `problems_table`)에서 시간 제한(`time_limit`)과 테스트 케이스 목록(`test_cases`)을 조회합니다.
3.  **테스트 케이스 반복 실행:** 조회된 `test_cases` 목록의 각 항목에 대해 다음을 반복합니다.
    - **Runner Task 실행:** Python Runner ECS Task를 실행합니다. (`USER_CODE`, `INPUT_DATA`, `TIME_LIMIT`, `S3_BUCKET`, `S3_KEY` 환경 변수 전달)
    - **Runner Task 완료 대기:** 해당 ECS Task가 완료될 때까지 동기적으로 대기합니다.
    - **Runner 결과 조회 (S3):** Runner가 **S3**에 저장한 결과 JSON 파일을 읽어옵니다. (아래 **필수 데이터 구조** - Runner Result Structure 참조)
    - **결과 판정:** S3에서 가져온 Runner 결과(`status`, `stdout`, `stderr`, `execution_time`)와 현재 테스트 케이스의 기대 출력(`test_cases[i].expected_output`)을 비교하여 해당 케이스의 최종 상태를 결정합니다. (아래 **상태 코드 정의** 참조)
    - **Fail Fast:** 첫 번째 실패(Non-ACCEPTED) 케이스 발생 시, 남은 테스트 케이스 실행을 중단합니다.
4.  **최종 결과 집계:** 모든 실행된 테스트 케이스 결과를 종합하여 최종 상태(`status`), 최대 실행 시간(`execution_time`) 등을 계산합니다.
5.  **결과 저장 (DynamoDB):** 집계된 최종 결과를 **외부 결과 저장소**(예: DynamoDB `submissions_table`)에 저장합니다. (아래 **필수 데이터 구조** - Submission Result Structure 참조)
6.  **결과 반환:** 최종 채점 결과를 구조화된 데이터 형식으로 반환합니다. (이것을 어떻게 외부로 전달할지는 호출자에게 달려있습니다.)

## 3. 상태 코드 정의 (Status Codes)

채점 시스템에서는 두 가지 종류의 상태 코드가 사용됩니다.

1.  **Runner Result Status (`run_code.py` 결과 - S3 저장):**

    - ECS 컨테이너 내의 `run_code.py` 스크립트가 사용자 코드 실행 후 **S3에 저장하는 결과 상태**입니다.
    - 코드 실행 자체의 성공/실패 여부를 나타냅니다.
    - **가능한 값:**
      - `SUCCESS`: 사용자 코드가 오류 없이 제한 시간 내에 실행 완료됨.
      - `RUNTIME_ERROR`: 사용자 코드 실행 중 런타임 오류 발생 또는 0이 아닌 코드로 종료됨.
      - `TIME_LIMIT_EXCEEDED`: 사용자 코드가 지정된 시간 제한을 초과하여 종료됨.
      - `GRADER_ERROR`: `run_code.py` 스크립트 자체의 오류 또는 환경 문제.

2.  **Submission (Overall & Case) Status (Lambda 판정 결과 - DynamoDB 저장):**

    - Lambda 함수(`lambda_function.py`)가 각 테스트 케이스 및 전체 제출에 대해 최종적으로 판정하여 **DynamoDB `submissions_table`에 저장하는 상태**입니다.
    - S3에서 가져온 Runner Result Status 와 실제 출력/기대 출력 비교 결과를 종합하여 결정됩니다.
    - **가능한 값:**

      - `ACCEPTED` (AC): 해당 케이스의 Runner 상태가 `SUCCESS`이고, `stdout`이 `expected_output`과 일치.
      - `WRONG_ANSWER` (WA): Runner 상태는 `SUCCESS`이지만, `stdout`이 `expected_output`과 불일치.
      - `TIME_LIMIT_EXCEEDED` (TLE): Runner 상태가 `TIME_LIMIT_EXCEEDED`.
      - `RUNTIME_ERROR` (RE): Runner 상태가 `RUNTIME_ERROR`.
      - `INTERNAL_ERROR` (IE): 채점 시스템 내부 오류 (Lambda 오류, ECS Task 실패, S3 접근 불가 등). Runner 상태가 `GRADER_ERROR`인 경우도 포함될 수 있음.
      - `NO_TEST_CASES`: 조회한 `test_cases` 목록이 비어있음.

    - **관계:** Lambda는 S3에서 Runner 결과를 가져와 처리합니다. Runner의 `status`가 `SUCCESS`라도 `stdout` 비교 결과가 다르면 `WRONG_ANSWER`로 판정합니다. 다른 Runner 상태는 대체로 그대로 반영됩니다. 최종 Submission 상태는 가장 심각한 케이스 상태를 따릅니다.

## 4. 제공되는 컴포넌트

- **`lambda_function.py`:** 채점 오케스트레이션 Lambda 함수 코드.
- **`docker/runner/python/` 디렉토리:** Python Runner Dockerfile 및 실행 스크립트 (`run_code.py`).

## 5. 필수 인프라 및 구성 (인프라 담당자 참고)

1.  **호출 인터페이스:** 이 Lambda 함수를 호출할 방식(예: 다른 Lambda, Step Function Task, 직접 호출 등)과 필요한 입력(문제 ID, 코드, 언어) 전달 구현.
2.  **AWS Lambda 함수:** `lambda_function.py` 사용, 적절한 IAM 역할 및 아래 환경 변수 설정.
3.  **IAM 권한:**
    - **Lambda 실행 역할:** DynamoDB Get/Put, S3 GetObject, ECS Run/Describe/Stop Task, IAM PassRole, CloudWatch Logs 쓰기.
    - **ECS Task 실행 역할:** ECR 이미지 가져오기, CloudWatch Logs 쓰기 (`AmazonECSTaskExecutionRolePolicy`).
    - **ECS Task 역할:** S3 PutObject (Runner가 결과를 S3에 쓰기 위함).
4.  **DynamoDB 테이블 (`problems_table`):** 문제 정보 저장. `id` (String, UUID), `constraints_time_limit`, `test_cases` (List of Maps, 아래 구조 참조) 필드 포함.
5.  **DynamoDB 테이블 (`submissions_table`):** 최종 결과 저장. 파티션 키 `submission_id` (String) 권장. 저장 구조는 아래 참조.
6.  **S3 버킷:** Runner 결과 JSON 파일을 저장할 버킷. Lambda와 ECS Task 역할 모두 접근 권한 필요.
7.  **ECR 리포지토리:** Python Runner Docker 이미지 저장소.
8.  **ECS 클러스터 및 네트워킹:** Fargate Task 실행 환경 (클러스터, 서브넷, 보안 그룹).
9.  **ECS Task Definition (Python Runner):** ECR 이미지 사용, 적절한 역할 연결, 컨테이너 이름 일치.
10. **Lambda 환경 변수 (필수):**
    - `DYNAMODB_PROBLEMS_TABLE_NAME`, `DYNAMODB_SUBMISSIONS_TABLE_NAME`, `S3_BUCKET_NAME`, `ECS_CLUSTER_NAME`, `RUNNER_PYTHON_TASK_DEF_ARN`, `RUNNER_PYTHON_CONTAINER_NAME`, `SUBNET_IDS`, `SECURITY_GROUP_IDS`.

## 6. 필수 데이터 구조

1.  **Test Case Structure (in `problems_table`'s `test_cases` list):**

    ```json
    {
      "input": "테스트 케이스 입력 (String)",
      "expected_output": "테스트 케이스 기대 출력 (String)"
    }
    ```

2.  **Runner Result Structure (S3에 저장되는 JSON):**

    ```json
    {
      "status": "SUCCESS | RUNTIME_ERROR | TIME_LIMIT_EXCEEDED | GRADER_ERROR",
      "stdout": "실행 표준 출력 (String)",
      "stderr": "실행 표준 에러 (String)",
      "execution_time": 1.234 // 실행 시간 (Number, 초)
    }
    ```

3.  **Submission Result Structure (DynamoDB `submissions_table` 저장 형식):**
    ```json
    {
      "submission_id": "sub_...", // (String, Partition Key)
      "problem_id": "f47ac10b-...", // (String, UUID 형식)
      "language": "python", // (String)
      "status": "ACCEPTED | WRONG_ANSWER | TLE | RE | IE | NO_TEST_CASES", // 최종 상태 (String)
      "execution_time": 0.1234, // 최대 실행 시간 (Number, 초)
      "results": [
        // (List of Maps) 각 케이스 요약 결과
        {
          "case": 1, // (Number)
          "status": "ACCEPTED | WRONG_ANSWER | TLE | RE | IE", // 케이스 상태 (String)
          "execution_time": 0.05 // 케이스 실행 시간 (Number)
          // Lambda 판단 하에 stdout/stderr/expected_output 등 추가 정보 저장 가능 (크기 제한 유의)
        }
      ],
      "submission_time": 1678886400, // (Number, Unix timestamp)
      "user_code": "...", // (String, 선택적 저장)
      "error_message": "..." // (String, 오류 발생 시, 선택적 저장)
    }
    ```

## 7. 배포 참고사항 (인프라 담당자)

1.  제공된 `lambda_function.py` 및 `docker/runner/python` 사용.
2.  **필수 인프라 및 구성** 섹션의 요구사항 충족.
3.  Lambda 환경 변수 정확성 확인.
4.  Runner Docker 이미지 빌드 및 ECR 푸시.
5.  구현된 호출 인터페이스를 통해 기능 테스트.

## 8. 문제 해결 (Troubleshooting)

- **Lambda 함수 로그 (CloudWatch):** 워크플로우 오류 추적 (DB 조회, ECS Task 실행, S3 GetObject 등).
- **ECS Runner Task 로그 (CloudWatch):** 컨테이너 내부 오류 (`run_code.py` 또는 사용자 코드 오류).
- **데이터 확인:** `problems_table` (ID, `test_cases` 형식), S3 (Runner 결과 파일 존재 여부), `submissions_table` (결과 저장 확인).
- **권한 확인:** Lambda 및 ECS 역할의 IAM 권한 검토 (DynamoDB, S3, ECS).
- **네트워킹:** ECS Task의 VPC 설정 (서브넷, 보안 그룹, 외부 서비스 접근).
- **환경 변수:** Lambda 환경 변수 값과 실제 리소스 일치 여부 확인.

## 9. 확장성 (Extensibility)

**A. 채점 언어 추가:**

1.  새 언어용 Runner 구현 및 Docker 이미지 생성.
2.  ECR 리포지토리 및 ECS Task Definition 생성.
3.  Lambda 환경 변수 추가/업데이트.
4.  `lambda_function.py` 내 `runner_map` 등 관련 로직 수정.
5.  이미지 빌드/푸시 및 인프라 배포.

**B. 비동기 처리로 전환:**

이 동기식 로직은 필요에 따라 비동기 아키텍처(예: SQS+Lambda) 내에서 호출되도록 인프라 레벨에서 수정/통합될 수 있습니다. 이는 Lambda 함수 코드 자체보다는 외부 호출 및 상태 관리 방식의 변경을 의미합니다.
