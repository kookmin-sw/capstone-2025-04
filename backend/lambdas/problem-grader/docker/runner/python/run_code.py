import os
import sys
import json
import subprocess
import tempfile
import time
import traceback
import boto3
from botocore.exceptions import ClientError

# Environment variables
USER_CODE = os.environ.get('USER_CODE')
INPUT_DATA = os.environ.get('INPUT_DATA', "")
TIME_LIMIT_STR = os.environ.get('TIME_LIMIT', "2")
S3_BUCKET = os.environ.get('S3_BUCKET')
S3_KEY = os.environ.get('S3_KEY')

# Validate required environment variables
if not all([USER_CODE, S3_BUCKET, S3_KEY]):
    missing_vars = [var for var, val in [('USER_CODE', USER_CODE), ('S3_BUCKET', S3_BUCKET), ('S3_KEY', S3_KEY)] if not val]
    print(f"Error: Missing required environment variables: {', '.join(missing_vars)}", file=sys.stderr)
    sys.exit(1)

# Validate and convert time limit
try:
    TIME_LIMIT = int(TIME_LIMIT_STR)
    if TIME_LIMIT <= 0:
        raise ValueError("Time limit must be a positive integer.")
except ValueError as e:
    print(f"Error: Invalid TIME_LIMIT environment variable: {e}", file=sys.stderr)
    sys.exit(1)

s3_client = boto3.client('s3')
temp_file = None
result = {
    "status": "GRADER_ERROR", # Default to grader error
    "stdout": "",
    "stderr": "",
    "execution_time": 0.0
}

try:
    # Create a temporary file for user code
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as tf:
        tf.write(USER_CODE)
        temp_file_path = tf.name
    temp_file = temp_file_path # Store path for cleanup

    start_time = time.monotonic()
    stdout_res, stderr_res = "", ""
    process_status = "GRADER_ERROR" # Default status

    try:
        # Execute the user code using timeout command
        # Add a small buffer (0.5s) to the timeout command
        # Add kill-after to ensure termination
        # Use subprocess timeout as a safety net (time_limit + 1s)
        proc = subprocess.run(
            [
                '/usr/bin/timeout',
                '--signal=SIGTERM',
                '--kill-after=1s',
                str(TIME_LIMIT + 0.5), # Timeout command limit
                'python',
                temp_file_path
            ],
            input=INPUT_DATA,
            capture_output=True,
            text=True,
            timeout=TIME_LIMIT + 1 # Subprocess overall timeout
        )
        end_time = time.monotonic()
        result["execution_time"] = round(end_time - start_time, 4)
        stdout_res = proc.stdout
        stderr_res = proc.stderr

        if proc.returncode == 0:
            process_status = "SUCCESS"
        elif proc.returncode == 124 or proc.returncode == 137: # 124: timeout command, 137: Killed (often by timeout kill-after)
            process_status = "TIME_LIMIT_EXCEEDED"
            result["execution_time"] = float(TIME_LIMIT) # Report the limit as execution time
        else:
            process_status = "RUNTIME_ERROR"
            # Include stderr in the result for runtime errors
            result["stderr"] = stderr_res

    except subprocess.TimeoutExpired:
        end_time = time.monotonic()
        process_status = "TIME_LIMIT_EXCEEDED"
        result["execution_time"] = float(TIME_LIMIT) # Report the limit
        result["stderr"] = f"Runner subprocess timed out after {TIME_LIMIT + 1} seconds."
    except FileNotFoundError:
        process_status = "GRADER_ERROR"
        result["stderr"] = "Error: 'python' or 'timeout' command not found in the container."
        print(result["stderr"], file=sys.stderr) # Log grader error
    except Exception as e:
        # Catch other potential execution errors
        process_status = "GRADER_ERROR"
        result["stderr"] = f"Unexpected error during code execution: {traceback.format_exc()}"
        print(result["stderr"], file=sys.stderr) # Log grader error

    result["status"] = process_status
    result["stdout"] = stdout_res
    # Only include stderr for RUNTIME_ERROR or GRADER_ERROR
    if process_status not in ["RUNTIME_ERROR", "GRADER_ERROR"]:
         result["stderr"] = "" # Clear stderr for other statuses unless already set above

    # Save result to S3
    try:
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=S3_KEY,
            Body=json.dumps(result, indent=2),
            ContentType='application/json'
        )
        print(f"Successfully saved result to s3://{S3_BUCKET}/{S3_KEY}") # Log success for debugging
    except ClientError as e:
        result["status"] = "GRADER_ERROR" # Update status if S3 upload fails
        error_msg = f"Error saving result to S3: {e}"
        result["stderr"] = error_msg # Add S3 error info
        print(error_msg, file=sys.stderr)
        sys.exit(1) # Exit with error if S3 fails
    except Exception as e:
        result["status"] = "GRADER_ERROR"
        error_msg = f"Unexpected error during S3 upload: {traceback.format_exc()}"
        result["stderr"] = error_msg
        print(error_msg, file=sys.stderr)
        sys.exit(1)

except Exception as e:
    # Catch errors during setup (e.g., temp file creation)
    error_msg = f"Grader script failed before execution: {traceback.format_exc()}"
    result["status"] = "GRADER_ERROR"
    result["stderr"] = error_msg
    print(error_msg, file=sys.stderr)
    # Try to save the error state to S3 if possible
    try:
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=S3_KEY,
            Body=json.dumps(result, indent=2),
            ContentType='application/json'
        )
    except Exception as s3_e:
        print(f"Additionally failed to save GRADER_ERROR to S3: {s3_e}", file=sys.stderr)
    sys.exit(1) # Exit with error

finally:
    # Clean up the temporary file
    if temp_file and os.path.exists(temp_file):
        try:
            os.remove(temp_file)
        except OSError as e:
            print(f"Warning: Failed to remove temporary file {temp_file}: {e}", file=sys.stderr)

# Exit with 0 on success (S3 upload completed)
print(f"Runner finished with final status: {result['status']}")
sys.exit(0) 