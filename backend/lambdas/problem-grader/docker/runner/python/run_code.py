import os
import sys
import json
import subprocess
import tempfile
import time
import traceback
import boto3

# Environment variables
user_code = os.environ.get("USER_CODE")
input_data = os.environ.get("INPUT_DATA", "")
time_limit_str = os.environ.get("TIME_LIMIT", "2")
s3_bucket = os.environ.get("S3_BUCKET")
s3_key = os.environ.get("S3_KEY")

if not user_code:
    error_msg = json.dumps({"status": "GRADER_ERROR", "message": "USER_CODE not set."})
    print(error_msg, file=sys.stderr)
    if s3_bucket and s3_key:
        try: boto3.client('s3').put_object(Bucket=s3_bucket, Key=s3_key, Body=error_msg, ContentType='application/json')
        except: pass
    sys.exit(1)

if not s3_bucket or not s3_key:
    print("Error: S3_BUCKET or S3_KEY environment variable not set.", file=sys.stderr)
    sys.exit(1)

try:
    time_limit = int(time_limit_str)
except ValueError:
    error_msg = json.dumps({"status": "GRADER_ERROR", "message": f"Invalid TIME_LIMIT: {time_limit_str}"})
    print(error_msg, file=sys.stderr)
    try: boto3.client('s3').put_object(Bucket=s3_bucket, Key=s3_key, Body=error_msg, ContentType='application/json')
    except: pass
    sys.exit(1)

s3_client = boto3.client('s3')
script_path = None
result_data = {
    "status": "GRADER_ERROR",
    "stdout": "",
    "stderr": "",
    "execution_time": None
}

try:
    with tempfile.NamedTemporaryFile(mode='w+', suffix='.py', delete=False) as temp_code_file:
        temp_code_file.write(user_code)
        script_path = temp_code_file.name

    start_time = time.monotonic()
    process = None

    try:
        process = subprocess.run(
            ['/usr/bin/timeout', '--signal=SIGTERM', '--kill-after=1s', f'{time_limit + 0.5}', 'python', script_path],
            input=input_data,
            capture_output=True,
            text=True,
            timeout=time_limit + 1
        )

        end_time = time.monotonic()
        result_data["execution_time"] = end_time - start_time
        result_data["stdout"] = process.stdout
        result_data["stderr"] = process.stderr

        if process.returncode == 0:
            result_data["status"] = "SUCCESS"
        elif process.returncode == 124 or process.returncode == 137:
             result_data["status"] = "TIME_LIMIT_EXCEEDED"
             result_data["execution_time"] = float(time_limit)
        else:
            result_data["status"] = "RUNTIME_ERROR"

    except subprocess.TimeoutExpired:
        end_time = time.monotonic()
        result_data["status"] = "TIME_LIMIT_EXCEEDED"
        result_data["execution_time"] = float(time_limit)
        result_data["stderr"] = f"Execution timed out by OS after ~{time_limit} seconds."

    except FileNotFoundError:
         result_data["status"] = "GRADER_ERROR"
         result_data["stderr"] = "Grader environment error: python or timeout command not found."
         print(result_data["stderr"], file=sys.stderr)

    except Exception as e:
        end_time = time.monotonic()
        result_data["status"] = "GRADER_ERROR"
        result_data["stderr"] = f"Error running subprocess: {e}\n{traceback.format_exc()}"
        if start_time: result_data["execution_time"] = end_time - start_time
        print(result_data["stderr"], file=sys.stderr)

finally:
    if script_path and os.path.exists(script_path):
        try:
            os.remove(script_path)
        except OSError as e:
            print(f"Warning: Could not remove temp file {script_path}: {e}", file=sys.stderr)

    result_json = json.dumps(result_data)
    exit_code = 0
    try:
        s3_client.put_object(
            Bucket=s3_bucket,
            Key=s3_key,
            Body=result_json,
            ContentType='application/json'
        )
        print(f"Successfully uploaded result to s3://{s3_bucket}/{s3_key}")
        if result_data["status"] != "SUCCESS":
             exit_code = 1

    except Exception as s3_e:
        print(f"Failed to upload result to S3: {s3_e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        exit_code = 1

    sys.exit(exit_code) 