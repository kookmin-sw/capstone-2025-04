# lambda_function.py
# Force update comment
import json
import asyncio
import os
import sys
import traceback
import uuid # For generating problemId
from pathlib import Path
import boto3 # Added for DynamoDB access
from botocore.exceptions import ClientError, GoneException # Added GoneException

# --- 경로 설정 제거: Lambda Layer 사용으로 불필요 ---
# current_dir = Path(__file__).parent
# generator_lambda_dir = current_dir.parent.parent / 'lambdas' / 'problem-generator'
# if str(generator_lambda_dir) not in sys.path:
#     sys.path.insert(0, str(generator_lambda_dir))
# --- 경로 설정 끝 ---

# --- problem-generator 모듈 임포트 (같은 디렉토리에 병합됨) ---
try:
    # generator 모듈 및 필요한 상수 임포트
    from generation.generator import ProblemGenerator, ALGORITHM_TYPES, DIFFICULTY_LEVELS

except ImportError as e:
    print(f"Error importing required modules: {e}") # 오류 메시지 수정
    # 필요한 경우, 의존성 없이는 작동할 수 없으므로 핸들러에서 오류 처리
    ProblemGenerator = None # 임포트 실패 시 핸들러에서 확인용
    ALGORITHM_TYPES = []
    DIFFICULTY_LEVELS = [] # DIFFICULT_LEVELS 상수 사용 확인 필요
    # 임시 기본값 - generation.generator에서 실제 값을 가져오므로 주석 처리 또는 제거 가능
    # DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"] # 임시 기본값

# --- DynamoDB 설정 ---
# 환경 변수에서 테이블 이름 가져오기, 없으면 기본값 'Problems' 사용
PROBLEMS_TABLE_NAME = os.environ.get('PROBLEMS_TABLE_NAME', 'Problems')
dynamodb_client = None

# --- API Gateway Management API 클라이언트 --- (Lazy initialization)
apigateway_management_api = None

# --- API Gateway Management API 클라이언트 가져오기/초기화 ---
def get_apigateway_management_api(event):
    """Initializes and returns the API Gateway Management API client."""
    global apigateway_management_api
    if apigateway_management_api is None:
        # API Gateway의 endpoint URL은 event에서 동적으로 가져옵니다.
        domain_name = event.get('requestContext', {}).get('domainName') # 기본값 추가
        stage = event.get('requestContext', {}).get('stage') # 기본값 추가
        if not domain_name or not stage:
            # CloudWatch 로그에는 기록하되, 클라이언트에게 오류 전송은 어려움
            print("ERROR: Could not determine API Gateway endpoint URL from event")
            # 필요하다면 여기서 예외를 발생시켜 핸들러 레벨에서 처리
            raise ValueError("Could not determine API Gateway endpoint URL from event")
        endpoint_url = f"https://{domain_name}/{stage}"
        print(f"Initializing ApiGatewayManagementApi client for endpoint: {endpoint_url}")
        apigateway_management_api = boto3.client('apigatewaymanagementapi', endpoint_url=endpoint_url)
    return apigateway_management_api

# --- WebSocket 메시지 전송 함수 ---
async def post_to_connection(connection_id: str, message: str, event: dict):
    """Sends a message to a specific WebSocket connection."""
    try:
        api_client = get_apigateway_management_api(event) # 이벤트에서 클라이언트 가져오기
        await asyncio.to_thread(
            api_client.post_to_connection,
            ConnectionId=connection_id,
            Data=message.encode('utf-8') # 메시지를 바이트로 인코딩
        )
        # print(f"Successfully posted message to {connection_id}") # 너무 많으면 주석 처리
    except GoneException:
        print(f"Connection {connection_id} not found (GoneException). Client likely disconnected.")
        # 연결이 끊어졌으므로 더 이상 이 connection_id로 메시지를 보내지 않음
        # 필요하다면 연결 상태를 DB 등에서 업데이트
    except ClientError as e:
        print(f"Error posting message to {connection_id}: {e.response['Error']['Message']}")
    except Exception as e:
        print(f"Unexpected error posting message to {connection_id}: {e}")
        print(traceback.format_exc())

# --- 헬퍼 함수 ---
def format_websocket_message(msg_type: str, payload: any) -> str:
    """WebSocket 메시지를 JSON 문자열로 포맷합니다."""
    # JSON Lines 대신 단일 JSON 객체로 변경
    return json.dumps({"type": msg_type, "payload": payload})

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

# --- 비동기 로직을 포함하는 기본 핸들러 ---
async def handler(event, context):
    print("--- Async handler entry (WebSocket) ---")
    request_id = context.aws_request_id
    connection_id = event.get('requestContext', {}).get('connectionId')

    if not connection_id:
        print("ERROR: Connection ID not found in event. Not a WebSocket request?")
        # WebSocket 호출이 아니면 오류 처리 (API GW 설정 오류 가능성)
        # API Gateway 프록시 통합에 오류 응답 반환 시도 (호출 방식에 따라 효과 없을 수 있음)
        return {'statusCode': 400, 'body': 'Connection ID missing.'}

    try:
        # API 클라이언트 초기화 시도 (여기서 실패하면 아래 post_to_connection 호출 불가)
        get_apigateway_management_api(event)

        # ProblemGenerator 임포트 확인
        if ProblemGenerator is None:
            raise RuntimeError("Failed to import ProblemGenerator module.")

        print(f"[{request_id}] Processing request for connection: {connection_id}")
        body_str = event.get("body", "{}")
        request_body = json.loads(body_str)

        # API Gateway WebSocket 라우팅 방식에 따라 action 필드 확인
        action = request_body.get('action')
        if action != 'generateProblem':
             print(f"Ignoring message with unknown action: {action}")
             # 연결 자체는 성공했으므로 200 OK 반환
             return {'statusCode': 200, 'body': f'Ignoring action: {action}'}

        # 실제 요청 데이터 추출 (body 안에 있다고 가정)
        prompt_input = request_body.get("prompt")
        difficulty_input = request_body.get("difficulty")

        if not prompt_input or not difficulty_input:
            await post_to_connection(connection_id, format_websocket_message("error", "요청 본문에 'prompt' 또는 'difficulty'가 누락되었습니다."), event)
            return {'statusCode': 400, 'body': 'Missing prompt or difficulty.'}

        # DIFFICULTY_LEVELS 임포트 여부 확인 및 유효성 검사
        if not DIFFICULTY_LEVELS:
             print("Warning: DIFFICULTY_LEVELS not loaded.")
             # 임시 검증 없이 진행하거나, 기본값으로 검증
             difficulty = difficulty_input # 일단 진행
        elif difficulty_input not in DIFFICULTY_LEVELS:
            await post_to_connection(connection_id, format_websocket_message("error", f"잘못된 'difficulty' 값입니다: {difficulty_input}. 유효한 값: {DIFFICULTY_LEVELS}"), event)
            return {'statusCode': 400, 'body': f'Invalid difficulty: {difficulty_input}'}
        else:
            difficulty = difficulty_input

        print(f"[{request_id}] Parsed request - Prompt: {prompt_input}, Difficulty: {difficulty}")

        # 상태 업데이트: 클라이언트에게 전송
        await post_to_connection(connection_id, format_websocket_message("status", f"요청 분석 시작: '{prompt_input}' ({difficulty})"), event)

        # 알고리즘 유형 추출 및 전송
        algorithm_type = find_algorithm_type(prompt_input)
        if not algorithm_type:
            # ALGORITHM_TYPES 임포트 여부 확인
            if ALGORITHM_TYPES:
                algorithm_type = ALGORITHM_TYPES[0] # 첫 번째 유형을 기본값으로 사용 (예: "구현")
            else:
                 print("Warning: ALGORITHM_TYPES not loaded. Using default 'Implementation'.")
                 algorithm_type = "구현" # 하드코딩된 기본값

            await post_to_connection(connection_id, format_websocket_message("status", f"알고리즘 유형 자동 감지 실패. '{algorithm_type}' 유형으로 진행합니다."), event)
        else:
            await post_to_connection(connection_id, format_websocket_message("status", f"알고리즘 유형 감지됨: '{algorithm_type}'"), event)
        await asyncio.sleep(0.1) # UI 업데이트 시간 확보

        # ProblemGenerator 인스턴스 생성
        # Verbose 설정은 환경 변수나 고정값으로 설정 가능
        generator = ProblemGenerator(verbose=os.environ.get('GENERATOR_VERBOSE', 'False').lower() == 'true')

        # --- 문제 생성 호출 (스트리밍 방식 변경) ---
        # 콜백 함수 정의
        async def websocket_stream_callback(msg_type: str, payload: any):
            """Callback function to send messages via WebSocket."""
            await post_to_connection(connection_id, format_websocket_message(msg_type, payload), event)

        generated_problems_list = await generator.generate_problem_stream(
            algorithm_type=algorithm_type,
            difficulty=difficulty,
            stream_callback=websocket_stream_callback, # 수정된 콜백 전달
            verbose=generator.verbose # 생성자 verbose 설정 사용
        )

        # 생성된 문제 DB 저장 및 ID 추가
        saved_problems_with_id = []
        if isinstance(generated_problems_list, list) and generated_problems_list: # 리스트이고 비어있지 않은 경우
            for problem_data in generated_problems_list:
                 # 데이터 유효성 검사 추가 (예: 필요한 필드 존재 여부)
                 if not isinstance(problem_data, dict) or 'title' not in problem_data:
                      print(f"Warning: Skipping invalid problem data: {problem_data}")
                      continue

                 if 'difficulty' not in problem_data: problem_data['difficulty'] = difficulty
                 if 'algorithmType' not in problem_data: problem_data['algorithmType'] = algorithm_type
                 problem_id = save_problem_to_dynamodb(problem_data) # 동기 함수 호출
                 if problem_id:
                     problem_data['problemId'] = problem_id
                 else:
                     # 저장 실패 시 클라이언트에게 알림 (선택 사항)
                     await post_to_connection(connection_id, format_websocket_message("warning", f"문제 '{problem_data.get('title', 'N/A')}'를 데이터베이스에 저장하지 못했습니다."), event)
                 saved_problems_with_id.append(problem_data)
        elif generated_problems_list: # 리스트는 아니지만 비어있지 않은 경우 (예상치 못한 상황)
            print(f"Warning: generate_problem_stream returned unexpected type: {type(generated_problems_list)}")
            # 이 경우 어떻게 처리할지 결정 (오류로 간주하거나, 그대로 전송 시도)
            await post_to_connection(connection_id, format_websocket_message("error", "문제 생성 결과 형식이 예상과 다릅니다."), event)
        else: # 빈 리스트가 반환된 경우 (생성 실패 또는 오류)
             print(f"[{request_id}] No problems were generated or generation failed.")
             # 이미 stream_callback을 통해 오류가 전송되었을 수 있음
             # 여기서 추가적인 완료 메시지를 보내지 않거나, 실패 상태를 명시적으로 보낼 수 있음

        # 최종 결과 전송 (성공적으로 저장된 문제만)
        if saved_problems_with_id:
            await post_to_connection(connection_id, format_websocket_message("result", saved_problems_with_id), event)
            await post_to_connection(connection_id, format_websocket_message("status", "✅ 문제 생성 및 저장이 완료되었습니다!"), event)
        else:
             # 생성된 문제가 없거나 모두 저장 실패한 경우
             # stream_callback에서 오류가 이미 전송되었을 가능성이 높음
             await post_to_connection(connection_id, format_websocket_message("status", "⚠️ 문제 생성/저장 중 오류가 발생하여 완료된 문제가 없습니다."), event)


        print(f"[{request_id}] Request processed for connection {connection_id}.")
        # API Gateway 프록시 통합 성공 응답
        return {'statusCode': 200, 'body': 'Request processed successfully.'}

    except ValueError as ve: # 입력값 오류 등
        error_message = f"입력 오류: {str(ve)}"
        print(f"[{request_id}] ValueError occurred: {error_message}")
        print(traceback.format_exc())
        # 오류 메시지 클라이언트에게 전송 시도 (연결이 살아있다면)
        if connection_id:
            await post_to_connection(connection_id, format_websocket_message("error", error_message), event)
        # API Gateway 프록시 통합 오류 응답
        return {'statusCode': 400, 'body': error_message}

    except RuntimeError as re: # 모듈 임포트 실패 등
        error_message = f"런타임 오류: {str(re)}"
        print(f"[{request_id}] RuntimeError occurred: {error_message}")
        print(traceback.format_exc())
        if connection_id:
             await post_to_connection(connection_id, format_websocket_message("error", error_message), event)
        return {'statusCode': 500, 'body': error_message}

    except Exception as e: # 그 외 예외
        error_message = f"내부 서버 오류 발생" # 상세 오류는 클라이언트에게 노출하지 않음
        print(f"[{request_id}] General Exception occurred: {type(e).__name__} - {str(e)}")
        print(traceback.format_exc())
        if connection_id:
            await post_to_connection(connection_id, format_websocket_message("error", error_message), event)
        # API Gateway 프록시 통합 오류 응답
        return {'statusCode': 500, 'body': error_message}

    finally:
        print("--- Async handler finished (WebSocket) ---")
        # finally 블록에서는 return을 하지 않음

# --- 이전 동기 핸들러 및 관련 로직 제거 또는 주석 처리 ---
# async def async_logic(event, context):
#    ... (내용은 async def handler로 이동됨) ...

# def handler(event, context):
#    ... (asyncio.run 호출 부분 제거) ... 