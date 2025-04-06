import json
import os
import uuid
import boto3
import logging
import time
import traceback
import re # 정규식 사용을 위해 추가
from botocore.exceptions import ClientError

# 로거 설정
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS 클라이언트 초기화
ecs_client = boto3.client('ecs')
dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3') # S3 클라이언트 추가

# --- 환경 변수 (설정 필요) ---
DYNAMODB_TABLE_NAME = os.environ.get("DYNAMODB_TABLE_NAME", "AlpacoProblems")
DYNAMODB_SUBMISSIONS_TABLE_NAME = os.environ.get("DYNAMODB_SUBMISSIONS_TABLE_NAME", "AlpacoSubmissions") # 채점 결과 저장 테이블
ECS_CLUSTER_NAME = os.environ.get("ECS_CLUSTER_NAME", "AlpacoGraderCluster")
S3_BUCKET_NAME = os.environ.get("S3_BUCKET_NAME") # 결과 저장 S3 버킷 이름
# --- Task Definition ARNs ---
GENERATOR_TASK_DEF_ARN = os.environ.get("GENERATOR_TASK_DEF_ARN")
RUNNER_PYTHON_TASK_DEF_ARN = os.environ.get("RUNNER_PYTHON_TASK_DEF_ARN")
# --- Container Names (Task Definition 내 컨테이너 이름과 일치해야 함) ---
GENERATOR_CONTAINER_NAME = os.environ.get("GENERATOR_CONTAINER_NAME", "generator-container")
RUNNER_PYTHON_CONTAINER_NAME = os.environ.get("RUNNER_PYTHON_CONTAINER_NAME", "runner-python-container")
# --- Networking ---
SUBNET_IDS = os.environ.get("SUBNET_IDS", "").split(',')
SECURITY_GROUP_IDS = os.environ.get("SECURITY_GROUP_IDS", "").split(',')

# --- Helper Functions ---

def get_problem_details(problem_id):
    """DynamoDB에서 문제 정보를 가져옵니다."""
    # TODO: 실제 DynamoDB 테이블 스키마에 맞게 Key 타입과 필드명(Attribute Names)을 조정해야 합니다.
    # 예: problem_id 타입이 문자열(S)인지 숫자(N)인지 확인. 'id'가 실제 키 이름인지 확인.
    # 예: 'constraints_time_limit', 'constraints_memory_limit', 'test_case_generation_code' 등이 실제 속성 이름인지 확인.
    try:
        table = dynamodb.Table(DYNAMODB_TABLE_NAME)
        # problem_id 타입을 테이블 스키마에 맞게 변환 (숫자 또는 문자열)
        # 여기서는 int로 가정, 필요시 수정
        response = table.get_item(Key={'id': int(problem_id)}) # Assuming id is Number type
        if 'Item' not in response:
            raise ValueError(f"Problem with ID {problem_id} not found.")
        item = response['Item']

        # 제약 조건 파싱 개선 (예: 문자열 '1초' -> 숫자 1)
        time_limit_str = item.get("constraints_time_limit", "2s") # 기본 2초
        time_limit = int(re.sub(r'[^0-9]', '', time_limit_str)) # 숫자만 추출
        if time_limit <= 0: time_limit = 2 # 최소 시간 보장

        # 메모리 제한 추가 (예: '512MB' -> 숫자 512)
        memory_limit_str = item.get("constraints_memory_limit", "512MB") # 기본 512MB
        memory_limit = int(re.sub(r'[^0-9]', '', memory_limit_str))
        if memory_limit <= 0: memory_limit = 512 # 최소 메모리 보장

        generation_code = item.get("test_case_generation_code")
        if not generation_code:
             raise ValueError(f"test_case_generation_code is missing for problem {problem_id}")

        return {
            "generation_code": generation_code,
            "time_limit": time_limit,
            "memory_limit": memory_limit, # MB 단위
            # 필요시 다른 필드 추가
        }
    except Exception as e:
        logger.error(f"Error fetching problem details for ID {problem_id}: {e}")
        raise

def run_fargate_task(task_definition_arn, environment_vars, task_tag, container_name):
    """Fargate Task를 실행하고 완료될 때까지 기다린 후 Task ARN과 종료 정보를 반환합니다.
    결과는 S3에 저장된다고 가정합니다."""
    if not SUBNET_IDS or not SECURITY_GROUP_IDS or not SUBNET_IDS[0] or not SECURITY_GROUP_IDS[0] or not S3_BUCKET_NAME:
         raise ValueError("Subnet IDs, Security Group IDs, or S3 Bucket Name are not configured properly.")

    logger.info(f"Running Fargate task {task_tag} with definition: {task_definition_arn}")
    task_arn = None # 초기화
    task_id = None # task_id 초기화
    try:
        response = ecs_client.run_task(
            cluster=ECS_CLUSTER_NAME,
            launchType='FARGATE',
            taskDefinition=task_definition_arn,
            count=1,
            platformVersion='LATEST',
            networkConfiguration={
                'awsvpcConfiguration': {
                    'subnets': SUBNET_IDS,
                    'securityGroups': SECURITY_GROUP_IDS,
                    'assignPublicIp': 'ENABLED' # Public Subnet 사용 가정
                }
            },
            overrides={
                'containerOverrides': [{
                    'name': container_name,
                    'environment': environment_vars,
                }]
            },
            tags=[{'key': 'TaskType', 'value': task_tag}]
        )

        if not response.get('tasks'):
            raise Exception(f"Failed to start Fargate task {task_tag}. Response: {response}")

        task_arn = response['tasks'][0]['taskArn']
        task_id = task_arn.split('/')[-1] # S3 경로 등에 사용
        logger.info(f"Task {task_tag} started: {task_arn} (ID: {task_id})")

        # 완료 대기
        logger.info(f"Waiting for task {task_arn} to complete...")
        waiter = ecs_client.get_waiter('tasks_stopped')
        waiter_delay = 5
        waiter_max_attempts = (15 * 60 // waiter_delay) - 3 # 조금 더 여유 추가
        waiter.wait(
            cluster=ECS_CLUSTER_NAME,
            tasks=[task_arn],
            WaiterConfig={'Delay': waiter_delay, 'MaxAttempts': waiter_max_attempts}
        )
        logger.info(f"Task {task_arn} completed.")

        # Task 종료 정보 가져오기 (상태, 종료 코드, 종료 이유)
        desc_tasks_resp = ecs_client.describe_tasks(cluster=ECS_CLUSTER_NAME, tasks=[task_arn])
        if not desc_tasks_resp.get('tasks'):
             # 완료 후 바로 describe 실패하는 경우는 거의 없지만 방어적으로 처리
             logger.warning(f"Failed to describe task {task_arn} immediately after completion. Assuming success for now.")
             return task_arn, task_id, {"status": "STOPPED", "reason": "Unknown (Failed to describe)", "exit_code": 0} # 성공으로 간주하고 S3 확인

        task_info = desc_tasks_resp['tasks'][0]
        last_status = task_info.get('lastStatus') # 예: STOPPED
        stopped_reason = task_info.get('stoppedReason', 'Unknown') # 이유 없을 경우 대비
        # 컨테이너 종료 코드 확인 (정상 종료: 0)
        container_exit_code = None
        container_status = None
        if task_info.get('containers'):
            container_info = next((c for c in task_info['containers'] if c.get('name') == container_name), None)
            if container_info:
                 if 'exitCode' in container_info: container_exit_code = container_info['exitCode']
                 container_status = container_info.get('lastStatus') # 컨테이너 상태 확인 (예: RUNNING, STOPPED)

        logger.info(f"Task {task_arn} final status: {last_status}, container status: {container_status}, exitCode: {container_exit_code}, reason: {stopped_reason}")

        return task_arn, task_id, {"status": last_status, "reason": stopped_reason, "exit_code": container_exit_code}

    except Exception as e:
        logger.error(f"Error running or waiting for Fargate task {task_tag} (ARN: {task_arn}): {e}")
        traceback.print_exc()
        # 실패 시에도 ID 반환 (존재한다면)
        return task_arn, task_id if task_id else None, {"status": "FAILED_TO_RUN", "reason": str(e), "exit_code": None}

def get_s3_output(task_id, task_type):
    """S3에서 Task 실행 결과 파일을 읽어옵니다."""
    # Task ID가 없으면 S3 경로를 알 수 없으므로 None 반환
    if not task_id:
        logger.error(f"Cannot get S3 output for {task_type} because task ID is unknown.")
        return None

    s3_key = f"grader-outputs/{task_type}/{task_id}/output.json" # 예시 S3 경로
    logger.info(f"Fetching output from S3: s3://{S3_BUCKET_NAME}/{s3_key}")
    try:
        response = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
        output_str = response['Body'].read().decode('utf-8')
        return output_str
    except s3_client.exceptions.NoSuchKey:
        logger.warning(f"Output file not found in S3 for task {task_id} at {s3_key}")
        return None
    except Exception as e:
        logger.error(f"Error fetching output from S3 for task {task_id}: {e}")
        return None # 오류 발생 시 None 반환

def parse_json_output(output_str, task_type):
    """JSON 문자열 출력을 파싱합니다."""
    if output_str is None: # 입력이 None이면 None 반환
        return None
    if not output_str: # 빈 문자열 처리
        logger.warning(f"Output string from {task_type} task is empty.")
        return None
    try:
        # 로그 등에 섞여 있을 수 있는 비-JSON 라인 제거 시도 (간단한 방식)
        json_part = output_str
        if '{' in output_str and '}' in output_str:
            start = output_str.find('{')
            end = output_str.rfind('}')
            if start != -1 and end != -1 and start < end:
                 json_part = output_str[start:end+1]

        elif '[' in output_str and ']' in output_str: # Generator의 경우 리스트
            start = output_str.find('[')
            end = output_str.rfind(']')
            if start != -1 and end != -1 and start < end:
                 json_part = output_str[start:end+1]

        return json.loads(json_part)

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON output from {task_type}: {output_str}\\nError: {e}")
        return None # 파싱 실패 시 None 반환

def compare_outputs(actual_output, expected_output):
    """출력 문자열을 비교합니다 (줄 단위, 각 줄 앞뒤 공백 제거 후 비교)."""
    if actual_output is None: actual_output = "" # None 방지
    if expected_output is None: expected_output = "" # None 방지

    # 각 줄의 앞뒤 공백 제거 후 리스트로 만듦
    actual_lines = [line.strip() for line in str(actual_output).splitlines()]
    expected_lines = [line.strip() for line in str(expected_output).splitlines()]

    # 빈 줄 제거 옵션 (선택적)
    # actual_lines = [line for line in actual_lines if line]
    # expected_lines = [line for line in expected_lines if line]

    return actual_lines == expected_lines

def save_grading_result(result_record):
    """채점 결과를 DynamoDB에 저장합니다."""
    # TODO: 실제 DynamoDB 테이블 스키마에 맞게 필드명과 타입을 조정해야 합니다.
    # 예: submission_id, problem_id 타입 확인. execution_time을 숫자(N)로 저장할지 문자열(S)로 저장할지 결정.
    # 예: results 리스트를 그대로 저장할지 (JSON 문자열 변환 또는 Map 타입 사용) 결정.
    try:
        table = dynamodb.Table(DYNAMODB_SUBMISSIONS_TABLE_NAME)
        # DynamoDB는 float 타입을 직접 지원하지 않으므로 Decimal 또는 문자열 변환 필요
        # 여기서는 간단히 문자열로 변환하여 저장 시도
        if 'execution_time' in result_record and result_record['execution_time'] is not None:
             # 반올림하여 문자열로 저장
             result_record['execution_time_str'] = str(round(float(result_record['execution_time']), 4))
             # 원본 float 필드 제거 (옵션)
             # del result_record['execution_time'] # API 응답에는 float 유지 필요할 수 있으므로 제거 보류

        # results 리스트도 JSON 문자열로 저장 시도 (Map 타입보다 간단)
        if 'results' in result_record:
             # 결과가 너무 클 경우 대비 (DynamoDB 항목 크기 제한 400KB)
             try:
                 results_json_str = json.dumps(result_record['results'])
                 if len(results_json_str.encode('utf-8')) < 390 * 1024: # 약간의 여유
                      result_record['results_json'] = results_json_str
                 else:
                      logger.warning(f"Results JSON for {result_record.get('submission_id')} is too large. Storing summary.")
                      # 너무 크면 요약 정보만 저장하거나 다른 방식 고려
                      summary = [{"case": r.get('case'), "status": r.get('status')} for r in result_record['results']]
                      result_record['results_summary_json'] = json.dumps(summary)
             except Exception as json_e:
                  logger.error(f"Error serializing results for {result_record.get('submission_id')}: {json_e}")
             finally:
                 # 원본 리스트 필드는 API 응답 위해 유지, DB 저장 시에는 제거 가능 (스키마 설계 따라)
                 if 'results' in result_record and 'results_json' not in result_record and 'results_summary_json' not in result_record:
                      # 직렬화 실패하고 요약도 없다면 results 필드 제거
                      del result_record['results']
                 elif 'results' in result_record and ('results_json' in result_record or 'results_summary_json' in result_record):
                     # JSON 필드가 생성되었으면 원본 results 필드는 제거 가능 (DB 저장용 복사본에서)
                     pass # 여기서는 result_record 자체를 수정하므로 건드리지 않음

        # 에러 메시지도 크기 제한 고려
        if 'error_message' in result_record and result_record['error_message'] and len(result_record['error_message'].encode('utf-8')) > 10 * 1024: # 10KB 제한 예시
             result_record['error_message'] = result_record['error_message'][:10000] + "... (truncated)"

        # DynamoDB에 저장할 최종 아이템 복사 (원본 수정 방지)
        item_to_save = result_record.copy()
        if 'results' in item_to_save and ('results_json' in item_to_save or 'results_summary_json' in item_to_save):
             del item_to_save['results'] # DB에는 JSON 또는 요약만 저장
        if 'execution_time' in item_to_save and 'execution_time_str' in item_to_save:
             del item_to_save['execution_time'] # DB에는 문자열 시간만 저장

        table.put_item(Item=item_to_save)
        logger.info(f"Successfully saved grading result for submission: {result_record.get('submission_id')}")
    except Exception as e:
        logger.error(f"Failed to save grading result to DynamoDB: {e}")
        # 저장 실패 시에도 Lambda 실행은 계속될 수 있도록 처리

def aggregate_results(payload):
    """Map 상태의 결과를 집계하여 최종 채점 상태 결정"""
    logger.info("Executing aggregateResults")
    map_results = payload.get('map_results', [])

    if not map_results:
        logger.warning("No results from Map state to aggregate.")
        return {'status': 'NO_TEST_CASES', 'results': [], 'execution_time': 0.0}

    final_status = 'ACCEPTED' # 기본 상태
    total_execution_time = 0.0
    processed_results = []
    passed_cases = 0

    logger.info(f"Aggregating {len(map_results)} results from Map state.")

    for i, result in enumerate(map_results):
        case_index = result.get('case_index', i) # 인덱스 fallback
        status = result.get('status', 'UNKNOWN_ERROR')
        execution_time = result.get('execution_time', 0.0)
        stdout = result.get('stdout', '')
        stderr = result.get('stderr', '')
        expected_output = result.get('expected_output', '')
        error_info = result.get('error_info') # MapItemFail에서 전달될 수 있음

        logger.debug(f"Processing case {case_index}: status={status}, time={execution_time}")

        # 상태 결정 로직 개선
        current_case_status = status # 초기 상태는 Runner에서 전달된 상태

        if current_case_status == 'COMPLETED': # Runner가 성공적으로 완료했을 경우 출력 비교
            # 출력 비교 (앞뒤 공백 제거 및 개행 문자 정규화 후 비교)
            normalized_stdout = stdout.strip().replace('\r\n', '\n')
            normalized_expected = expected_output.strip().replace('\r\n', '\n')
            if normalized_stdout == normalized_expected:
                current_case_status = 'ACCEPTED'
                passed_cases += 1
            else:
                current_case_status = 'WRONG_ANSWER'
        elif current_case_status == 'GRADER_ERROR': # Map 반복 처리 중 오류 발생 시
            logger.error(f"Grader error occurred in case {case_index}: {error_info}")
            current_case_status = 'SYSTEM_ERROR' # 최종 상태를 시스템 오류로

        # 최종 상태 업데이트 로직 (하나라도 실패하면 최종 실패)
        # 우선순위: SYSTEM_ERROR > Runtime Error 계열 > Time/Memory Limit > Wrong Answer > Accepted
        if final_status == 'ACCEPTED':
            if current_case_status != 'ACCEPTED':
                final_status = current_case_status # 첫 실패 상태 반영
        elif final_status == 'WRONG_ANSWER':
            if current_case_status not in ['ACCEPTED', 'WRONG_ANSWER']:
                final_status = current_case_status # 더 심각한 오류 상태로 업데이트
        elif final_status in ['TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED']:
             if current_case_status not in ['ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED']:
                 final_status = current_case_status
        # 다른 Runtime Error 또는 System Error 는 이미 더 높은 우선순위

        processed_results.append({
            'case': case_index,
            'status': current_case_status,
            'execution_time': execution_time,
            'stdout': stdout, # 원본 출력 유지
            'stderr': stderr,
            'expected_output': expected_output
        })

        total_execution_time = max(total_execution_time, execution_time)

    # 모든 케이스 통과 시 최종 ACCEPTED 유지
    if passed_cases == len(map_results) and final_status == 'ACCEPTED':
        pass # 이미 ACCEPTED 상태
    elif final_status == 'ACCEPTED' and passed_cases != len(map_results):
         # 모든 케이스가 ACCEPTED는 아닌데, 다른 실패 상태도 없으면 이상한 경우
         logger.warning("Inconsistent aggregation state: final_status is ACCEPTED but not all cases passed.")
         final_status = 'SYSTEM_ERROR' # 또는 다른 적절한 오류 상태

    logger.info(f"Aggregation complete. Passed cases: {passed_cases}/{len(map_results)}. Final status: {final_status}, Max execution time: {total_execution_time:.4f}s")

    return {
        'status': final_status,
        'results': processed_results,
        'execution_time': total_execution_time
    }

def prepare_map_input(payload):
    """Map 상태 실행을 위해 언어별 Runner 정보를 context에 추가"""
    logger.info("Executing prepareMapInput")
    language = payload.get('language')
    if not language:
        raise ValueError("Missing language in payload for prepareMapInput")

    # 환경 변수 또는 코드 내 매핑에서 언어 정보 조회
    lang_info = RUNNER_INFO.get(language)
    if not lang_info or 'task_def_arn' not in lang_info or 'container_name' not in lang_info:
        logger.error(f"Runner info not found or incomplete for language: {language} in RUNNER_INFO: {RUNNER_INFO}")
        raise ValueError(f"Unsupported language or missing runner configuration: {language}")

    # 입력 페이로드(payload)는 이전 상태(CheckGeneratedCases)의 전체 출력이 됨
    # 여기에 context 정보를 추가하거나 수정하여 반환
    output_payload = payload.copy() # 원본 수정을 피하기 위해 복사

    # context 객체가 없으면 생성, 있으면 업데이트
    if 'context' not in output_payload:
        output_payload['context'] = {}

    output_payload['context']['runner_task_def_arn'] = lang_info['task_def_arn']
    output_payload['context']['runner_container_name'] = lang_info['container_name']

    # ASL에서 Map 상태의 InputPath가 $.map_input.items 를 참조하므로,
    # items 필드를 생성하거나 확인해야 함.
    # 이전 상태(ParseGeneratorOutput) 결과가 $.parsed_generator_output.cases 에 있음
    if 'parsed_generator_output' in output_payload and 'cases' in output_payload['parsed_generator_output']:
         output_payload['items'] = output_payload['parsed_generator_output']['cases']
    else:
         # 테스트 케이스가 없는 경우 (이론상 CheckGeneratedCases에서 걸러짐)
         logger.warning("No test cases found in parsed_generator_output for prepareMapInput")
         output_payload['items'] = []

    # 불필요한 데이터 정리 (선택 사항)
    if 'parsed_generator_output' in output_payload:
        del output_payload['parsed_generator_output']

    logger.info(f"Prepared map input for language {language} with runner info.")
    return output_payload # 수정된 전체 페이로드 반환

# --- Main Handler ---
def handler(event, context):
    start_handler_time = time.time()
    logger.info(f"Received event: {json.dumps(event)}")

    # 필수 환경 변수 확인
    required_env_vars = [
        "DYNAMODB_TABLE_NAME", "DYNAMODB_SUBMISSIONS_TABLE_NAME", "ECS_CLUSTER_NAME",
        "S3_BUCKET_NAME", "GENERATOR_TASK_DEF_ARN", "RUNNER_PYTHON_TASK_DEF_ARN",
        "GENERATOR_CONTAINER_NAME", "RUNNER_PYTHON_CONTAINER_NAME",
        "SUBNET_IDS", "SECURITY_GROUP_IDS"
    ]
    missing_vars = [var for var in required_env_vars if not os.environ.get(var)]
    if missing_vars:
        logger.error(f"Missing required environment variables: {missing_vars}")
        return {'statusCode': 500, 'body': json.dumps({"message": "Internal configuration error."})}

    runner_map = {
        "python": (RUNNER_PYTHON_TASK_DEF_ARN, RUNNER_PYTHON_CONTAINER_NAME),
        # 다른 언어 추가 가능
    }
    submission_id = f"sub_{int(time.time() * 1000)}_{event.get('pathParameters', {}).get('problem_id', 'unknown')}" # 핸들러 시작 시 ID 생성

    try:
        # 1. 요청 파싱
        problem_id = event.get('pathParameters', {}).get('problem_id')
        if not problem_id: raise ValueError("Missing problem_id in path parameters")
        body = json.loads(event.get('body', '{}'))
        user_code = body.get('user_code')
        language = body.get('language', 'python').lower()
        if not user_code: return {'statusCode': 400, 'body': json.dumps({"message": "Missing user_code"})}
        if language not in runner_map: return {'statusCode': 400, 'body': json.dumps({"message": f"Unsupported language: {language}"})}
        runner_task_def_arn, runner_container_name = runner_map[language]

        # 2. 문제 정보 조회
        logger.info(f"Fetching details for problem ID: {problem_id}")
        problem_details = get_problem_details(problem_id)
        generator_code = problem_details["generation_code"]
        time_limit = problem_details["time_limit"]
        memory_limit = problem_details["memory_limit"] # Task Def 생성 시 활용

        # --- 보안 참고 ---
        # 현재 Generator는 exec()를 사용합니다. 이는 잠재적 보안 위험이 있을 수 있습니다.
        # LLM이 생성한 코드이므로 어느 정도 신뢰하지만, 향후에는 더 안전한 실행 방식
        # (예: 제한된 라이브러리만 허용하는 인터프리터, AST 분석 후 실행 등)을 고려할 수 있습니다.

        # 3. 테스트 케이스 생성
        logger.info("Generating test cases...")
        # submission_id = f"sub_{int(time.time() * 1000)}_{problem_id}" # 여기보다 위에서 생성
        generator_task_id_placeholder = f"gen-{submission_id}" # S3 경로용 ID
        generator_s3_output_key = f"grader-outputs/generator/{generator_task_id_placeholder}/output.json"
        generator_env = [
            {'name': 'GENERATOR_CODE', 'value': generator_code},
            {'name': 'S3_BUCKET', 'value': S3_BUCKET_NAME},
            {'name': 'S3_KEY', 'value': generator_s3_output_key}
        ]
        # Task 실행 (실제 Task ID는 여기서 반환됨)
        generator_task_arn, generator_task_id, generator_task_exit_info = run_fargate_task(
            GENERATOR_TASK_DEF_ARN, generator_env, "TestCaseGenerator", GENERATOR_CONTAINER_NAME
        )

        if generator_task_exit_info.get("status") != "STOPPED" or generator_task_exit_info.get("exit_code") != 0:
             logger.error(f"Generator task failed. Info: {generator_task_exit_info}")
             # 실패 정보 저장
             save_grading_result({
                 "submission_id": submission_id, "problem_id": int(problem_id), "language": language,
                 "status": "GENERATOR_ERROR", "execution_time": None, "submission_time": int(start_handler_time),
                 "error_message": f"Generator task failed: {generator_task_exit_info.get('reason')}"
             })
             return {'statusCode': 500, 'body': json.dumps({"message": "Failed to generate test cases (Task execution failed).", "submission_id": submission_id})}

        # S3에서 결과 가져오기 (실제 Task ID 사용)
        # generator_s3_output_key_actual = f"grader-outputs/generator/{generator_task_id}/output.json" # get_s3_output 내부에서 생성
        generated_cases_str = get_s3_output(generator_task_id, "generator")
        test_cases = parse_json_output(generated_cases_str, "Generator")

        if test_cases is None or not isinstance(test_cases, list):
            logger.error(f"Failed to get or parse generated test cases from S3. Output: {generated_cases_str}")
            save_grading_result({
                 "submission_id": submission_id, "problem_id": int(problem_id), "language": language,
                 "status": "GENERATOR_ERROR", "execution_time": None, "submission_time": int(start_handler_time),
                 "error_message": "Failed to retrieve or parse generated test cases."
             })
            return {'statusCode': 500, 'body': json.dumps({"message": "Failed to generate test cases (Output error).", "submission_id": submission_id})}

        logger.info(f"Successfully generated {len(test_cases)} test cases.")
        if not test_cases:
             logger.warning("No test cases were generated.")
             # 테스트 케이스가 없는 경우도 결과 저장
             save_grading_result({
                 "submission_id": submission_id, "problem_id": int(problem_id), "language": language,
                 "status": "NO_TEST_CASES", "execution_time": None, "submission_time": int(start_handler_time), "results_json": "[]"
             })
             return {'statusCode': 200, 'body': json.dumps({"submission_id": submission_id, "status": "NO_TEST_CASES", "results": []})}

        # 4. 사용자 코드 실행
        results = []
        overall_status = "ACCEPTED"
        max_execution_time = 0.0

        for i, case in enumerate(test_cases):
            case_num = i + 1
            case_input = case.get("input")
            expected_output = case.get("output")
            logger.info(f"Running test case {case_num}/{len(test_cases)}")

            if not isinstance(case_input, str): case_input_str = json.dumps(case_input)
            else: case_input_str = case_input

            runner_task_id_placeholder = f"run-{submission_id}-tc{case_num}"
            runner_s3_output_key = f"grader-outputs/runner/{runner_task_id_placeholder}/output.json"
            runner_env = [
                {'name': 'USER_CODE', 'value': user_code},
                {'name': 'INPUT_DATA', 'value': case_input_str},
                {'name': 'TIME_LIMIT', 'value': str(time_limit)},
                {'name': 'S3_BUCKET', 'value': S3_BUCKET_NAME},
                {'name': 'S3_KEY', 'value': runner_s3_output_key}
            ]

            case_result = { "case": case_num, "status": "INTERNAL_ERROR", "execution_time": None } # 기본 결과
            runner_task_arn, runner_task_id, runner_task_exit_info = (None, None, None) # 초기화

            try:
                runner_task_arn, runner_task_id, runner_task_exit_info = run_fargate_task(
                    runner_task_def_arn, runner_env, f"CodeRunner-{language}-TC{case_num}", runner_container_name
                )

                # S3 결과 가져오기 (실제 Task ID 사용)
                # runner_s3_output_key_actual = f"grader-outputs/runner/{runner_task_id}/output.json" # get_s3_output 내부에서 생성
                runner_output_str = get_s3_output(runner_task_id, f"runner-tc{case_num}")
                run_result = parse_json_output(runner_output_str, f"Runner-{language}")

                # --- 채점 로직 (개선) ---
                if run_result is None:
                    # S3 결과 없거나 파싱 실패: Task 종료 정보로 상태 판정
                    logger.warning(f"Could not get/parse runner output for TC {case_num}. Task Info: {runner_task_exit_info}")
                    stopped_reason = runner_task_exit_info.get("reason", "")
                    exit_code = runner_task_exit_info.get("exit_code")

                    if "OutOfMemoryError" in stopped_reason or "Memory limit exceeded" in stopped_reason: # MLE 감지 강화
                         case_result["status"] = "MEMORY_LIMIT_EXCEEDED"
                    elif exit_code == 124 or exit_code == 137 or "Timeout" in stopped_reason or "timed out" in stopped_reason.lower(): # TLE 감지 강화
                         case_result["status"] = "TIME_LIMIT_EXCEEDED"
                         case_result["execution_time"] = float(time_limit) # 시간 초과는 제한 시간으로 기록
                    elif exit_code is not None and exit_code != 0: # 0이 아닌 종료 코드 (RTE)
                         case_result["status"] = "RUNTIME_ERROR"
                         case_result["error_message"] = f"Non-zero exit code: {exit_code}. Reason: {stopped_reason}"
                    else: # 원인 불명 또는 정상 종료인데 S3 결과 없는 경우 (Grader Error)
                         case_result["status"] = "GRADER_ERROR" # 상태 변경
                         case_result["error_message"] = f"Runner task ended unexpectedly or failed to produce S3 output. Reason: {stopped_reason}"
                else:
                    # S3 결과 있을 경우: run_code.py가 판정한 상태 사용
                    status = run_result.get("status")
                    actual_output = run_result.get("stdout", "")
                    stderr = run_result.get("stderr", "")
                    execution_time = run_result.get("execution_time")
                    if execution_time is not None:
                        try: # float 변환 오류 방지
                            et_float = float(execution_time)
                            max_execution_time = max(max_execution_time, et_float)
                            case_result["execution_time"] = et_float
                        except (ValueError, TypeError):
                            logger.warning(f"Could not parse execution_time: {execution_time}")

                    case_result["status"] = status # run_code.py가 판정한 상태 반영

                    if status == "SUCCESS":
                        if not compare_outputs(actual_output, expected_output):
                            case_result["status"] = "WRONG_ANSWER"
                    elif status == "RUNTIME_ERROR":
                        # run_code.py가 RTE로 판정하고 stderr를 제공한 경우
                        case_result["error_message"] = stderr
                    elif status == "TIME_LIMIT_EXCEEDED":
                         # run_code.py가 TLE로 판정한 경우, 시간 기록 일관성 위해 재설정
                         case_result["execution_time"] = float(time_limit)
                         # 필요시 stderr에 TLE 메시지 추가
                         # case_result["error_message"] = "Time Limit Exceeded within container"

                # 전체 상태 업데이트
                current_case_status = case_result["status"]
                if current_case_status != "ACCEPTED":
                     # 오류 우선순위: INTERNAL_ERROR > GRADER_ERROR > MLE > TLE > RTE > WA
                     error_priority = {"INTERNAL_ERROR": 6, "GRADER_ERROR": 5, "MEMORY_LIMIT_EXCEEDED": 4, "TIME_LIMIT_EXCEEDED": 3, "RUNTIME_ERROR": 2, "WRONG_ANSWER": 1, "ACCEPTED": 0}
                     # 존재하지 않는 상태에 대한 기본값 0 설정
                     current_priority = error_priority.get(current_case_status, 0)
                     overall_priority = error_priority.get(overall_status, 0)
                     if current_priority > overall_priority:
                          overall_status = current_case_status

            except Exception as case_error:
                 logger.error(f"Lambda internal error processing test case {case_num}: {case_error}")
                 traceback.print_exc()
                 case_result["status"] = "GRADER_ERROR" # Lambda 내부 또는 Fargate 실행 대기 중 오류
                 case_result["error_message"] = f"Lambda error: {str(case_error)}"
                 overall_status = "INTERNAL_ERROR" # 채점 시스템 전체 오류로 간주

            results.append(case_result)
            # 중단 조건 체크
            if overall_status != "ACCEPTED":
                 logger.warning(f"Stopping grading at case {case_num} due to status: {overall_status}")
                 break

        # 6. 최종 결과 집계 및 저장
        logger.info(f"Overall grading status: {overall_status}. Max execution time: {max_execution_time:.4f}s")
        final_result_record = {
            "submission_id": submission_id,
            "problem_id": int(problem_id),
            "language": language,
            "status": overall_status,
            "execution_time": max_execution_time, # DB 저장을 위해 float 유지
            "results": results, # 상세 결과는 저장 시 results_json 등으로 변환됨
            "submission_time": int(start_handler_time),
            "user_code": user_code # 저장 여부 결정
            # error_message 필드는 case_result 또는 최상위에 추가될 수 있음
        }
        # 최종 상태가 오류일 경우, 첫 번째 오류 케이스의 메시지를 최상위에 기록 (옵션)
        if overall_status != "ACCEPTED":
             first_error_result = next((r for r in results if r.get("status") != "ACCEPTED"), None)
             if first_error_result and "error_message" in first_error_result:
                  final_result_record["error_message"] = first_error_result["error_message"]

        save_grading_result(final_result_record.copy()) # 복사본 전달

        # 7. 결과 반환
        api_response = {
             "submission_id": submission_id,
             "status": overall_status,
             "execution_time": round(max_execution_time, 4), # API 응답 위해 반올림
             "results": results # 프론트엔드 표시에 필요한 상세 결과 포함
        }
        return {'statusCode': 200, 'body': json.dumps(api_response)}

    except ValueError as ve: # 설정 오류, 입력 오류, 파싱 오류 등
        logger.error(f"ValueError: {ve}")
        traceback.print_exc()
        # 실패 정보 저장 (submission_id 사용)
        save_grading_result({
             "submission_id": submission_id, "problem_id": int(event.get('pathParameters', {}).get('problem_id', 0)),
             "language": event.get('body', {}).get('language', 'unknown'),
             "status": "INPUT_ERROR", "execution_time": None, "submission_time": int(start_handler_time),
             "error_message": str(ve)
        })
        return {'statusCode': 400, 'body': json.dumps({"message": str(ve), "submission_id": submission_id})}
    except Exception as e:
        logger.error(f"Unhandled exception in handler: {e}")
        traceback.print_exc()
        # 실패 정보 저장 (submission_id 사용)
        save_grading_result({
             "submission_id": submission_id, "problem_id": int(event.get('pathParameters', {}).get('problem_id', 0)),
             "language": event.get('body', {}).get('language', 'unknown'),
             "status": "INTERNAL_ERROR", "execution_time": None, "submission_time": int(start_handler_time),
             "error_message": f"Unhandled exception: {str(e)}"
        })
        return {'statusCode': 500, 'body': json.dumps({"message": "Internal server error during grading.", "submission_id": submission_id})} 