import json
import os
import uuid
import boto3
import logging
import time
import traceback
import subprocess # subprocess 임포트
import tempfile   # tempfile 임포트
import signal     # signal 임포트 (시간 제한용)
from decimal import Decimal
from botocore.exceptions import ClientError

# 로거 설정
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# 환경 변수 읽기
try:
    DYNAMODB_PROBLEMS_TABLE_NAME = os.environ['DYNAMODB_PROBLEMS_TABLE_NAME']
    DYNAMODB_SUBMISSIONS_TABLE_NAME = os.environ['DYNAMODB_SUBMISSIONS_TABLE_NAME']
except KeyError as e:
    logger.critical(f"FATAL: Missing required environment variable: {e}")
    raise ValueError(f"Environment variable {e} is required.")

# Boto3 클라이언트 및 DynamoDB 리소스 초기화
dynamodb_resource = boto3.resource('dynamodb')
try:
    problems_table = dynamodb_resource.Table(DYNAMODB_PROBLEMS_TABLE_NAME)
    submissions_table = dynamodb_resource.Table(DYNAMODB_SUBMISSIONS_TABLE_NAME)
except ClientError as e:
     logger.critical(f"FATAL: Failed to access DynamoDB tables: {e}")
     raise # Lambda 초기화 실패

# 상태 코드 정의
STATUS_ACCEPTED = "ACCEPTED"
STATUS_WRONG_ANSWER = "WRONG_ANSWER"
STATUS_TIME_LIMIT_EXCEEDED = "TIME_LIMIT_EXCEEDED"
STATUS_RUNTIME_ERROR = "RUNTIME_ERROR"
STATUS_INTERNAL_ERROR = "INTERNAL_ERROR"
STATUS_NO_TEST_CASES = "NO_TEST_CASES"

# 상태 우선순위
STATUS_PRIORITY = {
    STATUS_ACCEPTED: 5,
    STATUS_WRONG_ANSWER: 4,
    STATUS_TIME_LIMIT_EXCEEDED: 3,
    STATUS_RUNTIME_ERROR: 2,
    STATUS_INTERNAL_ERROR: 1,
    STATUS_NO_TEST_CASES: 0,
}

def get_problem_details(problem_id):
    """DynamoDB에서 문제 정보 및 테스트 케이스 조회 (JSON 문자열 파싱 포함)"""
    try:
        response = problems_table.get_item(Key={'problemId': problem_id})
        item = response.get('Item')
        if not item:
            return None, None, f"Problem with ID '{problem_id}' not found."

        # constraints 필드 (JSON 문자열) 읽기 및 파싱
        constraints_str = item.get('constraints')
        if not isinstance(constraints_str, str):
            # 문자열이 아니면 오류 처리 (또는 기존 Map 타입도 허용할지 고려)
            return None, None, f"'constraints' field is not a JSON string for problem {problem_id}."
        try:
            constraints = json.loads(constraints_str)
            if not isinstance(constraints, dict):
                 raise ValueError("Parsed constraints is not a dictionary")
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse constraints JSON for problem {problem_id}: {e}")
            return None, None, f"Invalid JSON format in 'constraints' field for problem {problem_id}."

        time_limit = constraints.get('time_limit_seconds')

        # testSpecifications 필드 (JSON 문자열) 읽기 및 파싱
        test_specifications_str = item.get('testSpecifications')
        if not isinstance(test_specifications_str, str):
            return None, None, f"'testSpecifications' field is not a JSON string for problem {problem_id}."
        try:
            test_specifications = json.loads(test_specifications_str)
            # Add logging to check the parsed structure
            logger.info(f"Parsed test_specifications for problem {problem_id}: {test_specifications}")
            if not isinstance(test_specifications, list):
                 raise ValueError("Parsed testSpecifications is not a list")
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse testSpecifications JSON for problem {problem_id}: {e}")
            return None, None, f"Invalid JSON format in 'testSpecifications' field for problem {problem_id}."

        try:
            time_limit_int = int(time_limit)
            if time_limit_int <= 0:
                raise ValueError("Time limit must be positive")
        except (TypeError, ValueError):
            return None, None, f"Invalid time_limit_seconds configured in constraints for problem {problem_id}."

        # 파싱된 test_specifications 유효성 검사
        if not test_specifications: # 리스트가 비어있는 경우
            return time_limit_int, [], None # NO_TEST_CASES

        for i, spec in enumerate(test_specifications):
            if not isinstance(spec, dict) or 'input' not in spec or 'expected_output' not in spec:
                return None, None, f"Invalid test specification format at index {i} for problem {problem_id}. Must include 'input' and 'expected_output'."

        return time_limit_int, test_specifications, None
    except ClientError as e:
        logger.error(f"DynamoDB error getting problem {problem_id}: {e}")
        return None, None, f"Failed to retrieve problem details: {e.response['Error']['Message']}"
    except Exception as e:
        logger.error(f"Unexpected error getting problem details: {e}")
        return None, None, f"Unexpected error fetching problem details: {traceback.format_exc()}"

def compare_outputs(actual_output, expected_output):
    """출력 비교"""
    actual_normalized = actual_output.replace('\r\n', '\n').strip()
    expected_normalized = expected_output.replace('\r\n', '\n').strip()
    return actual_normalized == expected_normalized

def save_grading_result(result_record):
    """결과를 DynamoDB에 저장 (camelCase 키 사용, JSON 크기 확인 수정)"""
    try:
        # Float -> Decimal 변환 (DynamoDB 저장을 위해)
        original_execution_time = result_record['executionTime'] # 원래 float 값 저장
        result_record['executionTime'] = Decimal(str(original_execution_time))
        original_case_times = []
        for case_result in result_record.get('results', []):
            if 'executionTime' in case_result:
                original_case_times.append(case_result['executionTime']) # 원래 float 값 저장
                case_result['executionTime'] = Decimal(str(case_result['executionTime']))

        # 크기 제한 처리 (JSON 변환 전)
        if 'userCode' in result_record and len(result_record['userCode'].encode('utf-8')) > 350 * 1024:
             result_record['userCode'] = result_record['userCode'][:10000] + "... (truncated)"
             logger.warning(f"[{result_record.get('submissionId')}] Truncated userCode due to size limit.")

        # JSON 변환을 위해 임시로 Decimal을 float/str로 변환
        results_for_json_check = []
        for i, r in enumerate(result_record.get('results', [])):
             temp_res = r.copy()
             if 'executionTime' in temp_res:
                 # 저장된 원래 float 값 사용 (없으면 str 변환)
                 temp_res['executionTime'] = original_case_times[i] if i < len(original_case_times) else str(temp_res['executionTime'])
             results_for_json_check.append(temp_res)

        results_json_str = json.dumps(results_for_json_check) # 변환된 리스트로 크기 확인
        if len(results_json_str.encode('utf-8')) > 350 * 1024:
             logger.warning(f"[{result_record.get('submissionId')}] Result list is too large. Saving summary only.")
             summarized_results = []
             for r in result_record.get('results', []): # 원본 result_record 사용 (Decimal 유지)
                 summarized_results.append({
                     'caseNumber': r.get('caseNumber'),
                     'status': r.get('status'),
                     'executionTime': r.get('executionTime') # Decimal 유지
                 })
             result_record['results'] = summarized_results
             result_record['errorMessage'] = (result_record.get('errorMessage') or "") + " [Result details truncated due to size limit]"

        logger.info(f"Saving submission {result_record['submissionId']} to DynamoDB.")
        submissions_table.put_item(Item=result_record) # 최종 저장은 Decimal 포함된 원본 사용
        logger.info(f"Successfully saved submission {result_record['submissionId']}")
        return None
    except ClientError as e:
        logger.error(f"Failed to save submission to DynamoDB: {e}")
        return f"Failed to save result to DynamoDB: {e.response['Error']['Message']}"
    except Exception as e:
        logger.error(f"Unexpected error saving submission to DynamoDB: {e}")
        return f"Unexpected error saving the result: {traceback.format_exc()}"

# --- Lambda 핸들러 구현 --- #

def lambda_handler(event, context):
    """Lambda 함수 메인 핸들러 (순수 Lambda + subprocess 방식, camelCase 적용)"""
    start_time = time.time()
    logger.info(f"Received event: {json.dumps(event)}")

    # 1. 입력 파싱 및 검증 (camelCase 키 사용)
    body = event
    if isinstance(event.get('body'), str):
        try:
            body = json.loads(event['body'])
        except json.JSONDecodeError:
            return {'statusCode': 400, 'body': json.dumps({'error': 'Invalid JSON format'})}

    problem_id = body.get('problemId') # problem_id -> problemId
    user_code = body.get('userCode')   # user_code -> userCode
    language = body.get('language', 'python')

    if not all([problem_id, user_code]):
        return {'statusCode': 400, 'body': json.dumps({'error': 'Missing problemId or userCode'})}

    if language.lower() != 'python':
        return {'statusCode': 400, 'body': json.dumps({'error': f"Unsupported language: {language}"})}

    submission_id = f"sub_{int(time.time() * 1000)}_{uuid.uuid4()}"
    logger.info(f"[{submission_id}] Starting grading for problem {problem_id}")

    # 최종 결과 딕셔너리 (camelCase 키 사용)
    final_submission_result = {
        'submissionId': submission_id,
        'problemId': problem_id,
        'language': language,
        'status': STATUS_INTERNAL_ERROR,
        'executionTime': 0.0,
        'results': [],
        'submissionTime': int(start_time),
        'userCode': user_code,
        'errorMessage': None
    }

    temp_file_path = None

    try:
        # 2. 문제 정보 조회 (get_problem_details는 이미 수정됨)
        time_limit, test_specifications, error_msg = get_problem_details(problem_id)
        if error_msg:
            final_submission_result['errorMessage'] = error_msg
            raise ValueError(error_msg)

        # test_cases -> test_specifications
        if not test_specifications:
            final_submission_result['status'] = STATUS_NO_TEST_CASES
            final_submission_result['errorMessage'] = "No test specifications found."
            save_grading_result(final_submission_result.copy())
            return final_submission_result

        # 3. 테스트 케이스 순회 실행 (camelCase 키 사용)
        overall_status = STATUS_ACCEPTED
        max_execution_time = 0.0
        case_results_list = []
        fail_fast = False

        # case -> spec, test_cases -> test_specifications
        for i, spec in enumerate(test_specifications):
            case_num = i + 1
            # case -> caseNumber
            case_result = {"caseNumber": case_num, "status": STATUS_INTERNAL_ERROR, "executionTime": 0.0}
            logger.info(f"[{submission_id}] Processing case {case_num}/{len(test_specifications)}")

            stdout_res, stderr_res = "", ""
            proc_status_internal = STATUS_INTERNAL_ERROR
            execution_time = 0.0

            try:
                with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as tf:
                    tf.write(user_code)
                    temp_file_path = tf.name

                exec_start_time = time.monotonic()

                try:
                    proc = subprocess.run(
                        ['python', temp_file_path],
                        input=spec['input'], # case['input'] -> spec['input']
                        capture_output=True,
                        text=True,
                        timeout=time_limit
                    )
                    exec_end_time = time.monotonic()
                    execution_time = round(exec_end_time - exec_start_time, 4)
                    stdout_res = proc.stdout
                    stderr_res = proc.stderr

                    if proc.returncode == 0:
                        proc_status_internal = STATUS_ACCEPTED
                    else:
                        proc_status_internal = STATUS_RUNTIME_ERROR
                        logger.warning(f"[{submission_id}] Case {case_num}: Runtime error (code: {proc.returncode}), stderr: {stderr_res[:500]}")

                except subprocess.TimeoutExpired as e:
                    execution_time = float(time_limit)
                    stderr_res = f"Time Limit Exceeded ({time_limit}s)"
                    proc_status_internal = STATUS_TIME_LIMIT_EXCEEDED
                    logger.warning(f"[{submission_id}] Case {case_num}: Time Limit Exceeded")

                except FileNotFoundError:
                     stderr_res = "Error: 'python' command not found in Lambda environment."
                     proc_status_internal = STATUS_INTERNAL_ERROR
                     logger.error(f"[{submission_id}] Case {case_num}: {stderr_res}")

                except Exception as e:
                    stderr_res = f"Subprocess execution failed: {traceback.format_exc()}"
                    proc_status_internal = STATUS_INTERNAL_ERROR
                    logger.error(f"[{submission_id}] Case {case_num}: {stderr_res}")

                # 케이스 최종 상태 판정 (camelCase 키 사용)
                case_result['executionTime'] = execution_time
                max_execution_time = max(max_execution_time, execution_time)

                if proc_status_internal == STATUS_ACCEPTED:
                    # case['expected_output'] -> spec['expected_output']
                    if compare_outputs(stdout_res, spec['expected_output']):
                        case_result['status'] = STATUS_ACCEPTED
                    else:
                        case_result['status'] = STATUS_WRONG_ANSWER
                        logger.info(f"[{submission_id}] Case {case_num}: Wrong Answer")
                        fail_fast = True
                elif proc_status_internal == STATUS_TIME_LIMIT_EXCEEDED:
                     case_result['status'] = STATUS_TIME_LIMIT_EXCEEDED
                     fail_fast = True
                elif proc_status_internal == STATUS_RUNTIME_ERROR:
                    case_result['status'] = STATUS_RUNTIME_ERROR
                    case_result['stderr'] = stderr_res[:500]
                    fail_fast = True
                else: # STATUS_INTERNAL_ERROR
                    case_result['status'] = STATUS_INTERNAL_ERROR
                    case_result['stderr'] = stderr_res[:500]
                    fail_fast = True

            finally:
                if temp_file_path and os.path.exists(temp_file_path):
                    try:
                        os.remove(temp_file_path)
                        temp_file_path = None
                    except OSError as e:
                        logger.warning(f"[{submission_id}] Failed to remove temp file {temp_file_path}: {e}")

            case_results_list.append(case_result)
            logger.info(f"[{submission_id}] Case {case_num} result: {case_result['status']}, Time: {case_result['executionTime']:.4f}s")

            if fail_fast:
                logger.warning(f"[{submission_id}] Fail fast triggered at case {case_num}. Stopping.")
                break

        # 4. 최종 결과 집계 (camelCase 키 사용)
        if not case_results_list:
             overall_status = STATUS_INTERNAL_ERROR
             final_submission_result['errorMessage'] = "No case results generated."
        else:
             worst_case_status = min(case_results_list, key=lambda x: STATUS_PRIORITY.get(x['status'], 0))['status']
             overall_status = worst_case_status

        final_submission_result['status'] = overall_status
        final_submission_result['executionTime'] = round(max_execution_time, 4)
        final_submission_result['results'] = case_results_list
        if overall_status != STATUS_ACCEPTED and not final_submission_result['errorMessage']:
             first_fail = next((r for r in case_results_list if r['status'] != STATUS_ACCEPTED), None)
             if first_fail:
                  err_detail = first_fail.get('stderr') or f"Failed with status {first_fail['status']}"
                  # case -> caseNumber
                  final_submission_result['errorMessage'] = f"Case {first_fail['caseNumber']}: {err_detail}"

        logger.info(f"[{submission_id}] Aggregated result: Status={overall_status}, MaxTime={max_execution_time:.4f}s")

        # 5. 결과 저장 (save_grading_result 는 이미 수정됨)
        save_error = save_grading_result(final_submission_result.copy())
        if save_error:
            logger.error(f"[{submission_id}] CRITICAL: Failed to save result to DynamoDB: {save_error}")
            final_submission_result['errorMessage'] = (final_submission_result.get('errorMessage') or "") + f" [DB Save Error: {save_error}]"
            final_submission_result['status'] = STATUS_INTERNAL_ERROR

    except Exception as e:
        logger.error(f"[{submission_id}] Unhandled exception in handler: {traceback.format_exc()}")
        final_submission_result['status'] = STATUS_INTERNAL_ERROR
        if not final_submission_result['errorMessage']:
             final_submission_result['errorMessage'] = f"Internal server error during grading: {e}"
        save_grading_result(final_submission_result.copy())

    # 6. 최종 결과 반환 (float 변환 및 camelCase 유지)
    final_submission_result['executionTime'] = float(final_submission_result['executionTime'])
    for res in final_submission_result.get('results', []):
        res['executionTime'] = float(res['executionTime'])

    logger.info(f"[{submission_id}] Grading process finished. Total elapsed time: {time.time() - start_time:.2f}s")

    return {
        'statusCode': 200 if final_submission_result['status'] != STATUS_INTERNAL_ERROR else 500,
        'body': json.dumps(final_submission_result)
    } 