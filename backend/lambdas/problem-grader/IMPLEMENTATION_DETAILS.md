# Problem Grader 구현 상세 명세서

이 문서는 `@problem-grader` 시스템의 내부 구현 방식, 특히 Fargate와 Docker를 활용한 코드 실행 환경에 대해 상세히 설명합니다.

## 1. 전체 흐름 복습

채점 시스템은 다음과 같은 단계로 동작합니다:

1.  **API 요청 수신 (Lambda: `problem-grader-api`):** 클라이언트로부터 채점 요청(문제 ID, 사용자 코드, 언어)을 받습니다.
2.  **문제 정보 조회:** DynamoDB `Problems` 테이블에서 해당 문제의 테스트 케이스 및 제약 조건(시간/메모리 제한)을 가져옵니다.
3.  **워크플로우 시작 (Step Functions):** 조회한 정보와 사용자 코드를 포함하여 Step Functions 워크플로우(`grader_workflow.asl.json`) 실행을 시작합니다.
4.  **테스트 케이스 병렬 처리 (Step Functions Map State):** 워크플로우는 각 테스트 케이스에 대해 독립적인 코드 실행 작업(Fargate Task)을 병렬로 실행하도록 지시합니다.
5.  **코드 실행 (Fargate Task: `code-runner`):** 각 Fargate Task는 격리된 환경(Docker 컨테이너) 내에서 하나의 테스트 케이스에 대해 사용자 코드를 실행하고 결과를 측정합니다.
6.  **결과 취합 및 평가 (Lambda: `result-processor`):** Step Functions는 모든 Fargate Task의 결과를 모아 `result-processor` Lambda 함수에게 전달합니다. 이 함수는 각 테스트 케이스 결과를 평가하고 최종 점수와 상태를 계산합니다.
7.  **결과 저장:** `result-processor` Lambda는 최종 채점 결과를 DynamoDB `Submissions` 테이블에 저장합니다.

## 2. 핵심: 안전한 코드 실행 환경 (Fargate + Docker)

사용자가 제출한 코드를 서버에서 직접 실행하는 것은 매우 위험합니다. 악의적인 코드가 시스템 자원을 고갈시키거나, 다른 데이터에 접근하거나, 서버를 손상시킬 수 있기 때문입니다. 이를 방지하기 위해 **격리된 실행 환경**이 필수적이며, 이 시스템에서는 AWS Fargate와 Docker를 사용합니다.

### 2.1. Docker: 코드 실행 환경 패키징

- **개념:** Docker는 애플리케이션(여기서는 코드 실행 스크립트와 필요한 라이브러리)을 실행하는 데 필요한 모든 것(코드, 런타임, 시스템 도구, 라이브러리 등)을 "컨테이너 이미지"라는 패키지로 만드는 기술입니다. 이 이미지만 있으면 어떤 환경에서든 동일하게 애플리케이션을 실행할 수 있습니다.
- **`fargate/Dockerfile`:** 이 파일은 `code-runner` 컨테이너 이미지를 만드는 설계도입니다.
  - 기본 운영체제 이미지(여기서는 `python:3.11-slim`)를 가져옵니다.
  - 필요한 Python 라이브러리(현재는 없음, 필요시 `fargate/requirements.txt`에 추가)를 설치합니다.
  - 실제 코드 실행 로직이 담긴 `runner.py` 스크립트를 이미지 안으로 복사합니다.
  - 컨테이너가 시작될 때 `python runner.py` 명령어를 실행하도록 설정합니다.
- **결과:** 이 `Dockerfile`을 빌드하면, Python 3.11 환경과 `runner.py` 스크립트를 포함하는 독립적인 `code-runner` 컨테이너 이미지가 생성됩니다.

### 2.2. AWS Fargate: 컨테이너 실행 및 관리

- **개념:** Fargate는 Docker 컨테이너를 실행하기 위한 AWS의 서버리스 컴퓨팅 엔진입니다. Fargate를 사용하면 컨테이너를 실행하기 위해 기본 서버(EC2 인스턴스)를 직접 관리할 필요가 없습니다. AWS가 서버 프로비저닝, 패치, 확장 등을 알아서 처리해 줍니다.
- **ECS Task Definition:** Fargate에서 컨테이너를 어떻게 실행할지 정의하는 설정입니다. 여기에는 다음 정보가 포함됩니다:
  - 사용할 Docker 이미지 (`code-runner` 이미지)
  - 컨테이너에 할당할 CPU 및 메모리 크기
  - 컨테이너 실행 시 전달할 환경 변수 (예: `USER_CODE`, `INPUT_DATA`, `TIME_LIMIT`, `MEMORY_LIMIT`)
  - 네트워크 설정 (VPC 서브넷, 보안 그룹)
  - 로깅 설정 (컨테이너의 표준 출력/오류를 CloudWatch Logs로 보내도록 설정)
- **`statemachine/grader_workflow.asl.json`의 `Run Code on Fargate` 상태:**
  - Step Functions는 이 상태 정의에 따라 Fargate에게 `code-runner` 컨테이너 실행을 요청합니다 (`ecs:runTask.sync`).
  - `Overrides` 섹션을 통해 각 테스트 케이스별로 다른 환경 변수(특히 `INPUT_DATA`, `EXPECTED_OUTPUT`)를 컨테이너에 전달합니다.
  - `.sync` 통합 패턴은 Fargate 작업이 완료될 때까지 Step Functions가 기다리도록 합니다.

### 2.3. `fargate/runner.py`: 실제 코드 실행 및 측정

- **역할:** `code-runner` 컨테이너 내부에서 실행되는 핵심 스크립트입니다. 환경 변수로 전달받은 사용자 코드와 테스트 케이스 입력을 사용하여 다음 작업을 수행합니다:
  1.  **임시 파일 생성:** 사용자 코드(`user_code.py`)와 입력 데이터(`input.txt`)를 파일로 저장합니다.
  2.  **리소스 제한 설정 (`resource.setrlimit`):** 코드를 실행할 자식 프로세스에 메모리 제한(및 잠재적으로 CPU 시간 제한)을 설정합니다. 이는 코드가 과도한 리소스를 사용하는 것을 방지합니다. (현재 `runner.py`는 `RLIMIT_AS`를 사용하여 메모리 주소 공간을 제한합니다.)
  3.  **코드 실행 (`subprocess.Popen`):** 설정된 언어(현재 Python)에 맞춰 사용자 코드 파일을 실행하는 새로운 프로세스를 생성합니다. 이 때, 표준 입력(stdin)은 `input.txt` 파일에 연결하고, 표준 출력(stdout)과 표준 에러(stderr)는 별도의 파일(`output.txt`, `error.txt`)로 리디렉션합니다.
  4.  **시간 제한 적용 (`process.wait(timeout=...)`):** 지정된 시간 제한(`TIME_LIMIT_SECONDS`) 내에 프로세스가 완료되기를 기다립니다. 시간이 초과되면 `TimeoutExpired` 예외가 발생하고 프로세스를 강제 종료합니다.
  5.  **결과 캡처:** 프로세스 종료 후, `output.txt`와 `error.txt` 파일의 내용을 읽어 표준 출력 및 표준 에러 결과를 가져옵니다.
  6.  **상태 판정:** 프로세스 종료 코드, 시간 초과 여부, (제한적인) 메모리 초과 추정 등을 바탕으로 실행 상태("Completed", "TimeLimitExceeded", "MemoryLimitExceeded", "RuntimeError" 등)를 결정합니다.
  7.  **결과 반환 (JSON 출력):** 실행 상태, 표준 출력/에러 내용, 실제 실행 시간, 메모리 사용량 추정치 등을 포함하는 JSON 객체를 표준 출력으로 인쇄합니다. Step Functions는 이 JSON 출력을 (로깅 설정을 통해) 캡처하여 다음 단계로 전달합니다.
- **메모리 측정의 어려움:** `runner.py`의 현재 메모리 측정 방식은 정확하지 않습니다 (`resource.getrusage`나 threading 방식은 한계가 있음). 정확한 최대 메모리 사용량을 측정하려면 `psutil` 라이브러리를 사용하거나 Linux의 `/proc` 파일 시스템을 주기적으로 읽는 더 정교한 접근 방식이 필요하며, 이는 `fargate/requirements.txt`에 `psutil` 추가 및 `runner.py` 수정이 필요합니다.

## 3. Step Functions 워크플로우 상세 (`grader_workflow.asl.json`)

- **`Prepare Fargate Inputs`:** 모든 Fargate Task에 공통적으로 필요한 정보(네트워크 설정, 기본 환경 변수 등)를 미리 준비하는 단계입니다.
- **`Map Over Testcases`:** 이 상태는 `$.testcases` 배열의 각 요소(테스트 케이스 객체)에 대해 병렬로 `Iterator` 워크플로우를 실행합니다. `MaxConcurrency`는 동시에 실행될 Fargate Task의 최대 개수를 제한합니다.
  - **`Iterator`:** 각 테스트 케이스에 대해 실행되는 하위 워크플로우입니다.
    - **`Run Code on Fargate`:** 위에서 설명한 Fargate Task 실행 상태입니다. 각 테스트 케이스의 `input`과 `output` 데이터를 환경 변수로 Fargate Task에 전달합니다.
    - **`ResultSelector` (Placeholder):** Fargate Task의 결과(주로 로그)에서 `runner.py`가 출력한 JSON을 추출하고 파싱하는 역할을 해야 합니다. **이 부분은 실제 Fargate 로깅 및 출력 처리 방식에 맞춰 구체화되어야 합니다.** (예: CloudWatch Logs 구독 필터를 사용하거나, Fargate Task가 결과를 S3에 직접 쓰도록 수정)
    - **`Catch` / `Handle Fargate Error`:** Fargate Task 실행 중 예상치 못한 오류가 발생했을 경우를 처리합니다.
- **`Process Results`:** Map 상태의 모든 병렬 실행이 완료되면, `taskResults` 배열(각 Fargate Task의 결과 포함)과 `originalInput` 데이터를 `result-processor` Lambda 함수로 전달하여 최종 평가 및 저장을 수행합니다.

## 4. Lambda 함수 상세

- **`problem-grader-api` (`lambdas/api/lambda_function.py`):**
  - API Gateway 또는 함수 URL로부터 요청을 받아 파싱합니다.
  - DynamoDB `Problems` 테이블에서 문제 정보를 가져옵니다.
  - Step Functions 실행에 필요한 모든 정보를 조합하여 `stepfunctions_client.start_execution`을 호출합니다.
  - 클라이언트에게는 채점 작업이 시작되었음을 알리는 `submissionId`를 반환합니다 (HTTP 202 Accepted).
- **`result-processor` (`lambdas/processor/lambda_function.py`):**
  - Step Functions로부터 Map 상태의 최종 출력(모든 Fargate Task 결과 포함)을 받습니다.
  - 각 테스트 케이스 결과(`status`, `stdout` 등)를 분석하고 예상 출력(`expectedOutput`)과 비교합니다.
  - 전체 테스트 케이스 결과를 종합하여 최종 채점 상태("Accepted", "WrongAnswer", "TimeLimitExceeded" 등)와 점수를 계산합니다.
  - 계산된 최종 결과를 `submissionId`, `userId`, 원본 코드 등과 함께 DynamoDB `Submissions` 테이블에 저장합니다.

## 5. 데이터베이스 스키마 (예상)

- **`Problems` 테이블 (Source: `@problem-generator-streaming`):**
  - `problemId` (String, PK)
  - `title` (String)
  - `description` (String)
  - `testcases` (String - JSON 배열 형식: `[{"input": "...", "output": "..."}, ...]`) - **이 형식 확인 필요**
  - `timeLimit` (Number - 초 단위)
  - `memoryLimit` (Number - MB 단위)
  - `difficulty` (String)
  - `algorithmType` (String)
  - `createdAt` (String or Number)
- **`Submissions` 테이블 (Target: `@problem-grader`):**
  - `submissionId` (String, PK)
  - `problemId` (String, GSI PK?)
  - `userId` (String, GSI SK?)
  - `code` (String)
  - `language` (String)
  - `status` (String - "Accepted", "WrongAnswer", "TimeLimitExceeded", "MemoryLimitExceeded", "RuntimeError", "CompileError", "ExecutionError")
  - `score` (Number - 0 ~ 100)
  - `results` (String - JSON 배열 형식: `[{"testcaseId": 0, "status": "Accepted", "executionTime": 0.12, "memoryUsage": 32}, ...]`) - 상세 결과
  - `submittedAt` (String or Number)
  - `completedAt` (String or Number)

이 명세서는 시스템의 주요 구성 요소와 동작 방식을 설명하며, 특히 Fargate와 Docker를 사용한 안전한 코드 실행 환경 구축에 초점을 맞췄습니다.
