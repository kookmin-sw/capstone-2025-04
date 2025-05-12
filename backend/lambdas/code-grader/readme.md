**주요 변경 사항:**

1.  **`executionMode` 파라미터 추가:**
    *   Lambda 핸들러 시작 부분에서 `payload.get('executionMode', "GRADE_SUBMISSION")`으로 이 값을 읽습니다.
    *   기본값은 기존의 채점 로직을 수행하는 `"GRADE_SUBMISSION"`입니다.
    *   새로운 사용자 테스트 실행 모드는 `"RUN_CUSTOM_TESTS"`로 지정합니다.

2.  **`customTestCases` 파라미터 추가:**
    *   `executionMode`가 `"RUN_CUSTOM_TESTS"`일 때 이 파라미터를 사용합니다.
    *   이것은 사용자가 제공한 입력값들의 리스트입니다 (예: `[{"some_key": "value1"}, {"another_key": 123}]`). 각 요소가 `runCode` Lambda의 `input_data`로 사용됩니다.

3.  **분기 처리:**
    *   `if execution_mode == "RUN_CUSTOM_TESTS":` 블록을 추가하여 사용자 테스트 실행 로직을 처리합니다.
    *   기존 채점 로직은 `elif execution_mode == "GRADE_SUBMISSION":` 블록으로 이동했습니다.

4.  **`run_single_test_case` 헬퍼 함수:**
    *   `runCode` Lambda를 호출하고 그 결과를 파싱하는 중복 코드를 줄이기 위해 이 함수를 만들었습니다.
    *   `GRADE_SUBMISSION` 모드와 `RUN_CUSTOM_TESTS` 모드 양쪽에서 사용됩니다.
    *   `runCode` Lambda 자체에서 발생한 에러(`FunctionError`)를 감지하고 특별한 `runCodeLambdaError` 플래그와 함께 반환하여 상위 로직에서 처리할 수 있도록 합니다.

5.  **사용자 테스트 실행 로직 (`RUN_CUSTOM_TESTS` 모드):**
    *   `customTestCases` 리스트를 순회합니다.
    *   각 사용자 입력에 대해 `run_single_test_case`를 호출합니다.
    *   **어떤 비교나 상태 결정도 하지 않습니다.** `runCode` Lambda가 반환한 결과(`stdout`, `stderr`, `exitCode`, `executionTimeMs`, `timedOut`, `isSuccessful`)를 그대로 `runCodeOutput` 필드에 담아 리스트에 추가합니다.
    *   `problemId`가 제공되면 해당 문제의 `timeLimitSeconds`를 가져와 사용자 테스트에도 적용하려고 시도합니다 (없으면 기본값 사용).
    *   DynamoDB의 `Submissions` 테이블에는 아무것도 저장하지 않습니다.
    *   최종 응답은 다음과 같은 구조를 가집니다:
        ```json
        {
            "executionMode": "RUN_CUSTOM_TESTS_RESULTS",
            "results": [
                {
                    "caseIdentifier": "Custom Case 1",
                    "input": { /* 사용자 입력 1 */ },
                    "runCodeOutput": { /* runCode Lambda의 결과 객체 1 */ }
                },
                {
                    "caseIdentifier": "Custom Case 2",
                    "input": { /* 사용자 입력 2 */ },
                    "runCodeOutput": { /* runCode Lambda의 결과 객체 2 */ }
                }
                // ... 등등
            ]
        }
        ```

6.  **기존 채점 로직 수정:**
    *   `run_single_test_case` 헬퍼 함수를 사용하도록 수정되었습니다.
    *   `runCodeLambdaError`를 확인하여 `runCode` Lambda 자체에 문제가 생겼을 경우 `INTERNAL_ERROR`로 처리하고 채점을 중단합니다.

**호출 예시 (RUN\_CUSTOM\_TESTS 모드):**

Lambda를 호출할 때 다음과 같은 `payload` (또는 API Gateway를 통한다면 `event.body`에 해당하는 문자열)를 전달합니다:

```json
{
    "executionMode": "RUN_CUSTOM_TESTS",
    "userCode": "def solution(data):\n    # ... 사용자 코드 ...\n    print(f\"Debug: {data['value']}\")\n    return data['value'] * 2",
    "language": "python3.12",
    "customTestCases": [
        {"value": 5},   // 첫 번째 사용자 테스트 케이스 입력
        {"value": 10},  // 두 번째 사용자 테스트 케이스 입력
        {"value": -3}   // 세 번째 사용자 테스트 케이스 입력
    ],
    "problemId": "optional-problem-id-for-time-limit" // 선택 사항
}
```

**응답 예시 (RUN\_CUSTOM\_TESTS 모드):**

```json
{
    "executionMode": "RUN_CUSTOM_TESTS_RESULTS",
    "results": [
        {
            "caseIdentifier": "Custom Case 1",
            "input": {"value": 5},
            "runCodeOutput": {
                "stdout": "{\"result\": 10}\nDebug: 5", // 사용자의 print문과 최종 결과 JSON 포함
                "stderr": "",
                "exitCode": 0,
                "executionTimeMs": 15,
                "timedOut": false,
                "error": null,
                "isSuccessful": true
            }
        },
        {
            "caseIdentifier": "Custom Case 2",
            "input": {"value": 10},
            "runCodeOutput": {
                "stdout": "{\"result\": 20}\nDebug: 10",
                "stderr": "",
                "exitCode": 0,
                "executionTimeMs": 12,
                "timedOut": false,
                "error": null,
                "isSuccessful": true
            }
        },
        {
            "caseIdentifier": "Custom Case 3",
            "input": {"value": -3},
            "runCodeOutput": { // 만약 이 케이스에서 에러가 발생했다면
                "stdout": "Debug: -3", // 에러 발생 전 print문
                "stderr": "{\"error\": \"TypeError: unsupported operand type(s) for *: 'NoneType' and 'int'\", \"traceback\": \"...\"}", // 에러 정보
                "exitCode": 1,
                "executionTimeMs": 18,
                "timedOut": false,
                "error": null,
                "isSuccessful": false
            }
        }
    ]
}
```

이제 `code-grader` Lambda는 두 가지 모드로 동작할 수 있게 되었습니다. 프론트엔드에서는 이 응답을 받아 사용자에게 테스트 케이스별 상세 실행 결과를 보여줄 수 있습니다.
