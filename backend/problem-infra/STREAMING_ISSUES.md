# Lambda 응답 스트리밍 문제 요약 (`ProblemGeneratorStreamingFunction`)

이 문서는 `ProblemGeneratorStreamingFunction`에서 AWS Lambda Function URL의 응답 스트리밍(`RESPONSE_STREAM` 모드) 기능을 Python 관리형 런타임(3.11, 3.13)에서 사용하려다 발생한 문제점들과 그 분석 내용을 요약합니다.

## 문제 상황

Lambda Function URL을 `RESPONSE_STREAM` 모드로 설정하고, Python 런타임에서 비동기(`async def`) 핸들러 또는 동기 핸들러 래퍼를 사용하여 클라이언트로 응답을 스트리밍하려고 시도했습니다.

## 발생한 오류 및 증상

다양한 시도에도 불구하고 다음과 같은 주요 문제들이 지속적으로 발생했습니다:

1.  **`Runtime.MarshalError: Unable to marshal response: Object of type coroutine is not JSON serializable`**

    - 주로 `async def handler` 시그니처를 사용했을 때 발생했습니다.
    - Lambda 런타임이 핸들러가 반환한 코루틴 객체를 JSON으로 직렬화하려고 시도하다 실패하는 것으로 보입니다.
    - 함수 실행이 거의 즉시 (몇 ms 만에) 종료되었습니다.

2.  **`RuntimeWarning: coroutine 'handler' was never awaited`**

    - Python 3.13 런타임에서 `async def handler` 사용 시 `MarshalError`와 함께 발생했습니다.
    - Lambda 런타임 내부(`awslambdaric/bootstrap.py`)에서 핸들러 코루틴을 `await`하지 않았음을 명확히 보여줍니다.

3.  **`AttributeError: 'LambdaContext' object has no attribute 'get_response_stream'`**

    - `MarshalError`를 우회하기 위해 동기 핸들러 래퍼 (`def handler(...)` 내에서 `asyncio.run(...)` 사용)를 적용했을 때 발생했습니다.
    - 동기 핸들러에게 전달된 `context` 객체에 스트리밍에 필요한 `get_response_stream()` 메서드가 포함되지 않았음을 의미합니다.

4.  **`curl -N` 호출 시 터미널 출력 없음**
    - 위 오류들이 발생하는 동안, 스트리밍 클라이언트(`curl -N`)의 터미널에는 어떠한 응답 데이터도 출력되지 않았습니다.

## 시도했던 해결 방법들

- **Python 런타임 변경:** Python 3.11과 3.13 버전을 모두 테스트했습니다.
- **핸들러 시그니처 변경:**
  - `async def handler(...)`
  - `def handler(...)` 내에서 `asyncio.run(async_logic(...))` 호출 (동기 핸들러 래퍼)
- **`await response_stream.write()`:** 스트림 쓰기 호출 시 `await` 키워드를 추가했습니다.
- **빌드 및 배포 프로세스 개선:**
  - `sam build`, `sam package`, `sam deploy` 명령 명시적 분리
  - `--force-upload` 옵션 사용
  - 빌드 캐시(` .aws-sam`) 정리 (권한 문제 해결 포함)
- **의존성 및 코드 정리:**
  - 함수 코드 내 중복 의존성 제거 (`requirements.txt` 처리)
  - 레이어 라이브러리 버전 조정 및 제약 조건 제거 테스트
  - 디버깅 로그 추가 및 오류 처리 로직 단순화

## 근본 원인 분석

위 증상들과 시도 결과를 종합했을 때, 문제의 근본 원인은 다음과 같이 추정됩니다:

**AWS Lambda의 Python 관리형 런타임(3.11 및 3.13 포함)이 Function URL의 `RESPONSE_STREAM` 모드를 안정적으로 지원하지 못하는 것으로 보입니다.**

- 런타임이 `async def handler` 시그니처를 스트리밍 모드에서 올바르게 `await` 하지 못하여 `MarshalError`가 발생합니다. (Python 3.13에서 특히 명확한 경고 발생)
- 동기 핸들러 래퍼를 사용하면 `MarshalError`는 피할 수 있지만, 런타임이 스트리밍에 필요한 `context` 객체 (`get_response_stream()` 메서드 포함)를 올바르게 제공하지 못하여 `AttributeError`가 발생합니다.
- 이는 AWS 공식 문서에서 Python 관리형 런타임의 응답 스트리밍에 대한 네이티브 지원이 명시되지 않은 점 ([https://docs.aws.amazon.com/ko_kr/lambda/latest/dg/configuration-response-streaming.html](https://docs.aws.amazon.com/ko_kr/lambda/latest/dg/configuration-response-streaming.html))과 일치하는 현상입니다.

결론적으로, 사용자 코드의 문제가 아니라 **Lambda 플랫폼의 Python 런타임과 Function URL 스트리밍 기능 간의 호환성 문제 또는 버그**일 가능성이 매우 높습니다.

## 결론 및 권장 대안

현재 상태로는 Python 관리형 런타임과 Lambda Function URL을 함께 사용하여 안정적인 응답 스트리밍 기능을 구현하기 어렵습니다. 다음과 같은 대안 아키텍처를 고려하는 것이 좋습니다:

1.  **API Gateway WebSocket API:**
    - 지속적인 양방향 연결을 제공하며, Lambda 함수가 클라이언트로 데이터를 푸시(스트리밍)할 수 있습니다.
    - 설정은 Function URL보다 복잡하지만, 실시간 데이터 전송에 더 유연하고 강력한 기능을 제공합니다.
2.  **비-스트리밍 방식으로 전환:**
    - Lambda 함수가 모든 문제 생성을 완료한 후, 단일 HTTP 응답으로 전체 결과를 반환합니다.
    - 구현은 간단하지만, 첫 응답까지의 시간(TTFB)이 길어지고, Lambda의 6MB 응답 페이로드 크기 제한에 걸릴 수 있습니다.
3.  **Lambda Web Adapter 사용:**
    - AWS Lambda Web Adapter를 사용하여 FastAPI, Flask 등 Python 웹 프레임워크를 Lambda에서 실행하고, 해당 프레임워크가 제공하는 스트리밍 응답 기능을 활용합니다. (추가적인 설정 및 학습 필요)
4.  **(만약 가능하다면) Node.js 런타임 사용:**
    - AWS Lambda가 공식적으로 응답 스트리밍을 지원하는 Node.js 런타임으로 함수를 재작성하는 것을 고려할 수 있습니다.

현 상황에서는 **API Gateway WebSocket API**가 기존의 스트리밍 요구사항을 충족하면서 Python 런타임을 계속 사용할 수 있는 가장 유력한 대안으로 보입니다.
