import json
import os
import uuid
import boto3
import logging
import time
import traceback
import re
from botocore.exceptions import ClientError
from decimal import Decimal

# --- 로거 설정 ---
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# --- 환경 변수 읽기 및 검증 ---
def get_required_env_var(var_name):
    value = os.environ.get(var_name)
    if not value:
        logger.error(f"FATAL: Environment variable '{var_name}' is not set.")
        raise ValueError(f"Environment variable '{var_name}' is required.")
    return value

try:
    DYNAMODB_PROBLEMS_TABLE_NAME = get_required_env_var('DYNAMODB_PROBLEMS_TABLE_NAME')
    DYNAMODB_SUBMISSIONS_TABLE_NAME = get_required_env_var('DYNAMODB_SUBMISSIONS_TABLE_NAME')
    S3_BUCKET_NAME = get_required_env_var('S3_BUCKET_NAME')
    ECS_CLUSTER_NAME = get_required_env_var('ECS_CLUSTER_NAME')
    RUNNER_PYTHON_TASK_DEF_ARN = get_required_env_var('RUNNER_PYTHON_TASK_DEF_ARN')
    RUNNER_PYTHON_CONTAINER_NAME = get_required_env_var('RUNNER_PYTHON_CONTAINER_NAME')
    SUBNET_IDS_STR = get_required_env_var('SUBNET_IDS')
    SECURITY_GROUP_IDS_STR = get_required_env_var('SECURITY_GROUP_IDS')

    # 문자열 리스트를 실제 리스트로 변환
    SUBNET_IDS = [subnet.strip() for subnet in SUBNET_IDS_STR.split(',')]
    SECURITY_GROUP_IDS = [sg.strip() for sg in SECURITY_GROUP_IDS_STR.split(',')]

    if not SUBNET_IDS or not SECURITY_GROUP_IDS:
        raise ValueError("SUBNET_IDS and SECURITY_GROUP_IDS must not be empty.")

except ValueError as e:
    # 핸들러 밖에서 발생한 치명적 오류는 Lambda 실행 환경이 처리하도록 함
    logger.critical(f"Failed to initialize Lambda due to configuration error: {e}")
    raise

# --- Boto3 클라이언트 초기화 ---
ecs_client = boto3.client('ecs')
dynamodb_resource = boto3.resource('dynamodb')
s3_client = boto3.client('s3')
problems_table = dynamodb_resource.Table(DYNAMODB_PROBLEMS_TABLE_NAME)
submissions_table = dynamodb_resource.Table(DYNAMODB_SUBMISSIONS_TABLE_NAME)

# --- 상수 정의 --- (README Status Codes)
STATUS_ACCEPTED = "ACCEPTED"
STATUS_WRONG_ANSWER = "WRONG_ANSWER"
STATUS_TIME_LIMIT_EXCEEDED = "TIME_LIMIT_EXCEEDED"
STATUS_RUNTIME_ERROR = "RUNTIME_ERROR"
STATUS_INTERNAL_ERROR = "INTERNAL_ERROR"
STATUS_NO_TEST_CASES = "NO_TEST_CASES"
STATUS_GRADER_ERROR = "GRADER_ERROR" # Runner internal error
STATUS_SUCCESS = "SUCCESS" # Runner success status

# 상태 우선순위 (낮을수록 심각)
STATUS_PRIORITY = {
    STATUS_ACCEPTED: 5,
    STATUS_WRONG_ANSWER: 4,
    STATUS_TIME_LIMIT_EXCEEDED: 3,
    STATUS_RUNTIME_ERROR: 2,
    STATUS_INTERNAL_ERROR: 1,
    STATUS_NO_TEST_CASES: 0,
    STATUS_GRADER_ERROR: 1 # Treat Grader Error as Internal Error in final submission
}

# --- Helper 함수 --- #

def get_problem_details(problem_id):
    """DynamoDB problems_table에서 문제 상세 정보 조회"""
    try:
        response = problems_table.get_item(Key={'id': problem_id})
        item = response.get('Item')
        if not item:
            logger.warning(f"Problem not found: {problem_id}")
            return None, None, f"Problem with ID '{problem_id}' not found."

        time_limit = item.get('constraints_time_limit')
        test_cases = item.get('test_cases')

        # 시간 제한 유효성 검사 (정수 변환 포함)
        try:
            time_limit_int = int(time_limit)
            if time_limit_int <= 0:
                 raise ValueError("Time limit must be positive")
        except (TypeError, ValueError):
            logger.error(f"Invalid time_limit '{time_limit}' for problem {problem_id}")
            return None, None, f"Invalid time_limit configured for problem {problem_id}."

        # 테스트 케이스 유효성 검사
        if not test_cases or not isinstance(test_cases, list):
            logger.warning(f"No valid test cases found for problem {problem_id}")
            return time_limit_int, [], None # NO_TEST_CASES 상태로 처리

        # 각 테스트 케이스 형식 검사 (input, expected_output 존재 여부)
        for i, tc in enumerate(test_cases):
            if not isinstance(tc, dict) or 'input' not in tc or 'expected_output' not in tc:
                logger.error(f"Invalid test case format at index {i} for problem {problem_id}")
                return None, None, f"Invalid test case format for problem {problem_id}."

        return time_limit_int, test_cases, None

    except ClientError as e:
        logger.error(f"DynamoDB error getting problem {problem_id}: {e}")
        return None, None, f"Failed to retrieve problem details from DynamoDB: {e.response['Error']['Message']}"
    except Exception as e:
        logger.error(f"Unexpected error getting problem details: {e}")
        return None, None, f"An unexpected error occurred while fetching problem details: {traceback.format_exc()}"

def run_fargate_task(task_definition_arn, environment_vars, container_name, submission_id, case_num):
    """ECS Fargate Task 실행 및 동기 대기"""
    task_tag = f"submission-{submission_id}-case-{case_num}"
    logger.info(f"Starting Fargate task for {task_tag} using definition {task_definition_arn}")
    try:
        response = ecs_client.run_task(
            cluster=ECS_CLUSTER_NAME,
            taskDefinition=task_definition_arn,
            launchType='FARGATE',
            networkConfiguration={
                'awsvpcConfiguration': {
                    'subnets': SUBNET_IDS,
                    'securityGroups': SECURITY_GROUP_IDS,
                    'assignPublicIp': 'ENABLED' # Public IP 필요 여부에 따라 조정
                }
            },
            overrides={
                'containerOverrides': [
                    {
                        'name': container_name,
                        'environment': environment_vars
                    }
                ]
            },
            count=1,
            tags=[{'key': 'SubmissionTag', 'value': task_tag}] # 식별용 태그
        )

        if not response.get('tasks'):
            logger.error(f"Failed to start ECS task for {task_tag}. Response: {response}")
            failures = response.get('failures', [])
            reason = failures[0]['reason'] if failures else "Unknown reason"
            return None, f"ECS task failed to start: {reason}"

        task_arn = response['tasks'][0]['taskArn']
        logger.info(f"Task {task_arn} started for {task_tag}. Waiting for completion...")

        # Wait for the task to stop (complete)
        waiter = ecs_client.get_waiter('tasks_stopped')
        waiter.wait(
            cluster=ECS_CLUSTER_NAME,
            tasks=[task_arn],
            WaiterConfig={
                'Delay': 6, # Check every 6 seconds
                'MaxAttempts': 100 # Max wait time (adjust as needed based on max time limit)
            }
        )

        logger.info(f"Task {task_arn} stopped for {task_tag}. Describing task...")

        # Describe the stopped task to get details
        desc_response = ecs_client.describe_tasks(cluster=ECS_CLUSTER_NAME, tasks=[task_arn])
        task_details = desc_response['tasks'][0]
        container = next((c for c in task_details['containers'] if c['name'] == container_name), None)

        if not container:
             logger.error(f"Could not find container '{container_name}' in stopped task {task_arn}")
             return None, f"Container '{container_name}' not found in task details."

        exit_code = container.get('exitCode')
        stop_reason = task_details.get('stoppedReason', 'Unknown reason')

        logger.info(f"Task {task_arn} for {task_tag} finished. Container exit code: {exit_code}, Stop reason: {stop_reason}")

        # Fargate 자체 오류 (예: Essential container in task exited) 등 확인
        if exit_code is None or exit_code != 0:
            # Runner 스크립트 자체에서 0이 아닌 코드로 종료한 경우와 구분 필요
            # Runner는 성공 시 0, 실패 시 1을 반환하도록 설계됨
            # 여기서 Non-zero는 ECS 레벨의 문제일 가능성 (네트워킹, 권한 등)
            logger.warning(f"ECS Task {task_arn} for {task_tag} stopped with non-zero exit code ({exit_code}) or missing code. Reason: {stop_reason}")
            # Runner가 결과를 S3에 썼는지 확인하는 것이 중요.
            # 여기서는 우선 실패로 간주하고, S3 확인 후 최종 판단.

        return task_arn, None # 성공적으로 실행 완료 (결과는 S3에서 확인)

    except ecs_client.exceptions.WaiterError as e:
        logger.error(f"ECS task waiter timed out or failed for {task_tag}: {e}")
        # 이 경우 Task를 수동으로 중지 시도
        try:
            ecs_client.stop_task(cluster=ECS_CLUSTER_NAME, task=task_arn, reason="Lambda waiter timed out")
        except ClientError as stop_e:
            logger.warning(f"Failed to stop timed-out task {task_arn}: {stop_e}")
        return None, f"ECS task did not complete within the expected time: {e}"
    except ClientError as e:
        logger.error(f"ECS ClientError running task for {task_tag}: {e}")
        return None, f"Failed to run ECS task: {e.response['Error']['Message']}"
    except Exception as e:
        logger.error(f"Unexpected error running Fargate task for {task_tag}: {e}")
        return None, f"An unexpected error occurred while running the Fargate task: {traceback.format_exc()}"

def get_s3_output(s3_key):
    """S3에서 Runner 결과 파일을 읽어옴"""
    try:
        response = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
        output_str = response['Body'].read().decode('utf-8')
        logger.info(f"Successfully retrieved S3 object: {s3_key}")
        return output_str, None
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            logger.error(f"S3 object not found: s3://{S3_BUCKET_NAME}/{s3_key}")
            return None, f"Runner output file not found in S3 ({s3_key})."
        else:
            logger.error(f"Error getting S3 object {s3_key}: {e}")
            return None, f"Failed to get S3 object: {e.response['Error']['Message']}"
    except Exception as e:
        logger.error(f"Unexpected error reading S3 object {s3_key}: {e}")
        return None, f"An unexpected error occurred reading S3 output: {traceback.format_exc()}"

def parse_json_output(output_str, s3_key):
    """S3에서 읽은 JSON 문자열을 파싱"""
    try:
        result = json.loads(output_str)
        # 필수 키 검증 (README Runner Result Structure 기반)
        required_keys = ["status", "stdout", "stderr", "execution_time"]
        if not all(key in result for key in required_keys):
            raise ValueError(f"Missing required keys in Runner result JSON from {s3_key}")
        logger.info(f"Successfully parsed JSON output from {s3_key}")
        return result, None
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from S3 object {s3_key}: {e}")
        return None, f"Invalid JSON format in Runner output file ({s3_key}): {e}"
    except ValueError as e:
        logger.error(f"Data validation error in JSON from S3 object {s3_key}: {e}")
        return None, f"Invalid data in Runner output file ({s3_key}): {e}"
    except Exception as e:
        logger.error(f"Unexpected error parsing JSON from {s3_key}: {e}")
        return None, f"An unexpected error occurred parsing Runner output: {traceback.format_exc()}"

def compare_outputs(actual_output, expected_output):
    """표준 출력과 기대 출력 비교 (개행 및 양끝 공백 무시)"""
    # Normalize newlines (CRLF -> LF) and strip leading/trailing whitespace
    actual_normalized = actual_output.replace('\r\n', '\n').strip()
    expected_normalized = expected_output.replace('\r\n', '\n').strip()
    return actual_normalized == expected_normalized

def save_grading_result(result_record):
    """최종 채점 결과를 DynamoDB submissions_table에 저장"""
    try:
        # Convert floats to Decimals for DynamoDB
        result_record['execution_time'] = Decimal(str(result_record['execution_time']))
        for case_result in result_record.get('results', []):
            if 'execution_time' in case_result:
                case_result['execution_time'] = Decimal(str(case_result['execution_time']))

        # DynamoDB 항목 크기 제한 (400KB) 고려 - 여기서는 단순 저장 가정
        # 필요시 user_code, results 상세 내용 등 제외/요약 로직 추가
        logger.info(f"Saving submission {result_record['submission_id']} to DynamoDB.")
        submissions_table.put_item(Item=result_record)
        logger.info(f"Successfully saved submission {result_record['submission_id']}")
        return None # 성공 시 에러 메시지 없음

    except ClientError as e:
        logger.error(f"Failed to save submission {result_record.get('submission_id')} to DynamoDB: {e}")
        return f"Failed to save result to DynamoDB: {e.response['Error']['Message']}"
    except Exception as e:
        logger.error(f"Unexpected error saving submission {result_record.get('submission_id')} to DynamoDB: {e}")
        return f"An unexpected error occurred while saving the result: {traceback.format_exc()}"

# --- Lambda 핸들러 --- #

def handler(event, context):
    """Lambda 함수 메인 핸들러"""
    start_time = time.time()
    logger.info(f"Received event: {json.dumps(event)}")

    # 입력 파싱 (API Gateway Proxy Integration 또는 직접 호출 가정)
    # 실제 트리거 방식에 따라 event 구조가 다르므로 유연하게 처리
    body = event
    if isinstance(event.get('body'), str):
        try:
            body = json.loads(event['body'])
        except json.JSONDecodeError:
            logger.error("Failed to parse request body as JSON")
            return {'statusCode': 400, 'body': json.dumps({'error': 'Invalid JSON format in request body'})}

    problem_id = body.get('problem_id')
    user_code = body.get('user_code')
    language = body.get('language', 'python') # 기본 언어 python

    if not all([problem_id, user_code, language]):
        logger.error("Missing required fields: problem_id, user_code, or language")
        return {'statusCode': 400, 'body': json.dumps({'error': 'Missing required fields: problem_id, user_code, language'})}

    # 지원 언어 확인 (현재는 python만 지원)
    if language.lower() != 'python':
        logger.error(f"Unsupported language: {language}")
        # 초기 결과 저장 (오류 상태)
        submission_id = f"sub_{int(time.time() * 1000)}_{uuid.uuid4()}"
        error_result = {
            'submission_id': submission_id,
            'problem_id': problem_id,
            'language': language,
            'status': STATUS_INTERNAL_ERROR, # 또는 UNSUPPORTED_LANGUAGE
            'execution_time': 0.0,
            'results': [],
            'submission_time': int(start_time),
            'user_code': user_code[:1000], # 코드 일부 저장 (크기 제한)
            'error_message': f"Unsupported language: {language}"
        }
        save_grading_result(error_result.copy()) # 저장 시도
        return {'statusCode': 400, 'body': json.dumps({'error': f"Unsupported language: {language}"})}

    # --- Submission ID 생성 --- #
    submission_id = f"sub_{int(time.time() * 1000)}_{uuid.uuid4()}"
    logger.info(f"Generated submission ID: {submission_id}")

    # --- 최종 결과 저장용 딕셔너리 초기화 --- #
    final_submission_result = {
        'submission_id': submission_id,
        'problem_id': problem_id,
        'language': language,
        'status': STATUS_INTERNAL_ERROR, # 기본 상태
        'execution_time': 0.0,
        'results': [],
        'submission_time': int(start_time),
        'user_code': user_code, # README: 선택적 저장 (크기 주의)
        'error_message': None
    }

    try:
        # --- 1. 문제 정보 조회 --- #
        logger.info(f"[{submission_id}] Fetching problem details for problem_id: {problem_id}")
        time_limit, test_cases, error_msg = get_problem_details(problem_id)

        if error_msg:
            logger.error(f"[{submission_id}] Failed to get problem details: {error_msg}")
            final_submission_result['status'] = STATUS_INTERNAL_ERROR
            final_submission_result['error_message'] = error_msg
            save_grading_result(final_submission_result.copy())
            return {'statusCode': 500, 'body': json.dumps({'submission_id': submission_id, 'status': STATUS_INTERNAL_ERROR, 'error': error_msg})}

        # 테스트 케이스 없는 경우
        if not test_cases:
            logger.warning(f"[{submission_id}] No test cases found for problem {problem_id}. Setting status to NO_TEST_CASES.")
            final_submission_result['status'] = STATUS_NO_TEST_CASES
            final_submission_result['error_message'] = "No test cases found for this problem."
            save_grading_result(final_submission_result.copy())
            return {'statusCode': 200, 'body': json.dumps({'submission_id': submission_id, 'status': STATUS_NO_TEST_CASES})}

        logger.info(f"[{submission_id}] Found {len(test_cases)} test cases. Time limit: {time_limit}s.")

        # --- 2. 테스트 케이스 순회 및 채점 --- #
        overall_status = STATUS_ACCEPTED # Assume success initially
        max_execution_time = 0.0
        case_results_list = []
        fail_fast = False

        for i, case in enumerate(test_cases):
            case_num = i + 1
            s3_key = f"results/{submission_id}/case_{case_num}.json"
            case_result = {"case": case_num, "status": STATUS_INTERNAL_ERROR, "execution_time": 0.0}
            logger.info(f"[{submission_id}] Processing case {case_num}/{len(test_cases)}")

            # Runner 환경 변수 설정
            runner_env_vars = [
                {'name': 'USER_CODE', 'value': user_code},
                {'name': 'INPUT_DATA', 'value': case['input']},
                {'name': 'TIME_LIMIT', 'value': str(time_limit)},
                {'name': 'S3_BUCKET', 'value': S3_BUCKET_NAME},
                {'name': 'S3_KEY', 'value': s3_key}
            ]

            # ECS Task 실행
            task_arn, task_error = run_fargate_task(RUNNER_PYTHON_TASK_DEF_ARN, runner_env_vars, RUNNER_PYTHON_CONTAINER_NAME, submission_id, case_num)

            if task_error:
                logger.error(f"[{submission_id}] Case {case_num}: ECS Task failed: {task_error}")
                case_result['status'] = STATUS_INTERNAL_ERROR
                final_submission_result['error_message'] = f"Case {case_num}: {task_error}"
                fail_fast = True # Internal error triggers fail fast
            else:
                # S3 결과 조회 및 파싱
                s3_output_str, s3_error = get_s3_output(s3_key)
                if s3_error:
                    logger.error(f"[{submission_id}] Case {case_num}: Failed to get S3 output ({s3_key}): {s3_error}")
                    case_result['status'] = STATUS_INTERNAL_ERROR
                    final_submission_result['error_message'] = f"Case {case_num}: {s3_error}"
                    fail_fast = True
                else:
                    runner_result, parse_error = parse_json_output(s3_output_str, s3_key)
                    if parse_error:
                        logger.error(f"[{submission_id}] Case {case_num}: Failed to parse Runner output ({s3_key}): {parse_error}")
                        case_result['status'] = STATUS_INTERNAL_ERROR
                        final_submission_result['error_message'] = f"Case {case_num}: {parse_error}"
                        fail_fast = True
                    else:
                        # Runner 결과 기반 상태 판정
                        runner_status = runner_result['status']
                        runner_stdout = runner_result['stdout']
                        runner_stderr = runner_result['stderr'] # 참고용
                        runner_time = float(runner_result['execution_time'])
                        case_result['execution_time'] = runner_time
                        max_execution_time = max(max_execution_time, runner_time)

                        if runner_status == STATUS_SUCCESS:
                            if compare_outputs(runner_stdout, case['expected_output']):
                                case_result['status'] = STATUS_ACCEPTED
                            else:
                                case_result['status'] = STATUS_WRONG_ANSWER
                                fail_fast = True
                        elif runner_status == STATUS_RUNTIME_ERROR:
                            case_result['status'] = STATUS_RUNTIME_ERROR
                            # RE 발생 시 Runner stderr 를 Lambda error_message 에 추가 가능
                            final_submission_result['error_message'] = f"Case {case_num}: Runtime Error. Details in runner logs or S3 result."
                            fail_fast = True
                        elif runner_status == STATUS_TIME_LIMIT_EXCEEDED:
                            case_result['status'] = STATUS_TIME_LIMIT_EXCEEDED
                            fail_fast = True
                        elif runner_status == STATUS_GRADER_ERROR:
                            case_result['status'] = STATUS_INTERNAL_ERROR # Runner 오류는 최종 IE 처리
                            # Runner stderr 를 Lambda error_message 에 추가
                            final_submission_result['error_message'] = f"Case {case_num}: Grader Error - {runner_stderr[:500]}"
                            fail_fast = True
                        else:
                            # 예상치 못한 Runner 상태
                            logger.error(f"[{submission_id}] Case {case_num}: Unexpected runner status '{runner_status}'")
                            case_result['status'] = STATUS_INTERNAL_ERROR
                            final_submission_result['error_message'] = f"Case {case_num}: Unexpected runner status '{runner_status}'."
                            fail_fast = True

            case_results_list.append(case_result)
            logger.info(f"[{submission_id}] Case {case_num} result: {case_result['status']}, Time: {case_result['execution_time']:.4f}s")

            # Fail Fast: 첫 실패 시 중단
            if fail_fast:
                logger.warning(f"[{submission_id}] Fail fast triggered at case {case_num} with status {case_result['status']}. Stopping further tests.")
                break

        # --- 3. 최종 결과 집계 --- #
        if not case_results_list:
             # 이 경우는 거의 없어야 함 (NO_TEST_CASES 에서 걸러짐)
            logger.error(f"[{submission_id}] No case results were recorded, though test cases existed.")
            overall_status = STATUS_INTERNAL_ERROR
            if not final_submission_result['error_message']:
                 final_submission_result['error_message'] = "No grading results were produced."
        else:
            # 가장 안 좋은 상태를 전체 상태로 결정
            worst_case_status = min(case_results_list, key=lambda x: STATUS_PRIORITY.get(x['status'], 0))['status']
            overall_status = worst_case_status

        final_submission_result['status'] = overall_status
        final_submission_result['execution_time'] = round(max_execution_time, 4)
        final_submission_result['results'] = case_results_list
        # user_code는 이미 맨 처음에 저장됨

        logger.info(f"[{submission_id}] Final aggregated result: Status={overall_status}, MaxTime={max_execution_time:.4f}s")

        # --- 4. DynamoDB 저장 --- #
        save_error = save_grading_result(final_submission_result.copy()) # 복사본 전달 (Decimal 변환 때문)
        if save_error:
            # 저장 실패해도 로깅하고, 가능한 결과 반환
            logger.error(f"[{submission_id}] CRITICAL: Failed to save final result to DynamoDB: {save_error}")
            # 에러 메시지 업데이트 시도 (덮어쓰지 않도록 주의)
            if not final_submission_result.get('error_message'):
                final_submission_result['error_message'] = "Failed to save submission record to database."
            # 상태를 IE로 강제할 수도 있음
            final_submission_result['status'] = STATUS_INTERNAL_ERROR
            # 반환값에는 저장 실패 사실 명시
            return {
                'statusCode': 500,
                'body': json.dumps({
                    'submission_id': submission_id,
                    'status': STATUS_INTERNAL_ERROR,
                    'error': 'Failed to save final result to DynamoDB. Check logs.',
                    'details': final_submission_result # 저장 못한 결과라도 반환
                })
            }

        # --- 5. 결과 반환 --- #
        logger.info(f"[{submission_id}] Grading complete. Total time: {time.time() - start_time:.2f}s")
        # 최종 결과에서 Decimal을 float로 다시 변환하여 JSON 직렬화 가능하게 함
        final_submission_result['execution_time'] = float(final_submission_result['execution_time'])
        for res in final_submission_result['results']:
            res['execution_time'] = float(res['execution_time'])

        return {
            'statusCode': 200,
            'body': json.dumps(final_submission_result) # 성공 시 최종 결과 반환
        }

    except Exception as e:
        # 핸들러 전체를 감싸는 예외 처리
        logger.error(f"[{submission_id}] Unhandled exception in handler: {traceback.format_exc()}")
        error_msg = f"An unexpected internal server error occurred: {e}"

        # 가능한 경우 오류 상태를 DB에 저장 시도
        if 'submission_id' in locals(): # submission_id 가 생성된 이후 발생한 오류
            final_submission_result['status'] = STATUS_INTERNAL_ERROR
            final_submission_result['error_message'] = error_msg
            final_submission_result['execution_time'] = round(time.time() - start_time, 4)
            # 실행 시간이 없으므로 0 또는 현재까지 시간
            save_grading_result(final_submission_result.copy()) # 저장 실패는 무시

        return {
            'statusCode': 500,
            'body': json.dumps({
                'submission_id': submission_id if 'submission_id' in locals() else None,
                'status': STATUS_INTERNAL_ERROR,
                'error': error_msg
            })
        } 