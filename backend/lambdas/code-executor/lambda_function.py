import json
import sys
import subprocess
import tempfile
import os
import time
import math # For isnan, isinf
import traceback

# Default timeout if not provided by the caller
DEFAULT_TIMEOUT_MS = 5000
# Directory for temporary files within Lambda
TEMP_DIR = '/tmp' # AWS Lambda provides /tmp as writable space

# Helper to convert non-standard float values to JSON-serializable strings
# This matches the logic in your original JavaScript's codeExecutor.mjs
def convert_non_json_values(obj):
    if isinstance(obj, float):
        if math.isinf(obj):
            return "Infinity" if obj > 0 else "-Infinity"
        elif math.isnan(obj):
            return "NaN"
    elif isinstance(obj, dict):
        return {str(k): convert_non_json_values(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_non_json_values(elem) for elem in obj]
    return obj

def lambda_handler(event, context):
    try:
        # Log the received event for debugging
        print(f"Received event: {json.dumps(event)}")

        # Prefer body from API Gateway, fallback to direct event for testing
        if 'body' in event:
            body_str = event['body']
            if isinstance(body_str, str):
                payload = json.loads(body_str)
            else: # Already an object (e.g. direct test invocation)
                payload = body_str
        else: # Direct invocation without 'body' (e.g. console test)
            payload = event

        code_to_execute = payload.get('code_to_execute')
        input_data = payload.get('input_data') # This is already a Python dict/list/primitive
        timeout_ms = int(payload.get('timeout_ms', DEFAULT_TIMEOUT_MS))

        if not code_to_execute:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Missing code_to_execute',
                    'stdout': '', 'stderr': 'Missing code_to_execute',
                    'exitCode': -1, 'executionTimeMs': 0,
                    'timedOut': False, 'isSuccessful': False
                })
            }
        # input_data can legitimately be None, 0, [], {}, etc. so only check code_to_execute

    except json.JSONDecodeError as e:
        print(f"JSONDecodeError: {str(e)}")
        return {
            'statusCode': 400,
            'body': json.dumps({
                'error': f'Invalid JSON payload: {str(e)}',
                'stdout': '', 'stderr': f'Invalid JSON payload: {str(e)}',
                'exitCode': -1, 'executionTimeMs': 0,
                'timedOut': False, 'isSuccessful': False
            })
        }
    except Exception as e:
        print(f"Parameter parsing error: {str(e)}")
        return {
            'statusCode': 400,
            'body': json.dumps({
                'error': f'Parameter error: {str(e)}',
                'stdout': '', 'stderr': f'Parameter error: {str(e)}',
                'exitCode': -1, 'executionTimeMs': 0,
                'timedOut': False, 'isSuccessful': False
            })
        }

    solution_file_path = None
    runner_file_path = None

    # Result structure to match JS ExecutionResult
    exec_result = {
        'stdout': '',
        'stderr': '',
        'exitCode': None,
        'executionTimeMs': 0,
        'timedOut': False,
        'error': None, # For errors *within* this lambda, not the user code
        'isSuccessful': False
    }

    try:
        # 1. Create a temporary file for the user's solution code
        with tempfile.NamedTemporaryFile(mode='w', delete=False, dir=TEMP_DIR, suffix='.py', encoding='utf-8') as sf:
            sf.write(code_to_execute)
            solution_file_path = sf.name
        solution_module_name = os.path.splitext(os.path.basename(solution_file_path))[0]

        # 2. Create the runner script
        #    This script will import the solution and run it.
        #    It carefully handles output and error reporting.
        runner_code = f"""
import sys
import json
import traceback
import math # For isnan, isinf

# Add the directory of the solution file to Python's path
sys.path.insert(0, r"{os.path.dirname(solution_file_path)}")

# Import the solution module
try:
    solution_module = __import__(r"{solution_module_name}")
except Exception as import_err:
    print(json.dumps({{
        "error": f"ImportError: {{type(import_err).__name__}}: {{str(import_err)}}",
        "traceback": traceback.format_exc()
    }}), file=sys.stderr)
    sys.exit(1)

# Helper to convert non-standard float values
def convert_non_json_values(obj):
    if isinstance(obj, float):
        if math.isinf(obj):
            return "Infinity" if obj > 0 else "-Infinity"
        elif math.isnan(obj):
            return "NaN"
    elif isinstance(obj, dict):
        return {{str(k): convert_non_json_values(v) for k, v in obj.items()}}
    elif isinstance(obj, list):
        return [convert_non_json_values(elem) for elem in obj]
    return obj

# Input data is passed as a JSON string via stdin
input_data_json_str = sys.stdin.read()
try:
    actual_input_data = json.loads(input_data_json_str)
except json.JSONDecodeError:
    print(json.dumps({{
        "error": "RunnerError: Could not decode input_data JSON from stdin.",
        "traceback": traceback.format_exc()
    }}), file=sys.stderr)
    sys.exit(1)

try:
    solution_fn = None
    func_names_to_try = ['solution', 'solve', 'answer', 'main']
    for func_name in func_names_to_try:
        if hasattr(solution_module, func_name) and callable(getattr(solution_module, func_name)):
            solution_fn = getattr(solution_module, func_name)
            break

    if solution_fn is None:
        print(json.dumps({{
            "error": f"SolutionFunctionNotFoundError: Could not find a callable function named one of {{func_names_to_try}} in the solution code.",
        }}), file=sys.stderr)
        sys.exit(1)

    # Execute the solution function
    raw_result = solution_fn(actual_input_data)

    # Convert special float values before printing
    processed_result = convert_non_json_values(raw_result)

    # Output the result as JSON to stdout
    # This is what the parent process (this lambda) will parse
    print(json.dumps({{"result": processed_result}}))

except Exception as e:
    error_type = type(e).__name__
    error_msg = str(e)
    tb_str = traceback.format_exc()
    print(json.dumps({{
        "error": f"{{error_type}}: {{error_msg}}",
        "traceback": tb_str
    }}), file=sys.stderr)
    sys.exit(1) # Indicate failure
"""
        with tempfile.NamedTemporaryFile(mode='w', delete=False, dir=TEMP_DIR, suffix='_runner.py', encoding='utf-8') as rf:
            rf.write(runner_code)
            runner_file_path = rf.name

        # 3. Execute the runner script using subprocess
        start_time = time.perf_counter()
        timeout_seconds = timeout_ms / 1000.0

        # Prepare input for the runner script (JSON string to stdin)
        input_for_runner = json.dumps(input_data)

        process = subprocess.run(
            [sys.executable, runner_file_path], # sys.executable ensures same python version
            input=input_for_runner,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            encoding='utf-8',
            # Set cwd to /tmp to allow user code to write temp files if absolutely necessary
            # though this is generally discouraged for security.
            cwd=TEMP_DIR
        )
        end_time = time.perf_counter()

        exec_result['executionTimeMs'] = int((end_time - start_time) * 1000)
        exec_result['stdout'] = process.stdout.strip()
        exec_result['stderr'] = process.stderr.strip()
        exec_result['exitCode'] = process.returncode
        exec_result['isSuccessful'] = (process.returncode == 0 and not process.stderr) # A bit more strict: success implies no stderr

        # If the runner itself produced an error JSON on stdout (e.g. function not found by runner),
        # move it to stderr for consistency with how JS ExecutionResult handles it.
        # This is a specific case for runner-level errors printed to stdout.
        if exec_result['stdout']:
            try:
                parsed_stdout_json = json.loads(exec_result['stdout'])
                if isinstance(parsed_stdout_json, dict) and "error" in parsed_stdout_json:
                    # This looks like an error message from the runner script that went to stdout.
                    # This can happen if the solution function is not found, for example.
                    # Let's move it to stderr.
                    if not exec_result['stderr']: # If stderr is empty, use this.
                        exec_result['stderr'] = exec_result['stdout']
                    else: # Append if stderr already has content.
                        exec_result['stderr'] += f"\nSTDOUT_ERROR_REDIRECT: {exec_result['stdout']}"
                    exec_result['stdout'] = '' # Clear stdout as it was an error message.
                    exec_result['isSuccessful'] = False
                    if exec_result['exitCode'] == 0: # If exit code was 0, but we found error in stdout
                        exec_result['exitCode'] = 1 # Force non-zero exit code
            except json.JSONDecodeError:
                pass # stdout was not JSON, or not an error structure we recognize. Leave as is.


    except subprocess.TimeoutExpired:
        end_time = time.perf_counter()
        exec_result['executionTimeMs'] = int((end_time - start_time) * 1000) # Could be slightly over timeout_ms
        exec_result['timedOut'] = True
        exec_result['stderr'] = "Execution timed out."
        exec_result['exitCode'] = -1 # Or some other conventional timeout code
        exec_result['isSuccessful'] = False
    except FileNotFoundError as e:
        exec_result['error'] = f"Lambda Internal Error: FileNotFoundError - {str(e)}. This might be a misconfiguration or python interpreter issue."
        exec_result['stderr'] = exec_result['error']
        exec_result['isSuccessful'] = False
        exec_result['exitCode'] = -1
    except Exception as e:
        # This catches errors in *this* lambda's orchestration logic
        tb_str = traceback.format_exc()
        print(f"Orchestration Error: {str(e)}\n{tb_str}")
        exec_result['error'] = f"Lambda Internal Error: {type(e).__name__} - {str(e)}"
        exec_result['stderr'] = exec_result['error'] + f"\nTraceback:\n{tb_str}"
        exec_result['isSuccessful'] = False
        exec_result['exitCode'] = -1 # Generic error code
    finally:
        # 4. Clean up temporary files
        for path in [solution_file_path, runner_file_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except Exception as e_unlink:
                    print(f"Warning: Failed to delete temp file {path}: {str(e_unlink)}")

    # Final check on isSuccessful based on exitCode and stderr content
    # If stdout contains {"result": ...} and exitCode is 0, it's usually successful
    # If stderr has content, it's usually not successful, even if exitCode is 0
    if exec_result['exitCode'] == 0 and not exec_result['stderr']:
        try:
            # Attempt to parse stdout to ensure it contains the expected {"result": ...}
            if exec_result['stdout']:
                json.loads(exec_result['stdout'])['result'] # Accessing 'result' to ensure structure
                exec_result['isSuccessful'] = True
            else: # No stdout, but no error and exit 0? Consider it not successful if output is expected.
                  # However, some problems might legitimately produce no output.
                  # The original JS logic implies stdout means success if exitCode is 0.
                  # Let's assume if there's no error, no stderr, and exit 0, it means success
                  # unless problem explicitly expects empty output. The parsing of output will handle that.
                exec_result['isSuccessful'] = True # If problem expects no output this is fine.
        except (json.JSONDecodeError, KeyError):
            # stdout was not the expected JSON format, treat as not successful
            exec_result['isSuccessful'] = False
            if not exec_result['stderr']: # Add a message if stderr is empty
                 exec_result['stderr'] = "Output format error: stdout was not valid JSON with a 'result' key."
    elif exec_result['exitCode'] != 0 or exec_result['stderr']:
        exec_result['isSuccessful'] = False


    # Log the result before returning
    print(f"Execution result: {json.dumps(exec_result)}")

    return {
        'statusCode': 200, # HTTP 200, actual success/failure is in the body
        'body': json.dumps(exec_result)
    }
