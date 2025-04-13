# lambda_function.py
# Non-streaming version for Step Functions integration
import json
import asyncio
import os
import sys
import traceback
import uuid # For generating problemId
import datetime # Added for timestamp
from pathlib import Path

# --- Enhanced Logging & Import Handling --- 
print("Lambda function initializing...")

try:
    print("Importing boto3...")
    import boto3 # Added for DynamoDB access
    print("boto3 imported successfully.")
    from botocore.exceptions import ClientError
    print("botocore.exceptions imported successfully.")
except ImportError as e:
    print(f"FATAL: Failed to import boto3 or botocore: {e}")
    traceback.print_exc()
    # Optionally, raise an exception here to prevent handler execution
    # raise RuntimeError(f"Failed to import critical AWS SDK modules: {e}")
    boto3 = None
    ClientError = None

# --- problem-generator 모듈 임포트 (같은 디렉토리에 병합됨) ---
ProblemGenerator = None
ALGORITHM_TYPES = []
DIFFICULTY_LEVELS = []
try:
    print("Attempting to import generation.generator...")
    # Add the directory containing 'generation' to sys.path if needed (redundant if structure is standard)
    # current_dir = Path(__file__).parent
    # if str(current_dir) not in sys.path:
    #     sys.path.insert(0, str(current_dir))
    #     print(f"Added {current_dir} to sys.path")

    from generation.generator import ProblemGenerator, ALGORITHM_TYPES, DIFFICULTY_LEVELS
    print("generation.generator imported successfully.")

except ImportError as e:
    print(f"ERROR: Failed to import from generation.generator: {e}")
    print("sys.path:", sys.path)
    # Attempt to list contents of the directory where generation should be
    try:
        gen_dir = Path(__file__).parent / 'generation'
        print(f"Contents of {gen_dir}:")
        for item in gen_dir.iterdir():
            print(f"- {item.name}")
    except Exception as list_e:
        print(f"Could not list contents of generation directory: {list_e}")
    traceback.print_exc()
    # ProblemGenerator will remain None

# --- DynamoDB 설정 --- (Check if boto3 was imported)
PROBLEMS_TABLE_NAME = os.environ.get('PROBLEMS_TABLE_NAME', 'Problems')
dynamodb_client = None
if boto3 is None:
    print("WARNING: boto3 failed to import, DynamoDB client cannot be initialized.")

# --- API Gateway Management API 클라이언트 제거 ---
# apigateway_management_api = None
# def get_apigateway_management_api(event): ... (함수 제거) ...

# --- WebSocket 메시지 전송 함수 제거 ---
# async def post_to_connection(connection_id: str, message: str, event: dict): ... (함수 제거) ...

# --- WebSocket 메시지 포맷 함수 제거 ---
# def format_websocket_message(msg_type: str, payload: any) -> str: ... (함수 제거) ...

# --- 헬퍼 함수 (find_algorithm_type 유지) ---
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

# --- DynamoDB 저장 함수 (유지) ---
def save_problem_to_dynamodb(problem_data: dict):
    """생성된 문제 데이터를 DynamoDB에 저장합니다."""
    global dynamodb_client
    if boto3 is None:
        print("Cannot save to DynamoDB: boto3 failed to import.")
        return None

    if dynamodb_client is None:
        print("Initializing DynamoDB client...")
        dynamodb_client = boto3.client('dynamodb')
        print("DynamoDB client initialized.")

    problem_id = str(uuid.uuid4())
    current_time = datetime.datetime.utcnow().isoformat()
    # Use snake_case for attribute names (reverted)
    item_to_save = {
        'problemId': {'S': problem_id},
        'title': {'S': problem_data.get('problem_title', 'Untitled Problem')},
        'description': {'S': problem_data.get('description', '')},
        'input_format': {'S': problem_data.get('input_format', '')},
        'output_format': {'S': problem_data.get('output_format', '')},
        'constraints': {'S': problem_data.get('constraints', '')},
        'difficulty': {'S': problem_data.get('difficulty', 'Unknown')},
        'algorithmType': {'S': problem_data.get('algorithmType', 'Unknown')},
        'solution_code': {'S': problem_data.get('solution_code', '')},
        'testcases': {'S': json.dumps(problem_data.get('generated_examples', []))},
        'example_input': {'S': json.dumps(problem_data.get('example_input', None))},
        'example_output': {'S': json.dumps(problem_data.get('example_output', None))},
        'test_case_generation_code': {'S': problem_data.get('test_case_generation_code', '')},
        'genStatus': {'S': 'completed'}, # Assuming generation is complete when saving
        'createdAt': {'S': current_time},
        'updatedAt': {'S': current_time},
        'likesCount': {'N': '0'},
        # 'creatorId': {'S': 'generator'} # 원래 하드코딩된 값
        'creatorId': {'S': ''} # TODO: 추후 실제 사용자 ID로 업데이트 필요
    }
    
    # Add optional fields with snake_case names if they exist in problem_data (reverted)
    if 'template_source' in problem_data:
        item_to_save['template_source'] = {'S': problem_data['template_source']}
    if 'algorithm_hint' in problem_data:
        item_to_save['algorithm_hint'] = {'S': problem_data['algorithm_hint']}
    if 'language' in problem_data:
        item_to_save['language'] = {'S': problem_data['language']}
        

    try:
        dynamodb_client.put_item(
            TableName=PROBLEMS_TABLE_NAME,
            Item=item_to_save
        )
        print(f"Successfully saved problem {problem_id} to DynamoDB.")
        # Reconstruct the dictionary with snake_case keys (reverted)
        saved_data_dict = {k: list(v.values())[0] for k, v in item_to_save.items()}
        saved_data_dict['likesCount'] = int(saved_data_dict['likesCount'])
        # Parse JSON strings back to objects
        try: saved_data_dict['testcases'] = json.loads(saved_data_dict.get('testcases', '[]')) # Reverted
        except json.JSONDecodeError: saved_data_dict['testcases'] = []
        try: saved_data_dict['example_input'] = json.loads(saved_data_dict.get('example_input', 'null')) # Reverted
        except json.JSONDecodeError: saved_data_dict['example_input'] = None
        try: saved_data_dict['example_output'] = json.loads(saved_data_dict.get('example_output', 'null')) # Reverted
        except json.JSONDecodeError: saved_data_dict['example_output'] = None
            
        return saved_data_dict
    except ClientError as e:
        print(f"Error saving problem to DynamoDB: {e.response['Error']['Message']}")
        return None
    except Exception as e:
        print(f"Unexpected error saving to DynamoDB: {e}")
        return None

# --- Synchronous handler for Step Functions ---
def handler(event, context):
    print("--- Sync handler entry (Step Functions) ---")
    request_id = context.aws_request_id
    # Log the environment variable value for debugging
    google_api_key_env_var = os.environ.get('GOOGLE_AI_KEY')
    print(f"[{request_id}] Value of GOOGLE_AI_KEY environment variable: {google_api_key_env_var}")
    print(f"[{request_id}] Received event: {json.dumps(event)}")

    # Check if critical imports failed
    if boto3 is None:
        print(f"[{request_id}] FATAL: boto3 failed to import during initialization. Aborting.")
        # Return an error appropriate for Step Functions/invoker
        return {'error': 'InternalServerError', 'cause': 'AWS SDK failed to load'}
    if ProblemGenerator is None:
         print(f"[{request_id}] FATAL: ProblemGenerator failed to import during initialization. Aborting.")
         return {'error': 'InternalServerError', 'cause': 'Core generator module failed to load'}

    try:
        # API client initialization removed

        # ProblemGenerator import check (already done, but keep for safety)
        if ProblemGenerator is None:
            raise RuntimeError("Failed to import ProblemGenerator module.")

        # Input parameter extraction
        prompt_input = event.get("prompt")
        difficulty_input = event.get("difficulty")

        if not prompt_input or not difficulty_input:
             raise ValueError("Input missing 'prompt' or 'difficulty'.")

        # Difficulty validation
        if not DIFFICULTY_LEVELS:
             print("Warning: DIFFICULTY_LEVELS not loaded.")
             difficulty = difficulty_input
        elif difficulty_input not in DIFFICULTY_LEVELS:
            raise ValueError(f"Invalid 'difficulty' value: {difficulty_input}. Valid values: {DIFFICULTY_LEVELS}")
        else:
            difficulty = difficulty_input

        print(f"[{request_id}] Parsed request - Prompt: {prompt_input}, Difficulty: {difficulty}")

        # Algorithm type extraction
        algorithm_type = find_algorithm_type(prompt_input)
        if not algorithm_type:
            if ALGORITHM_TYPES:
                algorithm_type = ALGORITHM_TYPES[0]
            else:
                 print("Warning: ALGORITHM_TYPES not loaded. Using default 'Implementation'.")
                 algorithm_type = "구현"
            print(f"Algorithm type detection failed. Proceeding with '{algorithm_type}'.")
        else:
            print(f"Algorithm type detected: '{algorithm_type}'")

        # ProblemGenerator instance creation
        print(f"[{request_id}] Creating ProblemGenerator instance...")
        generator = ProblemGenerator(verbose=os.environ.get('GENERATOR_VERBOSE', 'False').lower() == 'true')
        print(f"[{request_id}] ProblemGenerator instance created.")

        # --- Problem generation call (Run async function synchronously with explicit error catching) ---
        print(f"[{request_id}] Starting problem generation...")
        generated_problem_data = None # Initialize result variable
        try:
            # Use asyncio.run to execute the async generator function
            generated_problem_data = asyncio.run(generator.generate_problem_stream(
                algorithm_type=algorithm_type,
                difficulty=difficulty,
                stream_callback=None, # No callback needed for sync invocation
                verbose=generator.verbose # Pass verbose flag
            ))
            print(f"[{request_id}] asyncio.run(generate_problem_stream) completed.")

        except Exception as async_e:
            # Catch any exception raised from within generate_problem_stream
            error_message = f"Error during asyncio.run(generate_problem_stream): {type(async_e).__name__} - {str(async_e)}"
            print(f"[{request_id}] {error_message}")
            print(traceback.format_exc()) # Log the full traceback from the async error
            # Optionally re-raise or return a specific error structure
            # For Step Functions, returning an error might be better than raising
            return {
                 'statusCode': 500,
                 'body': json.dumps({'error': 'Problem generation failed internally.'}),
                 'error': {'type': type(async_e).__name__, 'message': error_message}
            }

        print(f"[{request_id}] Problem generation finished. Result type: {type(generated_problem_data)}")

        # Save the single generated problem to DB
        saved_problem_output = None
        if isinstance(generated_problem_data, dict) and generated_problem_data.get('problem_title'): # Check if it's a valid dict
            # Add missing fields if necessary (though integration_prompt should handle this)
            if 'difficulty' not in generated_problem_data: generated_problem_data['difficulty'] = difficulty
            if 'algorithmType' not in generated_problem_data: generated_problem_data['algorithmType'] = algorithm_type

            # DynamoDB 저장 시도 및 결과 처리
            saved_data = save_problem_to_dynamodb(generated_problem_data)
            if saved_data and 'problemId' in saved_data:
                saved_problem_output = saved_data # 성공적으로 저장된 문제
                print(f"[{request_id}] Successfully processed and saved problem: {saved_data['problemId']}")
            else:
                # 저장 실패 처리 (로그는 이미 save_problem_to_dynamodb에서 남김)
                print(f"[{request_id}] Failed to save generated problem: {generated_problem_data.get('problem_title', 'N/A')}")
                # Return an error for Step Functions
                return {
                    'statusCode': 500,
                    'body': json.dumps({'error': 'Failed to save problem to DynamoDB.'}),
                    'error': {'type': 'DynamoDBSaveError', 'message': 'Failed to save problem data after generation.'}
                }
        elif generated_problem_data is None:
             print(f"[{request_id}] Problem generation failed or returned None.")
             # Return an error indicating generation failure
             return {
                 'statusCode': 500,
                 'body': json.dumps({'error': 'Problem generation returned no data.'}),
                 'error': {'type': 'GenerationFailure', 'message': 'Generator function returned None.'}
             }
        else:
             # This case should ideally not happen if generator returns dict or None
             print(f"[{request_id}] Warning: generate_problem returned unexpected type: {type(generated_problem_data)}. Cannot process.")
             return {
                 'statusCode': 500,
                 'body': json.dumps({'error': 'Problem generation returned unexpected data type.'}),
                 'error': {'type': 'UnexpectedReturnType', 'message': f'Generator returned {type(generated_problem_data)}'}
             }

        # Successfully generated and saved
        print(f"[{request_id}] Request processed successfully. Returning saved problem data.")
        return saved_problem_output # Return the saved problem data (including problemId)

    except ValueError as ve:
        print(f"[{request_id}] Input validation error: {ve}")
        return {'statusCode': 400, 'body': json.dumps({'error': str(ve)})}
    except ClientError as ce:
        # Handle potential DynamoDB client errors during save (though handled in save func too)
        error_code = ce.response.get('Error', {}).get('Code')
        error_message = ce.response.get('Error', {}).get('Message')
        print(f"[{request_id}] AWS ClientError: {error_code} - {error_message}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'AWS Service Error', 'details': error_message}),
            'error': {'type': error_code, 'message': error_message}
        }
    except Exception as e:
        # Catch-all for other unexpected errors
        error_type = type(e).__name__
        print(f"[{request_id}] General Exception occurred: {error_type} - {e}")
        traceback.print_exc()
        # Return a generic server error
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal Server Error'}),
            'error': {'type': error_type, 'message': str(e)}
        }

    # finally 블록 제거 (Lambda 핸들러에서는 필요 없음)

# --- 이전 동기 핸들러 및 관련 로직 제거 ---
# async def async_logic(event, context): ... (제거) ...
# def handler(event, context): ... (제거) ... 