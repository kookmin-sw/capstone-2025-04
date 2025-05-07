import json
import boto3
import time
import uuid
import os # 환경 변수 접근을 위해 추가
import traceback # 상세 에러 로깅을 위해 추가
from decimal import Decimal, ROUND_HALF_UP

# Initialize AWS clients outside the handler
dynamodb = boto3.resource('dynamodb')
lambda_client = boto3.client('lambda')

PROBLEMS_TABLE_NAME = os.environ.get('PROBLEMS_TABLE_NAME', 'alpaco-Problems-production')
SUBMISSIONS_TABLE_NAME = os.environ.get('SUBMISSIONS_TABLE_NAME', 'problem-submissions')
RUN_CODE_LAMBDA_NAME = os.environ.get('RUN_CODE_LAMBDA_NAME', 'your-runCode-lambda-name')

ALLOWED_JUDGE_TYPES = ["equal", "unordered_equal", "float_eps"]
DEFAULT_EPSILON = Decimal('1e-6')
IS_SUBMISSION_VALUE = "Y"  # For GSI AllSubmissionsByTimeIndex

# Helper function to compare outputs (기존과 동일)
def compare_outputs(actual, expected, judge_type, epsilon=DEFAULT_EPSILON):
    if judge_type == "equal":
        return actual == expected
    elif judge_type == "unordered_equal":
        if not isinstance(actual, list) or not isinstance(expected, list): return False
        if len(actual) != len(expected): return False
        try:
            return sorted(actual) == sorted(expected)
        except TypeError:
            actual_counts = {}
            expected_counts = {}
            for item in actual:
                s_item = json.dumps(item, sort_keys=True)
                actual_counts[s_item] = actual_counts.get(s_item, 0) + 1
            for item in expected:
                s_item = json.dumps(item, sort_keys=True)
                expected_counts[s_item] = expected_counts.get(s_item, 0) + 1
            return actual_counts == expected_counts
    elif judge_type == "float_eps":
        try:
            actual_val = Decimal(str(actual))
            expected_val = Decimal(str(expected))
        except:
            return False
        return abs(actual_val - expected_val) <= Decimal(str(epsilon))
    return False

# Helper to convert float to Decimal (기존과 동일)
def float_to_decimal(val, precision='0.000000'):
    if isinstance(val, float):
        return Decimal(str(val)).quantize(Decimal(precision), rounding=ROUND_HALF_UP)
    if isinstance(val, int):
        return Decimal(val)
    return val

def run_single_test_case(user_code, case_input, language, problem_time_limit_seconds=2):
    """
    Helper function to invoke runCode Lambda for a single test case.
    Returns the raw result from runCode Lambda.
    """
    run_code_payload_body = {
        'code_to_execute': user_code,
        'input_data': case_input,
        # Ensure timeout_ms is an integer
        'timeout_ms': int(float(problem_time_limit_seconds) * 1000)
    }
    run_code_payload = {'body': json.dumps(run_code_payload_body)}

    print(f"Invoking runCode with input: {json.dumps(case_input)[:200]}...")

    response = lambda_client.invoke(
        FunctionName=RUN_CODE_LAMBDA_NAME,
        InvocationType='RequestResponse',
        Payload=json.dumps(run_code_payload)
    )
    response_payload_str = response['Payload'].read().decode('utf-8')
    run_code_result_outer = json.loads(response_payload_str)

    if response.get('FunctionError'):
        print(f"runCode Lambda FunctionError: {run_code_result_outer}")
        # This is an error in runCode lambda itself, not user code execution normally
        # Propagate it as a distinct error structure
        return {
            'runCodeLambdaError': True, # Custom flag
            'errorType': run_code_result_outer.get('errorType', 'LambdaFunctionError'),
            'errorMessage': run_code_result_outer.get('errorMessage', 'runCode Lambda unhandled error'),
            'trace': run_code_result_outer.get('trace', [])
        }

    # The actual execution result is in the 'body' of runCode's response
    run_code_execution_result = json.loads(run_code_result_outer['body'])
    print(f"runCode execution result: {json.dumps(run_code_execution_result)}")
    return run_code_execution_result


def lambda_handler(event, context):
    print(f"Received grading request: {json.dumps(event)}")

    try:
        if 'body' in event:
            body_str = event['body']
            payload = json.loads(body_str) if isinstance(body_str, str) else body_str
        else:
            payload = event

        execution_mode = payload.get('executionMode', "GRADE_SUBMISSION") # "GRADE_SUBMISSION" or "RUN_CUSTOM_TESTS"
        problem_id = payload.get('problemId') # Needed for GRADE_SUBMISSION, optional for RUN_CUSTOM_TESTS (for time_limit)
        user_id = payload.get('userId')  # Extract userId from payload
        user_code = payload.get('userCode')
        language = payload.get('language', 'python3.12')
        submission_id_param = payload.get('submissionId')

        if not user_code:
            raise ValueError("Missing userCode in the request.")
        if execution_mode == "GRADE_SUBMISSION":
            if not problem_id:
                raise ValueError("Missing problemId for GRADE_SUBMISSION mode.")
            if not user_id:
                raise ValueError("Missing userId for GRADE_SUBMISSION mode.")
        if execution_mode == "RUN_CUSTOM_TESTS" and 'customTestCases' not in payload:
            raise ValueError("Missing customTestCases for RUN_CUSTOM_TESTS mode.")

    except (json.JSONDecodeError, ValueError) as e:
        print(f"Input error: {str(e)}")
        return {'statusCode': 400, 'body': json.dumps({'error': f'Invalid input: {str(e)}'})}

    # --------------------------
    # --- RUN CUSTOM TESTS MODE ---
    # --------------------------
    if execution_mode == "RUN_CUSTOM_TESTS":
        custom_test_cases = payload.get('customTestCases', [])
        if not isinstance(custom_test_cases, list):
             return {'statusCode': 400, 'body': json.dumps({'error': 'customTestCases must be a list.'})}

        results_for_custom_tests = []
        # Try to get problem's time limit if problemId is provided, otherwise use a default.
        problem_time_limit_seconds = 2 # Default time limit for custom tests
        if problem_id: # User might provide problemId to use its time limit
            try:
                problems_table = dynamodb.Table(PROBLEMS_TABLE_NAME)
                problem_item_response = problems_table.get_item(Key={'problemId': problem_id})
                if 'Item' in problem_item_response and 'timeLimitSeconds' in problem_item_response['Item']:
                    # Ensure timeLimitSeconds is a number
                    time_limit = problem_item_response['Item']['timeLimitSeconds']
                    problem_time_limit_seconds = float(time_limit) if isinstance(time_limit, (int, float, Decimal)) else 2.0
            except Exception as db_err:
                print(f"Could not fetch problem time limit for custom run (problemId: {problem_id}): {str(db_err)}")


        for i, custom_case_input in enumerate(custom_test_cases):
            case_identifier = f"Custom Case {i + 1}"
            print(f"Executing {case_identifier}...")
            try:
                # For custom tests, the 'input' is directly the custom_case_input
                # The structure of custom_case_input should match what 'solution(input_data)' expects
                raw_execution_result = run_single_test_case(user_code, custom_case_input, language, problem_time_limit_seconds)

                # Append the raw result from runCode lambda
                results_for_custom_tests.append({
                    'caseIdentifier': case_identifier,
                    'input': custom_case_input,
                    'runCodeOutput': raw_execution_result # This is the direct output of runCode lambda
                })
            except Exception as e:
                print(f"Error processing {case_identifier}: {str(e)}\n{traceback.format_exc()}")
                results_for_custom_tests.append({
                    'caseIdentifier': case_identifier,
                    'input': custom_case_input,
                    'runCodeOutput': { # Mimic runCode error structure for consistency
                        'error': f'Grader error during custom test: {str(e)}',
                        'stdout': '', 'stderr': f'Grader error: {str(e)}',
                        'exitCode': -1, 'executionTimeMs': 0,
                        'timedOut': False, 'isSuccessful': False
                    }
                })

        return {
            'statusCode': 200,
            'body': json.dumps({
                'executionMode': "RUN_CUSTOM_TESTS_RESULTS",
                'results': results_for_custom_tests
            })
        }

    # --------------------------
    # --- GRADE SUBMISSION MODE --- (Existing Logic)
    # --------------------------
    elif execution_mode == "GRADE_SUBMISSION":
        submission_id = submission_id_param if submission_id_param else str(uuid.uuid4())
        submission_time = int(time.time())
        overall_status = "INTERNAL_ERROR"
        max_execution_time_ms = 0
        final_results_list = []
        error_message_for_submission = None

        try:
            problems_table = dynamodb.Table(PROBLEMS_TABLE_NAME)
            problem_item_response = problems_table.get_item(Key={'problemId': problem_id})

            if 'Item' not in problem_item_response:
                raise Exception(f"Problem with ID '{problem_id}' not found.")

            problem_data = problem_item_response['Item']
            final_test_cases_str = problem_data.get('finalTestCases')
            judge_type = problem_data.get('judgeType', 'equal')
            epsilon_str = problem_data.get('epsilon')
            
            # Ensure timeLimitSeconds is correctly parsed as a number
            time_limit_from_db = problem_data.get('timeLimitSeconds', 2)
            problem_time_limit_seconds = float(time_limit_from_db) if isinstance(time_limit_from_db, (int, float, Decimal)) else 2.0

            if judge_type not in ALLOWED_JUDGE_TYPES:
                print(f"Warning: Problem '{problem_id}' has an invalid judge_type '{judge_type}'. Defaulting to 'equal'.")
                judge_type = 'equal'
            epsilon = DEFAULT_EPSILON
            if epsilon_str is not None:
                try: epsilon = Decimal(str(epsilon_str))
                except: epsilon = DEFAULT_EPSILON


            if not final_test_cases_str:
                overall_status = "NO_TEST_CASES"
                error_message_for_submission = "No test cases found for this problem."
            else:
                test_cases = json.loads(final_test_cases_str)
                if not isinstance(test_cases, list) or not test_cases:
                    overall_status = "NO_TEST_CASES"
                    error_message_for_submission = "Test cases are empty or not in list format."
                else:
                    overall_status = "ACCEPTED"

                    for i, test_case_obj in enumerate(test_cases):
                        case_number = i + 1
                        case_input = test_case_obj.get('input')
                        expected_output = test_case_obj.get('expected_output')

                        case_status = "INTERNAL_ERROR"
                        case_exec_time_ms = 0
                        case_stderr = None

                        try:
                            run_code_result = run_single_test_case(user_code, case_input, language, problem_time_limit_seconds)

                            # Check if run_single_test_case itself returned an error (e.g. runCode lambda failure)
                            if run_code_result.get('runCodeLambdaError'):
                                case_status = "INTERNAL_ERROR"
                                case_stderr = run_code_result.get('errorMessage', 'runCode Lambda execution error')
                                if error_message_for_submission is None:
                                    error_message_for_submission = f"Case {case_number}: {case_stderr}"
                                overall_status = "INTERNAL_ERROR"
                                break # Stop grading

                            case_exec_time_ms = run_code_result.get('executionTimeMs', 0)
                            if case_exec_time_ms > max_execution_time_ms:
                                max_execution_time_ms = case_exec_time_ms

                            if run_code_result.get('timedOut', False):
                                case_status = "TIME_LIMIT_EXCEEDED"
                            elif run_code_result.get('exitCode') != 0 or (run_code_result.get('stderr') and not run_code_result.get('isSuccessful')):
                                case_status = "RUNTIME_ERROR"
                                case_stderr = run_code_result.get('stderr', 'Runtime error with no stderr message.')
                                if case_stderr and len(case_stderr) > 500:
                                    case_stderr = case_stderr[:497] + "..."
                            else:
                                actual_output_str = run_code_result.get('stdout')
                                if actual_output_str:
                                    try:
                                        actual_output_data = json.loads(actual_output_str)
                                        actual_output = actual_output_data.get('result')
                                        if compare_outputs(actual_output, expected_output, judge_type, epsilon):
                                            case_status = "ACCEPTED"
                                        else:
                                            case_status = "WRONG_ANSWER"
                                            print(f"Case {case_number} WA: Actual={json.dumps(actual_output)}, Expected={json.dumps(expected_output)}, Judge={judge_type}")
                                    except json.JSONDecodeError:
                                        case_status = "RUNTIME_ERROR"
                                        case_stderr = "Output from solution was not valid JSON: " + actual_output_str[:200]
                                else: # No stdout, successful execution
                                    if expected_output is None or expected_output == "":
                                         case_status = "ACCEPTED"
                                    else:
                                         case_status = "WRONG_ANSWER"
                                         print(f"Case {case_number} WA: Actual=None/Empty, Expected={json.dumps(expected_output)}, Judge={judge_type}")
                        except Exception as exec_err:
                            print(f"Error processing official test case {case_number}: {str(exec_err)}\n{traceback.format_exc()}")
                            case_status = "INTERNAL_ERROR"
                            case_stderr = f"Grader internal error: {str(exec_err)[:200]}"

                        final_results_list.append({
                            'caseNumber': case_number,
                            'status': case_status,
                            'executionTime': float_to_decimal(case_exec_time_ms / 1000.0),
                            'stderr': case_stderr if case_stderr else None
                        })

                        if case_status != "ACCEPTED":
                            overall_status = case_status
                            if error_message_for_submission is None:
                                 error_message_for_submission = f"Failed at test case {case_number}: Status - {case_status}"
                            if case_stderr:
                                error_message_for_submission += f". Details: {case_stderr[:100]}"
                            break
        except Exception as e:
            print(f"Major grading error: {str(e)}\n{traceback.format_exc()}")
            overall_status = "INTERNAL_ERROR"
            if error_message_for_submission is None:
                error_message_for_submission = f"An internal error occurred during grading: {str(e)}"

        submission_item = {
            'submissionId': submission_id, 
            'problemId': problem_id, 
            'userId': user_id,  # Add userId to submission item
            'language': language,
            'status': overall_status, 
            'executionTime': float_to_decimal(max_execution_time_ms / 1000.0),
            'results': final_results_list, 
            'submissionTime': submission_time,
            'userCode': user_code[:10000],
            'errorMessage': error_message_for_submission if error_message_for_submission else None,
            'is_submission': IS_SUBMISSION_VALUE  # Add is_submission field for GSI
        }
        submission_item_cleaned = {k: v for k, v in submission_item.items() if v is not None}

        try:
            submissions_table = dynamodb.Table(SUBMISSIONS_TABLE_NAME)
            submissions_table.put_item(Item=submission_item_cleaned)
            print(f"Submission {submission_id} saved to DynamoDB with status: {overall_status}")
        except Exception as db_err:
            print(f"Error saving submission {submission_id} to DynamoDB: {str(db_err)}")
            if overall_status != "INTERNAL_ERROR" and error_message_for_submission is None:
                error_message_for_submission = f"Failed to save submission result to DB: {str(db_err)}"

        final_response_body = {
            'submissionId': submission_id, 'status': overall_status,
            'executionTime': max_execution_time_ms / 1000.0, # Seconds
            'results': submission_item_cleaned.get('results'),
            'errorMessage': error_message_for_submission,
            'executionMode': "GRADE_SUBMISSION_RESULTS"
        }
        return {
            'statusCode': 200,
            'body': json.dumps(final_response_body, default=lambda o: str(o) if isinstance(o, Decimal) else o)
        }
    else:
        # Should not happen if input validation for executionMode is correct
        print(f"Unknown executionMode: {execution_mode}")
        return {'statusCode': 400, 'body': json.dumps({'error': f'Unknown executionMode: {execution_mode}'})}
