import json
import boto3
import time
import uuid
import os
import traceback
from decimal import Decimal, ROUND_HALF_UP # Keep Decimal for comparisons

# Initialize AWS clients outside the handler
dynamodb = boto3.resource('dynamodb')
lambda_client = boto3.client('lambda')

PROBLEMS_TABLE_NAME = os.environ.get('PROBLEMS_TABLE_NAME', 'alpaco-Problems-production')
SUBMISSIONS_TABLE_NAME = os.environ.get('SUBMISSIONS_TABLE_NAME', 'problem-submissions')
# Ensure this environment variable is set correctly for your deployment
RUN_CODE_LAMBDA_NAME = os.environ.get('RUN_CODE_LAMBDA_NAME', 'alpaco-code-executor-production')

ALLOWED_JUDGE_TYPES = ["equal", "unordered_equal", "float_eps"]
DEFAULT_EPSILON = Decimal('1e-6')
IS_SUBMISSION_VALUE = "Y"  # For GSI AllSubmissionsByTimeIndex

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',  # TODO: Restrict this in production
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', # Corrected Method name
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token'
}

# --- Comparison Logic (Handles potential type mismatches carefully) ---
def compare_outputs(actual, expected, judge_type, epsilon=DEFAULT_EPSILON):
    print(f"Comparing outputs: Actual={actual} (Type: {type(actual)}), Expected={expected} (Type: {type(expected)}), Judge={judge_type}")

    if judge_type == "equal":
        # Handle common type mismatches (e.g., "5" vs 5) - maybe too lenient?
        # Basic strict comparison first
        if actual == expected:
            return True
        # Try converting to string for comparison if types differ? Risky.
        # return str(actual) == str(expected) # Example of lenient comparison
        return False # Keep it strict for now unless specific need arises

    elif judge_type == "unordered_equal":
        if not isinstance(actual, list) or not isinstance(expected, list):
            print("Unordered compare failed: One or both are not lists.")
            return False
        if len(actual) != len(expected):
            print(f"Unordered compare failed: Lengths differ ({len(actual)} vs {len(expected)}).")
            return False
        try:
            # Try direct sorting if elements are comparable
            actual_sorted = sorted(actual)
            expected_sorted = sorted(expected)
            if actual_sorted == expected_sorted:
                return True
        except TypeError:
            # Fallback to frequency map for unorderable types (like dicts)
            print("Unordered compare: Using frequency map due to unorderable elements.")
            try:
                actual_counts = {}
                expected_counts = {}
                for item in actual:
                    # Must be JSON serializable for keys
                    s_item = json.dumps(item, sort_keys=True)
                    actual_counts[s_item] = actual_counts.get(s_item, 0) + 1
                for item in expected:
                    s_item = json.dumps(item, sort_keys=True)
                    expected_counts[s_item] = expected_counts.get(s_item, 0) + 1
                return actual_counts == expected_counts
            except Exception as e:
                 print(f"Unordered compare failed during frequency map: {e}")
                 return False
        return False # If initial sort fails and freq map wasn't used or failed

    elif judge_type == "float_eps":
        try:
            # Use Decimal for precise comparison
            # Convert both actual and expected to string first to handle various inputs
            actual_val = Decimal(str(actual))
            expected_val = Decimal(str(expected))
            # Ensure epsilon is Decimal
            if not isinstance(epsilon, Decimal):
                epsilon = Decimal(str(epsilon))
        except Exception as e:
            print(f"Float compare failed: Could not convert to Decimal. Error: {e}")
            return False
        result = abs(actual_val - expected_val) <= epsilon
        print(f"Float compare: |{actual_val} - {expected_val}| <= {epsilon} -> {result}")
        return result

    print(f"Unknown judge type: {judge_type}")
    return False

# Helper to convert floats to Decimals for storing in DynamoDB if needed
def convert_to_dynamo_compatible(item):
    if isinstance(item, float):
        # Convert floats to Decimal for precision, or string if needed
        return Decimal(str(item))
    elif isinstance(item, list):
        return [convert_to_dynamo_compatible(i) for i in item]
    elif isinstance(item, dict):
        return {k: convert_to_dynamo_compatible(v) for k, v in item.items()}
    return item

# --- Run Single Test Case ---
def run_single_test_case(user_code, case_input, language, problem_time_limit_seconds=2):
    """
    Invokes runCode Lambda. Returns the *parsed body* of the runCode response.
    Handles runCode Lambda function errors separately.
    """
    run_code_payload_body = {
        'code_to_execute': user_code,
        'input_data': case_input,
        'timeout_ms': int(float(problem_time_limit_seconds) * 1000)
    }
    run_code_payload = {'body': json.dumps(run_code_payload_body)}

    print(f"Invoking runCode (func: {RUN_CODE_LAMBDA_NAME}) with input: {json.dumps(case_input)[:200]}...")

    try:
        response = lambda_client.invoke(
            FunctionName=RUN_CODE_LAMBDA_NAME,
            InvocationType='RequestResponse',
            Payload=json.dumps(run_code_payload),
            LogType='None' # Set to 'Tail' to get logs if debugging runCode itself
        )
        response_payload_str = response['Payload'].read().decode('utf-8')

        # Log raw response for debugging
        print(f"Raw response from runCode: {response_payload_str[:1000]}{'...' if len(response_payload_str)>1000 else ''}")

        if response.get('FunctionError'):
            # Handle unhandled errors *within* the runCode lambda itself
            error_payload = {}
            try:
                error_payload = json.loads(response_payload_str)
            except json.JSONDecodeError:
                error_payload = {'errorMessage': response_payload_str} # Use raw string if not JSON

            print(f"runCode Lambda FunctionError: {response['FunctionError']} - Payload: {json.dumps(error_payload)}")
            return {
                'runCodeLambdaError': True,
                'errorType': error_payload.get('errorType', 'LambdaFunctionError'),
                'errorMessage': error_payload.get('errorMessage', 'runCode Lambda execution failed'),
                'trace': error_payload.get('stackTrace', []), # AWS often uses stackTrace
                # Add default execution fields for consistency
                'stdout': '', 'stderr': error_payload.get('errorMessage', 'runCode Lambda execution failed'),
                'returnValue': None, 'exitCode': -1, 'executionTimeMs': 0,
                'timedOut': False, 'isSuccessful': False
            }

        # Parse the outer response (usually from API Gateway Lambda Proxy integration)
        run_code_result_outer = json.loads(response_payload_str)

        # The actual execution result should be in the 'body' which is a JSON *string*
        if 'body' not in run_code_result_outer:
             raise ValueError("Response from runCode lambda is missing 'body'.")

        # Parse the inner JSON string from the 'body'
        run_code_execution_result = json.loads(run_code_result_outer['body'])

        print(f"Parsed runCode execution result: {json.dumps(run_code_execution_result)}")
        return run_code_execution_result

    except Exception as invoke_err:
        print(f"Error invoking runCode lambda or parsing its response: {str(invoke_err)}\n{traceback.format_exc()}")
        # Return a structured error indicating the grader failed to invoke the executor
        return {
            'runCodeLambdaError': True,
            'errorType': 'GraderInvocationError',
            'errorMessage': f"Failed to invoke or parse response from runCode: {str(invoke_err)}",
            'trace': traceback.format_exc().splitlines(),
            'stdout': '', 'stderr': f"Failed to invoke or parse response from runCode: {str(invoke_err)}",
            'returnValue': None, 'exitCode': -1, 'executionTimeMs': 0,
            'timedOut': False, 'isSuccessful': False
        }

# --- Lambda Handler ---
def lambda_handler(event, context):
    print(f"Received grading request: {json.dumps(event)}")

    # Handle OPTIONS request for CORS preflight
    if event.get('httpMethod') == 'OPTIONS' or event.get('requestContext', {}).get('http', {}).get('method') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'message': 'CORS preflight check successful'})}

    try:
        if 'body' in event:
            body_str = event['body']
            payload = json.loads(body_str) if isinstance(body_str, str) else body_str
        else:
            payload = event

        # Auth claims (adjust based on your authorizer type - JWT or Cognito)
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        # Fallback for different authorizer structures if needed
        if not claims: claims = event.get('requestContext', {}).get('authorizer', {})

        user_id_from_claims = claims.get('sub') # Standard OIDC claim for user ID
        author_from_claims = claims.get('nickname') or claims.get('cognito:username') # Prioritize nickname

        if not user_id_from_claims or not author_from_claims:
            print(f"❌ Missing or invalid claims: {json.dumps(claims)}")
            return {'statusCode': 401, 'headers': {'Content-Type': 'application/json', **CORS_HEADERS}, 'body': json.dumps({'message': '인증 정보가 없습니다. 사용자 ID 또는 작성자 정보를 확인할 수 없습니다.'})}

        user_id = user_id_from_claims
        author = author_from_claims

        execution_mode = payload.get('executionMode', "GRADE_SUBMISSION")
        problem_id = payload.get('problemId')
        user_code = payload.get('userCode')
        language = payload.get('language', 'python3.12')
        submission_id_param = payload.get('submissionId')

        if not user_code: raise ValueError("Missing userCode")
        if execution_mode == "GRADE_SUBMISSION" and not problem_id: raise ValueError("Missing problemId for GRADE_SUBMISSION")
        if execution_mode == "RUN_CUSTOM_TESTS" and 'customTestCases' not in payload: raise ValueError("Missing customTestCases for RUN_CUSTOM_TESTS")

    except (json.JSONDecodeError, ValueError, TypeError) as e:
        print(f"Input error: {str(e)}")
        return {'statusCode': 400, 'headers': {'Content-Type': 'application/json', **CORS_HEADERS}, 'body': json.dumps({'error': f'Invalid input: {str(e)}'})}

    # --- RUN CUSTOM TESTS MODE ---
    if execution_mode == "RUN_CUSTOM_TESTS":
        custom_test_cases = payload.get('customTestCases', [])
        if not isinstance(custom_test_cases, list):
             return {'statusCode': 400, 'headers': {'Content-Type': 'application/json', **CORS_HEADERS}, 'body': json.dumps({'error': 'customTestCases must be a list.'})}

        results_for_custom_tests = []
        problem_time_limit_seconds = 2.0 # Default
        if problem_id:
            try:
                problems_table = dynamodb.Table(PROBLEMS_TABLE_NAME)
                problem_item_response = problems_table.get_item(Key={'problemId': problem_id})
                if 'Item' in problem_item_response:
                    limit_val = problem_item_response['Item'].get('timeLimitSeconds') or problem_item_response['Item'].get('time_limit_seconds') # Check both names
                    if limit_val is not None:
                       try: problem_time_limit_seconds = float(limit_val)
                       except ValueError: print(f"Warning: Invalid timeLimitSeconds format for {problem_id}: {limit_val}")
            except Exception as db_err:
                print(f"Could not fetch problem time limit for custom run (problemId: {problem_id}): {str(db_err)}")

        for i, custom_case_input in enumerate(custom_test_cases):
            case_identifier = f"Custom Case {i + 1}"
            print(f"Executing {case_identifier}...")
            try:
                # Directly use the structured result from run_single_test_case
                raw_execution_result = run_single_test_case(user_code, custom_case_input, language, problem_time_limit_seconds)
                results_for_custom_tests.append({
                    'caseIdentifier': case_identifier,
                    'input': custom_case_input,
                    'runCodeOutput': raw_execution_result # Pass the whole structured result
                })
            except Exception as e:
                print(f"Error processing {case_identifier}: {str(e)}\n{traceback.format_exc()}")
                # Construct a consistent error structure
                results_for_custom_tests.append({
                    'caseIdentifier': case_identifier,
                    'input': custom_case_input,
                    'runCodeOutput': {
                        'runCodeLambdaError': True, # Indicate this is a grader-level error
                        'errorType': 'GraderProcessingError',
                        'errorMessage': f'Grader error during custom test: {str(e)}',
                        'trace': traceback.format_exc().splitlines(),
                        'stdout': '', 'stderr': f'Grader error: {str(e)}',
                        'returnValue': None, 'exitCode': -1, 'executionTimeMs': 0,
                        'timedOut': False, 'isSuccessful': False
                    }
                })

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', **CORS_HEADERS},
            'body': json.dumps({
                'executionMode': "RUN_CUSTOM_TESTS_RESULTS",
                'results': results_for_custom_tests
            })
        }

    # --- GRADE SUBMISSION MODE ---
    elif execution_mode == "GRADE_SUBMISSION":
        submission_id = submission_id_param if submission_id_param else str(uuid.uuid4())
        submission_time = int(time.time())
        overall_status = "INTERNAL_ERROR" # Default
        max_execution_time_ms = 0
        final_results_list = []
        error_message_for_submission = None
        problem_title = None
        problem_title_translated = None

        try:
            # Fetch Problem Data
            problems_table = dynamodb.Table(PROBLEMS_TABLE_NAME)
            problem_item_response = problems_table.get_item(Key={'problemId': problem_id})
            if 'Item' not in problem_item_response: raise Exception(f"Problem '{problem_id}' not found.")
            problem_data = problem_item_response['Item']

            # Extract problem title and title_translated
            problem_title = problem_data.get('title', '')
            problem_title_translated = problem_data.get('title_translated', '')

            # Get Test Cases, Judge Type, Time Limit, Epsilon
            final_test_cases_str = problem_data.get('finalTestCases')
            if not final_test_cases_str: raise Exception("No test cases found for this problem.")
            
            # Parse finalTestCases JSON string
            parsed_test_cases = json.loads(final_test_cases_str)
            
            # Handle double-nested JSON structure: finalTestCases may contain a JSON string
            # with a "finalTestCases" property that contains the actual array
            test_cases = []
            if isinstance(parsed_test_cases, list):
                # Direct array case
                test_cases = parsed_test_cases
            elif isinstance(parsed_test_cases, dict) and 'finalTestCases' in parsed_test_cases:
                # Nested object case: extract the finalTestCases property
                if isinstance(parsed_test_cases['finalTestCases'], list):
                    test_cases = parsed_test_cases['finalTestCases']
                else:
                    raise Exception("Nested finalTestCases property is not a list.")
            else:
                raise Exception("finalTestCases format is not recognized (expected array or object with finalTestCases property).")
            
            if not test_cases: raise Exception("Test cases array is empty.")

            judge_type = problem_data.get('judgeType', problem_data.get('judge_type', 'equal')) # Check both names, default 'equal'
            if judge_type not in ALLOWED_JUDGE_TYPES:
                print(f"Warning: Invalid judge_type '{judge_type}' for problem '{problem_id}'. Defaulting to 'equal'.")
                judge_type = 'equal'

            epsilon_val = problem_data.get('epsilon')
            epsilon = DEFAULT_EPSILON
            if epsilon_val is not None:
                try: epsilon = Decimal(str(epsilon_val))
                except Exception: print(f"Warning: Invalid epsilon value '{epsilon_val}'. Using default.")

            time_limit_val = problem_data.get('timeLimitSeconds') or problem_data.get('time_limit_seconds') # Check both
            problem_time_limit_seconds = 2.0
            if time_limit_val is not None:
                try: problem_time_limit_seconds = float(time_limit_val)
                except ValueError: print(f"Warning: Invalid time limit '{time_limit_val}'. Using default 2.0s.")

            # --- Process Test Cases ---
            overall_status = "ACCEPTED" # Start assuming success
            for i, test_case_obj in enumerate(test_cases):
                case_number = i + 1
                case_input = test_case_obj.get('input')
                expected_output = test_case_obj.get('expected_output') # Case sensitivity matters!

                case_status = "INTERNAL_ERROR" # Default for the loop iteration
                case_exec_time_ms = 0
                case_stderr = None
                case_stdout = None # Capture stdout for potential debugging/display
                actual_output = None # Initialize

                try:
                    run_code_result = run_single_test_case(user_code, case_input, language, problem_time_limit_seconds)

                    # Check for executor invocation errors first
                    if run_code_result.get('runCodeLambdaError'):
                        case_status = "INTERNAL_ERROR"
                        case_stderr = run_code_result.get('errorMessage', 'runCode Lambda execution error')
                        overall_status = "INTERNAL_ERROR"
                        if error_message_for_submission is None:
                            error_message_for_submission = f"Error executing test case {case_number}: {case_stderr}"

                    # Process normal execution result
                    case_exec_time_ms = run_code_result.get('executionTimeMs', 0)
                    case_stderr = run_code_result.get('stderr') # Get stderr
                    case_stdout = run_code_result.get('stdout') # Get stdout
                    actual_output = run_code_result.get('returnValue') # <<< GET RETURN VALUE
                    max_execution_time_ms = max(max_execution_time_ms, case_exec_time_ms)

                    if run_code_result.get('timedOut'):
                        case_status = "TIME_LIMIT_EXCEEDED"
                    elif not run_code_result.get('isSuccessful'): # Check if execution itself failed
                        case_status = "RUNTIME_ERROR"
                        # Use stderr if available, otherwise a generic message
                        if not case_stderr: case_stderr = "Execution failed with exit code {}.".format(run_code_result.get('exitCode', '?'))
                    else:
                        # Execution was successful, now compare returnValue
                        if compare_outputs(actual_output, expected_output, judge_type, epsilon):
                            case_status = "ACCEPTED"
                        else:
                            case_status = "WRONG_ANSWER"
                            print(f"Case {case_number} WA: Actual={json.dumps(actual_output)}, Expected={json.dumps(expected_output)}, Judge={judge_type}")

                except Exception as exec_err:
                    print(f"Error processing official test case {case_number}: {str(exec_err)}\n{traceback.format_exc()}")
                    case_status = "INTERNAL_ERROR"
                    case_stderr = f"Grader internal error: {str(exec_err)[:200]}"

                # Sanitize stderr for storage
                if case_stderr and len(case_stderr) > 500:
                    case_stderr = case_stderr[:497] + "..."

                # Append results for this case
                final_results_list.append({
                    'caseNumber': case_number,
                    'status': case_status,
                    # Store time in seconds as Decimal
                    'executionTime': Decimal(str(case_exec_time_ms / 1000.0)).quantize(Decimal('0.001'), rounding=ROUND_HALF_UP),
                    'stdout': case_stdout[:500] if case_stdout else None, # Store partial stdout
                    'stderr': case_stderr if case_stderr else None
                })

                # Update overall status if this case failed
                if case_status != "ACCEPTED":
                    overall_status = case_status
                    # Set the first error message encountered
                    if error_message_for_submission is None:
                         error_message_for_submission = f"Failed at test case {case_number}: {case_status}"
                         if case_stderr:
                             error_message_for_submission += f". Details: {case_stderr[:100]}"

        except Exception as e:
            print(f"Major grading error: {str(e)}\n{traceback.format_exc()}")
            overall_status = "INTERNAL_ERROR"
            if error_message_for_submission is None:
                error_message_for_submission = f"An internal error occurred during grading: {str(e)}"

        # --- Save Submission to DynamoDB ---
        # Convert results to be DynamoDB compatible (especially executionTime Decimal)
        # Also handle potential None values
        cleaned_results = []
        for res in final_results_list:
            cleaned_res = {k: convert_to_dynamo_compatible(v) for k, v in res.items() if v is not None}
            cleaned_results.append(cleaned_res)

        submission_item = {
            'submissionId': submission_id,
            'problemId': problem_id,
            'problemTitle': problem_title,
            'problemTitleTranslated': problem_title_translated,
            'userId': user_id,
            'author': author,
            'language': language,
            'status': overall_status,
            'executionTime': convert_to_dynamo_compatible(max_execution_time_ms / 1000.0),
            'results': cleaned_results,
            'submissionTime': submission_time,
            'userCode': user_code[:10000], # Truncate code
            'errorMessage': error_message_for_submission if error_message_for_submission else None,
            'is_submission': IS_SUBMISSION_VALUE
        }
        # Remove top-level None values before saving
        submission_item_cleaned = {k: v for k, v in submission_item.items() if v is not None}

        try:
            submissions_table = dynamodb.Table(SUBMISSIONS_TABLE_NAME)
            submissions_table.put_item(Item=submission_item_cleaned)
            print(f"Submission {submission_id} saved to DynamoDB with status: {overall_status}")
        except Exception as db_err:
            print(f"Error saving submission {submission_id} to DynamoDB: {str(db_err)}")
            if overall_status != "INTERNAL_ERROR" and error_message_for_submission is None:
                error_message_for_submission = f"Failed to save submission result to DB: {str(db_err)}"

        # --- Prepare Final Response ---
        # Use the cleaned results and error message for the response
        final_response_body = {
            'submissionId': submission_id,
            'status': overall_status,
            'executionTime': float(submission_item_cleaned['executionTime']), # Convert Decimal back to float for JSON
            'results': final_results_list, # Send original list with floats/ints for time
            'errorMessage': error_message_for_submission,
            'executionMode': "GRADE_SUBMISSION_RESULTS",
            # Include problem title information in the response
            'problemTitle': problem_title,
            'problemTitleTranslated': problem_title_translated
        }

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', **CORS_HEADERS},
            # Use default=str for Decimal serialization, though we converted executionTime back
            'body': json.dumps(final_response_body, default=str)
        }
    else:
        # Should not be reached if validation is correct
        print(f"Unknown executionMode: {execution_mode}")
        return {'statusCode': 400, 'headers': {'Content-Type': 'application/json', **CORS_HEADERS}, 'body': json.dumps({'error': f'Unknown executionMode: {execution_mode}'})}
