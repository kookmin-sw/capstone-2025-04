# chatbot-query Lambda 함수 수동 테스트 방법

이 문서는 AWS CLI를 사용하여 `chatbot-query` Lambda 함수를 로컬 환경에서 수동으로 호출하고 스트리밍 응답 및 로그를 확인하는 방법을 설명합니다.

## 사전 준비

1. **AWS CLI 설치 및 구성:** AWS CLI가 설치되어 있고, Lambda 함수 호출 및 CloudWatch 로그 조회 권한이 있는 IAM 사용자로 AWS 자격 증명이 구성되어 있어야 합니다.
2. **Lambda 함수 이름:** 테스트하려는 Lambda 함수의 정확한 이름을 확인합니다. (예: `chatbot-query` 또는 배포 환경에 따른 전체 이름)
3. **AWS 리전:** Lambda 함수가 배포된 AWS 리전을 확인합니다. (예: `us-east-1`)

## 테스트 절차

### 1. 입력 페이로드(Payload) 생성

Lambda 함수는 특정 형식의 JSON 입력을 예상합니다. `problemDetails`, `userCode`, `history`, `newMessage` 필드를 포함하는 JSON 파일을 생성합니다. 파일 이름을 `payload.json`이라고 가정합니다.

**예시 `payload.json`:**

```json
{
  "problemDetails": {
    "title": "두 수의 합",
    "description": "주어진 정수 배열 nums와 정수 target에 대해, 두 숫자를 더해 target이 되는 인덱스를 반환하세요."
  },
  "userCode": "function solution(nums, target) {\n  // 여기에 코드를 작성하세요\n  return [];\n}",
  "history": [
    {
      "role": "user",
      "content": "시간 복잡도 제약 조건이 있나요?"
    },
    {
      "role": "assistant",
      "content": "네, 문제 설명에 시간 복잡도 제약 조건이 명시되어 있습니다. 확인해보세요."
    }
  ],
  "newMessage": "제 코드가 왜 시간 초과가 나는지 모르겠어요. 힌트 좀 주세요."
}
```

- `problemDetails`, `userCode`, `history`는 필요에 따라 비워두거나 `null`로 설정할 수 있습니다.
- `newMessage`는 필수 필드입니다.

### 2. AWS CLI를 사용하여 Lambda 함수 호출

터미널에서 다음 명령어를 실행하여 Lambda 함수를 호출합니다. `<your-aws-region>`과 `<your-function-name>`을 실제 값으로 대체하세요.

```bash
aws lambda invoke \
    --function-name <your-function-name> \
    --region <your-aws-region> \
    --invocation-type RequestResponse \
    --cli-binary-format raw-in-base64-out \
    --payload file://payload.json \
    --log-type Tail \
    output.log | cat
```

**복사/붙여넣기용 예제 명령어:**

아래 명령어는 `alpaco-production-chatbot-query` Lambda 함수를 `ap-northeast-2` 리전에서 호출하는 예제입니다. 명령어를 실행하는 위치와 동일한 디렉토리에 `payload.json` 파일이 있어야 합니다.

```bash
# 함수 이름과 리전이 아래 값과 일치하는지 확인하세요.
aws lambda invoke \
    --function-name alpaco-production-chatbot-query \
    --region ap-northeast-2 \
    --invocation-type RequestResponse \
    --cli-binary-format raw-in-base64-out \
    --payload file://payload.json \
    --log-type Tail \
    output.log | cat
```

- `--function-name`: 테스트할 Lambda 함수의 이름 (`alpaco-production-chatbot-query`).
- `--region`: Lambda 함수가 있는 AWS 리전 (`ap-northeast-2`).
- `--invocation-type RequestResponse`: 함수를 동기적으로 호출하고 응답을 기다립니다.
- `--cli-binary-format raw-in-base64-out`: AWS CLI v2에서 페이로드를 올바르게 처리하기 위해 필요합니다.
- `--payload file://payload.json`: 이전 단계에서 생성한 JSON 파일을 입력으로 사용합니다.
- `--log-type Tail`: 함수 실행 로그의 마지막 4KB를 응답에 포함시킵니다.
- `output.log`: Lambda 함수의 스트리밍 응답이 저장될 파일 이름입니다.
- `| cat`: `output.log` 파일의 내용을 즉시 터미널에 출력합니다.

### 3. 응답 확인

명령 실행 후 `output.log` 파일이 생성됩니다. 이 파일에는 Lambda 함수에서 스트리밍된 응답이 포함되어 있습니다. 성공적인 경우, 다음과 같은 형식의 newline으로 구분된 JSON 객체들이 포함됩니다:

```json
{"token": "음..."}
{"token": " 시간 "}
{"token": "초과가 "}
{"token": "나는 "}
{"token": "것은 "}
{"token": "아마도..."}
```

오류가 발생한 경우, 다음과 같은 형식의 JSON 객체가 포함될 수 있습니다:

```json
{
  "error": "Failed to get response from LLM.",
  "details": "Bedrock internal server error"
}
```

### 4. 로그 확인 (CloudWatch)

AWS CLI 응답에는 Base64로 인코딩된 실행 로그도 포함됩니다. 터미널에서 다음과 같이 디코딩할 수 있습니다 (명령어 응답이 JSON 형식이라고 가정):

```bash
# 이전 명령어 응답에서 LogResult 값을 복사하여 변수에 저장
LOG_RESULT="< 여기에 Base64 인코딩된 LogResult 값 붙여넣기 >"
echo $LOG_RESULT | base64 --decode
```

더 자세한 로그(예: `console.log` 출력, 전체 오류 스택 트레이스)는 AWS Management Console의 CloudWatch Logs에서 확인할 수 있습니다.

1. AWS Management Console에 로그인합니다.
2. CloudWatch 서비스로 이동합니다.
3. 왼쪽 메뉴에서 '로그 그룹(Log Groups)'을 선택합니다.
4. Lambda 함수 이름에 해당하는 로그 그룹을 검색합니다 (예: `/aws/lambda/<your-function-name>`).
5. 가장 최근의 로그 스트림(Log Stream)을 선택하여 함수의 실행 중 출력된 `console.log` 내용과 발생한 오류들을 확인합니다.
