# lambda_function.py
import json
import asyncio
import os
import sys
import traceback
import uuid # For generating problemId
from pathlib import Path
import boto3 # Added for DynamoDB access
from botocore.exceptions import ClientError # Added for DynamoDB error handling

# --- 경로 설정: problem-generator 모듈 임포트를 위해 ---
# 이 Lambda 함수 파일의 위치를 기준으로 problem-generator 디렉토리 경로 계산
current_dir = Path(__file__).parent
generator_lambda_dir = current_dir.parent.parent / 'lambdas' / 'problem-generator'
if str(generator_lambda_dir) not in sys.path:
    sys.path.insert(0, str(generator_lambda_dir))
# --- 경로 설정 끝 ---

# --- problem-generator 모듈 임포트 ---
try:
    # generator 모듈 및 필요한 상수 임포트
    from generation.generator import ProblemGenerator, ALGORITHM_TYPES, DIFFICULTY_LEVELS
    # 환경 변수 로드를 위해 load_dotenv 임포트 (필요시)
    from dotenv import load_dotenv
    # .env 파일 로드 (Lambda 환경변수를 우선 사용)
    generator_env_path = generator_lambda_dir / '.env'
    if generator_env_path.exists():
        load_dotenv(dotenv_path=generator_env_path)
        print("Loaded .env from problem-generator")

except ImportError as e:
    print(f"Error importing from problem-generator: {e}")
    # 필요한 경우, 의존성 없이는 작동할 수 없으므로 핸들러에서 오류 처리
    ProblemGenerator = None # 임포트 실패 시 핸들러에서 확인용
    ALGORITHM_TYPES = []
    # 임시 기본값 - generation.generator에서 실제 값을 가져오므로 주석 처리 또는 제거 가능
    # DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"] # 임시 기본값

# --- DynamoDB 설정 ---
# 환경 변수에서 테이블 이름 가져오기, 없으면 기본값 'Problems' 사용
PROBLEMS_TABLE_NAME = os.environ.get('PROBLEMS_TABLE_NAME', 'Problems')
dynamodb_client = None

# --- 헬퍼 함수 ---
def format_stream_message(msg_type: str, payload: any) -> str:
    """스트리밍 메시지를 JSON Lines 형식으로 포맷합니다."""
    return json.dumps({"type": msg_type, "payload": payload}) + "\n"

def find_algorithm_type(prompt: str) -> str | None:
    """간단한 키워드 매칭으로 프롬프트에서 알고리즘 유형을 찾습니다."""
    if not prompt: return None
    prompt_lower = prompt.lower()
    for alg_type in ALGORITHM_TYPES:
        # 한국어 및 영어 키워드 고려 (예시, 실제로는 더 정교한 매칭 필요)
        keywords = [alg_type.lower()]
        if "그래프" in alg_type:
            keywords.append("graph")
        if "다이나믹" in alg_type or "dynamic" in alg_type:
            keywords.extend(["dp", "dynamic programming"])
        if "구현" in alg_type:
            keywords.append("implementation")
        # ... 다른 유형에 대한 키워드 추가 ...

        for keyword in keywords:
            if keyword in prompt_lower:
                return alg_type # 매칭되는 첫 번째 유형 반환
    return None # 매칭 실패 시

# --- DynamoDB 저장 함수 ---
def save_problem_to_dynamodb(problem_data: dict):
    """생성된 문제 데이터를 DynamoDB에 저장합니다."""
    global dynamodb_client
    if dynamodb_client is None:
        dynamodb_client = boto3.client('dynamodb')

    problem_id = str(uuid.uuid4())
    item_to_save = {
        'problemId': {'S': problem_id},
        # 여기에 problem_data의 다른 필드들을 DynamoDB 형식에 맞게 추가해야 합니다.
        # 예시: (실제 ProblemGenerator 반환값 구조에 맞게 수정 필요)
        'title': {'S': problem_data.get('title', 'N/A')},
        'description': {'S': problem_data.get('description', '')},
        # testcases는 JSON 문자열 또는 DynamoDB List/Map 형태로 저장 가능
        'testcases': {'S': json.dumps(problem_data.get('testcases', []))},
        'difficulty': {'S': problem_data.get('difficulty', 'Medium')},
        'algorithmType': {'S': problem_data.get('algorithmType', 'Implementation')},
        # 생성 시간 등 메타데이터 추가 가능
        'createdAt': {'S': str(asyncio.get_event_loop().time())} # Simple timestamp
    }

    try:
        dynamodb_client.put_item(
            TableName=PROBLEMS_TABLE_NAME,
            Item=item_to_save
        )
        print(f"Successfully saved problem {problem_id} to DynamoDB.")
        return problem_id # 저장된 ID 반환
    except ClientError as e:
        print(f"Error saving problem to DynamoDB: {e.response['Error']['Message']}")
        # 오류 발생 시 어떻게 처리할지 결정 (예: None 반환, 예외 다시 발생 등)
        return None
    except Exception as e:
        print(f"Unexpected error saving to DynamoDB: {e}")
        return None

# --- Lambda 핸들러 ---
async def handler(event, context):
    """ AWS Lambda 스트리밍 응답 핸들러 """
    response_stream = context.get_response_stream()
    request_body = {}
    request_id = context.aws_request_id
    # api_key = os.environ.get("GOOGLE_AI_API_KEY") # Lambda 환경 변수에서 API 키 가져오기 - 제거

    try:
        # 사전 확인: ProblemGenerator 임포트 성공 여부
        if ProblemGenerator is None:
             raise RuntimeError("Failed to import ProblemGenerator module. Check paths and dependencies.")

        print(f"[{request_id}] Request received: {event.get('rawPath', '')}")
        body_str = event.get("body", "{}")
        request_body = json.loads(body_str)
        prompt_input = request_body.get("prompt")
        difficulty_input = request_body.get("difficulty") # 예: "튜토리얼", "쉬움", "보통", "어려움"

        if not prompt_input or not difficulty_input:
            raise ValueError("Missing 'prompt' or 'difficulty' in request body")

        # 난이도 값 검증
        if difficulty_input not in DIFFICULTY_LEVELS:
            raise ValueError(f"Invalid 'difficulty' value: {difficulty_input}. Must be one of {DIFFICULTY_LEVELS}")
        difficulty = difficulty_input # 매핑 없이 직접 사용

        print(f"[{request_id}] Parsed request - Prompt: {prompt_input}, Difficulty: {difficulty}")

        # 상태 업데이트: 요청 분석 시작
        response_stream.write(format_stream_message("status", f"요청 분석 시작: '{prompt_input}' ({difficulty})").encode('utf-8'))

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
        # if not api_key: # 제거
        #      raise ValueError("API Key (GOOGLE_AI_API_KEY) is not configured in Lambda environment.")
        # verbose=False 로 설정하여 Lambda 로그를 간결하게 유지 가능
        # api_key 인자를 명시적으로 전달하지 않아 ProblemGenerator 내부에서 환경 변수를 확인하도록 함
        generator = ProblemGenerator(verbose=False)

        # --- 문제 생성 스트리밍 호출 ---
        # generate_problem_stream은 성공 시 문제 객체 리스트를 반환, 실패 시 예외 발생
        generated_problems_list = await generator.generate_problem_stream(
            algorithm_type=algorithm_type,
            difficulty=difficulty,
            response_stream=response_stream,
            format_stream_message_func=format_stream_message,
            verbose=False # Lambda 환경에서는 False 권장
        )

        # --- 생성된 문제 DB 저장 및 ID 추가 ---
        saved_problems_with_id = []
        if isinstance(generated_problems_list, list):
            for problem_data in generated_problems_list:
                # 각 문제에 difficulty, algorithmType 정보 추가 (ProblemGenerator가 반환하지 않을 경우)
                if 'difficulty' not in problem_data:
                    problem_data['difficulty'] = difficulty
                if 'algorithmType' not in problem_data:
                    problem_data['algorithmType'] = algorithm_type

                problem_id = save_problem_to_dynamodb(problem_data)
                if problem_id:
                    problem_data['problemId'] = problem_id # 스트리밍 결과에도 ID 추가
                saved_problems_with_id.append(problem_data)
        else:
            # 예상치 못한 반환 타입 처리 (오류 또는 단일 객체 등)
            print(f"Warning: generate_problem_stream returned unexpected type: {type(generated_problems_list)}")
            # 필요시 이 경우에 대한 처리 로직 추가
            saved_problems_with_id = generated_problems_list # 임시로 그대로 사용

        # --- 최종 결과 전송 (ID 포함된 데이터) ---
        response_stream.write(format_stream_message("result", saved_problems_with_id).encode('utf-8'))

        # --- 최종 상태 ---
        response_stream.write(format_stream_message("status", "✅ 생성 완료 및 저장됨!").encode('utf-8'))
        print(f"[{request_id}] Request processed and problems saved successfully.")

    except ValueError as ve:
        print(f"[{request_id}] Error processing request: {traceback.format_exc()}")
        error_message = f"오류 발생: {str(ve)}"
        try:
            response_stream.write(format_stream_message("error", error_message).encode('utf-8'))
            response_stream.write(format_stream_message("status", "❌ 오류 발생").encode('utf-8'))
        except Exception as write_err:
            print(f"[{request_id}] Failed to write error to stream: {write_err}")

    except Exception as e:
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