# lambda_function.py
import json
import asyncio
import os
import sys
import traceback
from pathlib import Path
from typing import Union

# --- 경로 설정: problem-generator 모듈 임포트를 위해 ---
# Docker 이미지 내 복사된 경로를 사용
generator_module_path = Path("/var/task/problem_generator")
if str(generator_module_path) not in sys.path:
    sys.path.insert(0, str(generator_module_path))
# .env 파일 로드를 위한 경로도 업데이트 (필요한 경우)
generator_env_path = generator_module_path / '.env'
# --- 경로 설정 끝 ---

# --- problem-generator 모듈 임포트 ---
try:
    # generator 모듈 및 필요한 상수 임포트
    from generation.generator import ProblemGenerator, ALGORITHM_TYPES, DIFFICULTY_LEVELS
    # 환경 변수 로드를 위해 load_dotenv 임포트 (필요시)
    from dotenv import load_dotenv
    # .env 파일 로드 (Lambda 환경변수를 우선 사용)
    # generator_env_path = generator_lambda_dir / '.env' # 이전 코드 주석 처리
    if generator_env_path.exists():
        load_dotenv(dotenv_path=generator_env_path)
        print("Loaded .env from problem-generator")

except ImportError as e:
    print(f"Error importing from problem-generator: {e}")
    # 필요한 경우, 의존성 없이는 작동할 수 없으므로 핸들러에서 오류 처리
    ProblemGenerator = None # 임포트 실패 시 핸들러에서 확인용
    ALGORITHM_TYPES = []
    DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"] # 임시 기본값

# --- 헬퍼 함수 ---
def format_stream_message(msg_type: str, payload: any) -> str:
    """스트리밍 메시지를 JSON Lines 형식으로 포맷합니다."""
    return json.dumps({"type": msg_type, "payload": payload}) + "\n"

def find_algorithm_type(prompt: str) -> Union[str, None]:
    """간단한 키워드 매칭으로 프롬프트에서 알고리즘 유형을 찾습니다."""
    if not prompt: return None
    prompt_lower = prompt.lower()
    for alg_type in ALGORITHM_TYPES:
        # 한국어 및 영어 키워드 고려 (예시, 실제로는 더 정교한 매칭 필요)
        keywords = [alg_type.lower()]
        if "그래프" in alg_type: keywords.append("graph")
        if "다이나믹" in alg_type or "dynamic" in alg_type: keywords.extend(["dp", "dynamic programming"])
        if "구현" in alg_type: keywords.append("implementation")
        # ... 다른 유형에 대한 키워드 추가 ...

        for keyword in keywords:
            if keyword in prompt_lower:
                return alg_type # 매칭되는 첫 번째 유형 반환
    return None # 매칭 실패 시

# --- Lambda 핸들러 ---
async def async_handler(event, context):
    """ 실제 비동기 로직을 수행하는 핸들러 """
    response_stream = context.get_response_stream()
    request_body = {}
    request_id = context.aws_request_id
    api_key = os.environ.get("GOOGLE_AI_API_KEY") # Lambda 환경 변수에서 API 키 가져오기
    print(f"[{request_id}] [DEBUG-STEP] Async handler started.") # DEBUG LOG 1

    try:
        print(f"[{request_id}] [DEBUG-STEP] Inside async try block.") # DEBUG LOG 2
        # 사전 확인: ProblemGenerator 임포트 성공 여부
        if ProblemGenerator is None:
             raise RuntimeError("Failed to import ProblemGenerator module. Check paths and dependencies.")

        print(f"[{request_id}] Request received: {event.get('rawPath', '')}")
        body_str = event.get("body", "{}")
        request_body = json.loads(body_str)
        prompt_input = request_body.get("prompt") # 사용자 입력 프롬프트
        difficulty_input = request_body.get("difficulty") # 예: "Easy", "Medium", "Hard"

        if not prompt_input or not difficulty_input:
            raise ValueError("Missing 'prompt' or 'difficulty' in request body")

        # 난이도 매핑 (프론트엔드 형식 -> 내부 형식) - 필요시 조정
        difficulty_map = {"easy": "쉬움", "medium": "보통", "hard": "어려움"}
        difficulty = difficulty_map.get(difficulty_input.lower(), "쉬움") # 기본값 '쉬움'

        print(f"[{request_id}] Parsed request - Prompt: {prompt_input}, Difficulty: {difficulty_input} -> {difficulty}")

        # --- 상태 업데이트: 분석 시작 ---
        response_stream.write(format_stream_message("status", f"요청 분석 시작: '{prompt_input}' ({difficulty})").encode('utf-8'))
        await asyncio.sleep(0.1)

        # --- 알고리즘 유형 추출 ---
        algorithm_type = find_algorithm_type(prompt_input)
        if not algorithm_type:
            # 임시: 유형을 찾지 못하면 기본값 사용 또는 오류 처리
            algorithm_type = "구현" # 또는 다른 기본값
            response_stream.write(format_stream_message("status", f"알고리즘 유형 자동 감지 실패. '{algorithm_type}' 유형으로 진행합니다.").encode('utf-8'))
            await asyncio.sleep(0.1)
            # raise ValueError(f"Could not determine algorithm type from prompt: '{prompt_input}'")
        else:
             response_stream.write(format_stream_message("status", f"알고리즘 유형 감지됨: '{algorithm_type}'").encode('utf-8'))
             await asyncio.sleep(0.1)


        # --- ProblemGenerator 인스턴스 생성 ---
        print(f"[{request_id}] [DEBUG-STEP] Before creating ProblemGenerator instance.") # DEBUG LOG 3
        if not api_key:
             raise ValueError("API Key (GOOGLE_AI_API_KEY) is not configured in Lambda environment.")
        # verbose=False 로 설정하여 Lambda 로그를 간결하게 유지 가능
        generator = ProblemGenerator(api_key=api_key, verbose=False)
        print(f"[{request_id}] [DEBUG-STEP] ProblemGenerator instance created.") # DEBUG LOG 4

        # --- 문제 생성 스트리밍 호출 ---
        print(f"[{request_id}] [DEBUG-STEP] Before calling generate_problem_stream.") # DEBUG LOG 5
        # generate_problem_stream은 성공 시 문제 객체 리스트를 반환, 실패 시 예외 발생
        final_problems = await generator.generate_problem_stream(
            algorithm_type=algorithm_type,
            difficulty=difficulty,
            response_stream=response_stream,
            format_stream_message_func=format_stream_message,
            verbose=False # Lambda 환경에서는 False 권장
        )
        print(f"[{request_id}] [DEBUG-STEP] After calling generate_problem_stream (Success). Final problems: {final_problems}") # DEBUG LOG 6

        # --- 최종 결과 전송 ---
        response_stream.write(format_stream_message("result", final_problems).encode('utf-8'))

        # --- 최종 상태 ---
        response_stream.write(format_stream_message("status", "✅ 생성 완료!").encode('utf-8'))
        print(f"[{request_id}] Request processed successfully.")

    except Exception as e:
        print(f"[{request_id}] [DEBUG-STEP] Inside async except block.") # DEBUG LOG 7
        print(f"[{request_id}] Error processing request: {traceback.format_exc()}")
        error_message = f"오류 발생: {str(e)}"
        try:
            response_stream.write(format_stream_message("error", error_message).encode('utf-8'))
            response_stream.write(format_stream_message("status", "❌ 오류 발생").encode('utf-8'))
        except Exception as write_err:
            print(f"[{request_id}] Failed to write error to stream: {write_err}")

    finally:
        # --- 스트림 닫기 (필수) ---
        response_stream.close()
        print(f"[{request_id}] Response stream closed.")

    # 이 비동기 핸들러는 스트리밍으로 데이터를 보내므로, 명시적인 반환값이 필요 없음 (동기 래퍼가 반환함)
    # return {
    #     'statusCode': 200,
    #     'body': json.dumps({'message': 'Streaming process completed asynchronously.'})
    # } # Remove or comment out this return

# 새로운 동기 래퍼 핸들러
def handler(event, context):
    """Lambda 런타임이 호출할 동기 핸들러. asyncio.run()을 사용하여 비동기 로직 실행."""
    request_id = context.aws_request_id
    print(f"[{request_id}] Synchronous handler invoked.")

    try:
        # 비동기 핸들러 실행
        asyncio.run(async_handler(event, context))
        print(f"[{request_id}] asyncio.run(async_handler) completed.")

        # Lambda/API Gateway 프록시 통합에 대한 기본 성공 응답 반환
        # 스트리밍은 async_handler 내부에서 처리됨
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Request received, streaming process initiated.'})
        }
    except Exception as e:
        # asyncio.run 또는 async_handler 실행 중 발생한 예외 처리
        print(f"[{request_id}] Error in synchronous handler: {traceback.format_exc()}")
        # API Gateway에 오류 응답 반환
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'Internal server error: {str(e)}'})
        } 