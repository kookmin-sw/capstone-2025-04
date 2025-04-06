# backend/lambdas/problem-generator-streaming/local_test_streaming.py
import asyncio
import json
import uuid
import sys
import os # os 모듈 임포트 추가
import traceback # traceback 임포트 추가
from pathlib import Path
from unittest.mock import MagicMock
from dotenv import load_dotenv # dotenv 임포트 추가

# --- 경로 설정 강화 ---
# 현재 파일 위치
current_dir = Path(__file__).parent
# lambdas 디렉토리
lambdas_dir = current_dir.parent
# problem-generator 모듈 경로
problem_generator_module_dir = lambdas_dir / "problem-generator"
# 프로젝트 루트 경로 (backend 디렉토리)
project_root = lambdas_dir.parent

# .env 파일 로드 (프로젝트 루트에 있다고 가정)
dotenv_path = project_root / '.env'
if dotenv_path.exists():
    load_dotenv(dotenv_path=dotenv_path)
    print(f"Loaded environment variables from: {dotenv_path}")
else:
    print(f"Warning: .env file not found at {dotenv_path}. Make sure GOOGLE_AI_API_KEY is set elsewhere.")


# 필요한 경로들을 sys.path에 추가
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))
if str(problem_generator_module_dir) not in sys.path:
    sys.path.insert(0, str(problem_generator_module_dir))
    print(f"Added to sys.path: {problem_generator_module_dir}")

# 테스트 대상 핸들러 임포트
from lambda_function import handler, format_stream_message

# --- Mock Objects ---
class MockLambdaContext:
    """Lambda Context 객체를 모방합니다."""
    def __init__(self, response_stream):
        self.aws_request_id = f"local-test-{uuid.uuid4()}"
        self._response_stream = response_stream
        # response_stream 에 context 참조 추가
        self._response_stream.context = self

    def get_response_stream(self):
        return self._response_stream

class MockResponseStream:
    """Lambda 스트리밍 응답 객체를 모방합니다."""
    def __init__(self):
        self.closed = False
        self.context = None # MockLambdaContext 가 설정할 예정

    def write(self, data: bytes):
        if self.closed:
            print("Warning: Attempted to write to a closed stream")
            return
        try:
            # 수신된 바이트 데이터를 디코딩하고 JSON으로 파싱하여 출력
            decoded_line = data.decode('utf-8').strip()
            if decoded_line:
                message = json.loads(decoded_line)
                print(f"[STREAM] Type: {message.get('type', 'N/A')}, Payload: {message.get('payload', '')}")
            else:
                 print("[STREAM] Received empty line.")
        except json.JSONDecodeError:
            print(f"[STREAM] Received non-JSON line: {data.decode('utf-8', errors='ignore').strip()}")
        except Exception as e:
             print(f"[STREAM] Error processing stream data: {e}")

    def close(self):
        if not self.closed:
            print("[STREAM] Stream closed.")
            self.closed = True

# --- 테스트 실행 ---
async def run_test():
    print("--- Starting Local Streaming Test ---")

    # 1. Mock 객체 생성
    mock_stream = MockResponseStream()
    mock_context = MockLambdaContext(mock_stream)

    # 2. 테스트 이벤트 생성 (Lambda 함수 URL POST 요청 시뮬레이션)
    test_event = {
        "requestContext": {
            "http": {
                "method": "POST",
                "path": "/generate", # 예시 경로
            }
        },
        # 요청 본문 (프론트엔드에서 보낼 내용)
        "body": json.dumps({
            "prompt": "깊이 우선 탐색 기본 문제 만들어줘", # 테스트할 프롬프트
            "difficulty": "Medium"                # 테스트할 난이도
        }),
        "isBase64Encoded": False
    }

    # 3. 핸들러 실행
    try:
        print(f"Calling handler with Request ID: {mock_context.aws_request_id}")
        # 핸들러는 완료 시 최종 결과(final_payload)를 반환하지만,
        # 스트리밍 과정은 MockResponseStream의 write 메서드를 통해 출력됨
        await handler(test_event, mock_context)
        print("Handler execution finished.")

    except Exception as e:
        print(f"--- Handler Error ---")
        print(traceback.format_exc())

    print("--- Local Streaming Test Finished ---")

if __name__ == "__main__":
    # 환경 변수 로드 확인 (실제 키 필요)
    # api_key = os.environ.get("GOOGLE_AI_API_KEY") # dotenv로 로드 시도하므로, 여기서 다시 체크할 필요 감소
    # if not api_key:
    #      print("\nWARNING: GOOGLE_AI_API_KEY environment variable is not set or loaded from .env.")
    #      print("The test will likely fail when calling the actual LLM.")
    #      # sys.exit(1) # 필요시 테스트 중단

    # 명시적으로 api 키 로드 확인
    if not os.getenv("GOOGLE_AI_API_KEY"):
        print("\nERROR: GOOGLE_AI_API_KEY is not set in environment variables or loaded from .env.")
        print("Cannot proceed with the test.")
        sys.exit(1)

    asyncio.run(run_test()) 