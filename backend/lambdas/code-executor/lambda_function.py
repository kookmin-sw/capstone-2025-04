import json
import sys
import subprocess
import tempfile
import os
import time
import math # For isnan, isinf
import traceback
import base64 # To encode return value safely

# Default timeout if not provided by the caller
DEFAULT_TIMEOUT_MS = 5000
# Directory for temporary files within Lambda
TEMP_DIR = '/tmp' # AWS Lambda provides /tmp as writable space

# Special marker for return value
RETURN_VALUE_MARKER = "###_RETURN_VALUE_###"

# Helper to convert non-standard float values to JSON-serializable strings
def convert_non_json_values(obj):
    if isinstance(obj, float):
        if math.isinf(obj):
            return "Infinity" if obj > 0 else "-Infinity"
        elif math.isnan(obj):
            return "NaN"
    elif isinstance(obj, dict):
        # Ensure keys are strings
        return {str(k): convert_non_json_values(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_non_json_values(elem) for elem in obj]
    # Add handling for other non-serializable types if necessary
    # For simplicity, we'll rely on JSON default errors for now if other types are returned
    return obj

# --- Lambda Handler ---
def lambda_handler(event, context):
    try:
        # Log the received event for debugging
        print(f"Received event: {json.dumps(event)}")

        # Prefer body from API Gateway, fallback to direct event for testing
        if 'body' in event:
            body_str = event['body']
            # Check if body_str is already an object (e.g., from test event)
            if isinstance(body_str, dict):
                 payload = body_str
            else: # Assume it's a JSON string
                try:
                    payload = json.loads(body_str)
                except json.JSONDecodeError as e:
                    print(f"JSONDecodeError in body: {str(e)}")
                    print(f"Raw body: {body_str[:500]}") # Log offending string
                    raise ValueError(f"Invalid JSON in request body: {str(e)}")
        else: # Direct invocation without 'body' (e.g., console test)
            payload = event

        code_to_execute = payload.get('code_to_execute')
        input_data = payload.get('input_data') # This is already a Python dict/list/primitive
        timeout_ms = int(payload.get('timeout_ms', DEFAULT_TIMEOUT_MS))

        if not code_to_execute:
            raise ValueError("Missing 'code_to_execute' in payload")
        # input_data can legitimately be None, 0, [], {}, etc.

    except (json.JSONDecodeError, ValueError, TypeError, KeyError) as e:
        print(f"Parameter parsing error: {str(e)}")
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'}, # Add headers
            'body': json.dumps({
                'error': f'Parameter error: {str(e)}',
                'stdout': '', 'stderr': f'Parameter error: {str(e)}',
                'returnValue': None,
                'exitCode': -1, 'executionTimeMs': 0,
                'timedOut': False, 'isSuccessful': False
            })
        }
    except Exception as e:
        print(f"Unexpected parameter error: {str(e)}\n{traceback.format_exc()}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'}, # Add headers
            'body': json.dumps({
                'error': f'Internal server error during parameter parsing: {str(e)}',
                'stdout': '', 'stderr': f'Internal server error: {str(e)}',
                'returnValue': None,
                'exitCode': -1, 'executionTimeMs': 0,
                'timedOut': False, 'isSuccessful': False
            })
        }

    solution_file_path = None
    runner_file_path = None

    # Result structure to match the new protocol
    exec_result = {
        'stdout': '',
        'stderr': '',
        'returnValue': None, # Field for the actual return value
        'exitCode': None,
        'executionTimeMs': 0,
        'timedOut': False,
        'error': None, # For errors *within* this lambda's orchestration
        'isSuccessful': False # Indicates successful *execution*, not logical correctness
    }

    try:
        # 1. Create a temporary file for the user's solution code
        with tempfile.NamedTemporaryFile(mode='w', delete=False, dir=TEMP_DIR, suffix='.py', encoding='utf-8') as sf:
            sf.write(code_to_execute)
            solution_file_path = sf.name
        solution_module_name = os.path.splitext(os.path.basename(solution_file_path))[0]

        # 2. Create the runner script (MODIFIED)
        runner_code = f"""
import sys
import json
import traceback
import math # For isnan, isinf
import base64 # For encoding return value

# Special marker (must match definition in lambda_function.py)
RETURN_VALUE_MARKER = "{RETURN_VALUE_MARKER}"

# Add the directory of the solution file to Python's path
sys.path.insert(0, r"{os.path.dirname(solution_file_path)}")

# Helper to convert non-standard float values
# IMPORTANT: This should now handle more types if needed, or raise clear errors
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
    # Add other known serializable types here if necessary
    # Example: Convert sets to lists
    # elif isinstance(obj, set):
    #     return [convert_non_json_values(elem) for elem in sorted(list(obj))]
    return obj

# --- Main Execution Logic ---
actual_input_data = None
solution_module = None
return_value_payload = {{'value': None}} # Default payload

try:
    # Import the solution module first
    try:
        solution_module = __import__(r"{solution_module_name}")
    except Exception as import_err:
        # Report import errors clearly to stderr
        print(json.dumps({{
            "error": f"ImportError: {{type(import_err).__name__}}: {{str(import_err)}}",
            "traceback": traceback.format_exc()
        }}), file=sys.stderr)
        sys.exit(1) # Exit with error code

    # Decode input data from stdin
    input_data_json_str = sys.stdin.read()
    try:
        actual_input_data = json.loads(input_data_json_str)
    except json.JSONDecodeError:
        print(json.dumps({{
            "error": "RunnerError: Could not decode input_data JSON from stdin.",
            "traceback": traceback.format_exc()
        }}), file=sys.stderr)
        sys.exit(1) # Exit with error code

    # Find the solution function
    solution_fn = None
    func_names_to_try = ['solution', 'solve', 'answer', 'main']
    for func_name in func_names_to_try:
        if hasattr(solution_module, func_name) and callable(getattr(solution_module, func_name)):
            solution_fn = getattr(solution_module, func_name)
            break

    if solution_fn is None:
        print(json.dumps({{
            "error": f"SolutionFunctionNotFoundError: Could not find a callable function named one of {{func_names_to_try}}.",
            "available_items": [item for item in dir(solution_module) if not item.startswith('_')]
        }}), file=sys.stderr)
        sys.exit(1) # Exit with error code

    # --- Execute the solution function ---
    raw_result = solution_fn(actual_input_data)

    # --- Prepare the return value ---
    # 1. Convert special floats (NaN, Infinity) and potentially other types
    processed_result = convert_non_json_values(raw_result)

    # 2. Prepare the payload for the marker line
    return_value_payload['value'] = processed_result

    # 3. Serialize the payload to JSON. Catch serialization errors here.
    try:
        return_value_json = json.dumps(return_value_payload)
    except TypeError as json_err:
        # If json.dumps fails even after convert_non_json_values, report it
        print(json.dumps({{
            "error": f"SerializationError: Could not serialize the return value to JSON. Value type: {{type(processed_result).__name__}}. Error: {{str(json_err)}}",
            "traceback": traceback.format_exc()
        }}), file=sys.stderr)
        sys.exit(1) # Exit with error code

    # --- SUCCESS ---
    # Print the special marker line with the BASE64 ENCODED JSON return value
    # Encoding prevents issues if the JSON itself contains newlines
    encoded_return_value_json = base64.b64encode(return_value_json.encode('utf-8')).decode('utf-8')
    print(f"{{RETURN_VALUE_MARKER}}{{encoded_return_value_json}}")
    # Note: Any regular print() calls from the user code happened before this line

except Exception as e:
    # --- FAILURE during execution ---
    # Report runtime errors clearly to stderr
    error_type = type(e).__name__
    error_msg = str(e)
    tb_str = traceback.format_exc()
    print(json.dumps({{
        "error": f"{{error_type}}: {{error_msg}}",
        "traceback": tb_str
    }}), file=sys.stderr)
    sys.exit(1) # Indicate failure

# If we reach here without sys.exit(1), it means execution was successful
sys.exit(0) # Explicitly exit with success code
"""
        with tempfile.NamedTemporaryFile(mode='w', delete=False, dir=TEMP_DIR, suffix='_runner.py', encoding='utf-8') as rf:
            rf.write(runner_code)
            runner_file_path = rf.name

        # 3. Execute the runner script using subprocess
        start_time = time.perf_counter()
        timeout_seconds = timeout_ms / 1000.0
        input_for_runner = json.dumps(input_data)

        process = subprocess.run(
            [sys.executable, runner_file_path], # sys.executable ensures same python version
            input=input_for_runner,
            capture_output=True,
            text=True, # Get stdout/stderr as strings
            timeout=timeout_seconds,
            encoding='utf-8', # Specify encoding
            errors='replace', # Handle potential encoding errors in output
            cwd=TEMP_DIR
        )
        end_time = time.perf_counter()

        exec_result['executionTimeMs'] = int((end_time - start_time) * 1000)
        exec_result['exitCode'] = process.returncode
        exec_result['stderr'] = process.stderr.strip() # Capture stderr

        # --- Process stdout to separate return value from actual stdout ---
        raw_stdout = process.stdout
        return_value = None
        stdout_content = raw_stdout # Default to full stdout

        marker_pos = raw_stdout.rfind(RETURN_VALUE_MARKER) # Find last occurrence
        if marker_pos != -1:
            # Extract encoded JSON part
            encoded_json_part = raw_stdout[marker_pos + len(RETURN_VALUE_MARKER):].strip()
            try:
                # Decode Base64
                decoded_json = base64.b64decode(encoded_json_part).decode('utf-8')
                # Parse JSON
                parsed_payload = json.loads(decoded_json)
                return_value = parsed_payload.get('value')
                # Remove the marker line and everything after it from stdout_content
                stdout_content = raw_stdout[:marker_pos].strip()
                print(f"Extracted return value. Original stdout length: {len(raw_stdout)}, Final stdout length: {len(stdout_content)}")
            except (base64.binascii.Error, json.JSONDecodeError, UnicodeDecodeError) as parse_err:
                print(f"Error parsing return value marker: {str(parse_err)}")
                # Keep original stdout, maybe add warning to stderr?
                exec_result['stderr'] += f"\n[Executor Warning] Failed to parse return value marker: {str(parse_err)}"
                return_value = None # Indicate parsing failure
        else:
            # Marker not found, could be due to error before return or user printing the marker
            print("Return value marker not found in stdout.")
            stdout_content = raw_stdout.strip() # Use stripped full stdout
            # If exit code was 0 but no marker, something might be wrong
            if process.returncode == 0 and raw_stdout: # only add warning if there was output
                 exec_result['stderr'] += "\n[Executor Warning] Execution finished with exit code 0, but return value marker was not found in stdout."

        exec_result['stdout'] = stdout_content
        exec_result['returnValue'] = return_value

        # Determine overall execution success
        # Success means: no timeout, exit code 0, no ORCHESTRATION errors.
        # Stderr from the *user code* doesn't automatically mean failed execution,
        # but a non-zero exit code usually does.
        exec_result['isSuccessful'] = (
            process.returncode == 0 and
            not exec_result['timedOut'] and
            exec_result['error'] is None # Check for orchestration errors
            # We might add checks for specific runner errors in stderr later if needed
        )

    except subprocess.TimeoutExpired:
        end_time = time.perf_counter()
        exec_result['executionTimeMs'] = timeout_ms # Report the requested timeout
        exec_result['timedOut'] = True
        exec_result['stderr'] = "Execution timed out."
        exec_result['exitCode'] = -1 # Standard timeout signal often not available directly
        exec_result['isSuccessful'] = False
    except FileNotFoundError as e:
        # Error finding python executable or script - internal config issue
        exec_result['error'] = f"Lambda Internal Error: FileNotFoundError - {str(e)}. Python interpreter likely missing or misconfigured."
        exec_result['stderr'] = exec_result['error']
        exec_result['isSuccessful'] = False
        exec_result['exitCode'] = -1
    except Exception as e:
        # Catch other errors in *this* lambda's orchestration logic
        tb_str = traceback.format_exc()
        print(f"Orchestration Error: {str(e)}\n{tb_str}")
        exec_result['error'] = f"Lambda Internal Error: {type(e).__name__} - {str(e)}"
        # Append orchestration error to stderr as well for visibility
        exec_result['stderr'] = (exec_result['stderr'] + f"\n[Executor Internal Error] {type(e).__name__}: {str(e)}\n{tb_str}").strip()
        exec_result['isSuccessful'] = False
        if exec_result['exitCode'] is None: exec_result['exitCode'] = -1 # Ensure non-None exit code

    finally:
        # 4. Clean up temporary files
        for path in [solution_file_path, runner_file_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except Exception as e_unlink:
                    print(f"Warning: Failed to delete temp file {path}: {str(e_unlink)}")

    # Log the final result structure before returning
    # Be careful logging returnValue if it could be very large
    log_result = exec_result.copy()
    if log_result['returnValue'] is not None:
        log_result['returnValue'] = str(log_result['returnValue'])[:100] + ('...' if len(str(log_result['returnValue'])) > 100 else '')
    print(f"Execution result: {json.dumps(log_result)}")

    # IMPORTANT: Ensure the body is JSON serializable. Apply conversion again if needed,
    # although the runner should have handled the returnValue.
    # Let's rely on the runner's conversion for returnValue.
    try:
        response_body = json.dumps(exec_result)
    except TypeError as final_json_err:
         print(f"Final JSON serialization error: {str(final_json_err)}")
         # Fallback: try to serialize with error message
         exec_result['error'] = f"Final serialization failed: {str(final_json_err)}"
         exec_result['returnValue'] = None # Clear potentially problematic value
         exec_result['isSuccessful'] = False
         response_body = json.dumps(exec_result)


    return {
        'statusCode': 200, # HTTP 200, actual success/failure is in the body
        'headers': {'Content-Type': 'application/json'}, # Add headers
        'body': response_body
    }
