import sys
import subprocess
import json
import time
import os
import resource # 리소스 제한 설정을 위해 (Linux/Unix)
import threading
import psutil   # 정확한 메모리 측정을 위해
import boto3    # S3 업로드를 위해
from botocore.exceptions import ClientError

# --- 설정 ---
CODE_FILE = "user_code.py" # 사용자 코드를 저장할 임시 파일
INPUT_FILE = "input.txt"
OUTPUT_FILE = "output.txt"
ERROR_FILE = "error.txt"
RESULT_FILE = "result.json" # 업로드 전 JSON 결과를 저장할 파일

# --- 파라미터 읽기 (환경 변수) ---
# Step Functions Fargate Task Overrides 에서 전달됨
USER_CODE = os.environ.get('USER_CODE', '')
INPUT_DATA = os.environ.get('INPUT_DATA', '')
TIME_LIMIT_SECONDS = float(os.environ.get('TIME_LIMIT', '1')) # 시간 제한 (초)
MEMORY_LIMIT_MB = int(os.environ.get('MEMORY_LIMIT', '128')) # 메모리 제한 (MB)
EXPECTED_OUTPUT = os.environ.get('EXPECTED_OUTPUT', '') # 결과 처리 람다로 전달될 예상 출력
LANGUAGE = os.environ.get('LANGUAGE', 'python').lower() # 언어 (기본값: python)

# S3 업로드 파라미터 (환경 변수로 전달)
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')
S3_KEY_PREFIX = os.environ.get('S3_KEY_PREFIX', 'grader-results') # S3 키 접두사
SUBMISSION_ID = os.environ.get('SUBMISSION_ID', 'unknown-submission')
TESTCASE_ID = os.environ.get('TESTCASE_ID', 'unknown-testcase') # 이 값을 전달해야 함

s3_client = boto3.client('s3')

def set_limits(memory_limit_mb):
    """자식 프로세스의 리소스 제한을 설정합니다."""
    # 메모리 제한 설정 (RLIMIT_AS)
    memory_limit_bytes = memory_limit_mb * 1024 * 1024
    try:
        resource.setrlimit(resource.RLIMIT_AS, (memory_limit_bytes, memory_limit_bytes))
    except ValueError:
        print(f"경고: 메모리 제한을 {memory_limit_mb} MB로 설정할 수 없습니다. 기존 제한이 너무 낮을 수 있습니다.")

    # CPU 시간 제한 설정 (RLIMIT_CPU) - Soft limit 만 설정
    # Hard limit 은 root 권한 없이는 안정적으로 설정하기 어려움
    # 주로 subprocess 타임아웃에 의존함
    try:
        resource.setrlimit(resource.RLIMIT_CPU, (int(TIME_LIMIT_SECONDS), int(TIME_LIMIT_SECONDS) + 5))
    except ValueError:
         print(f"경고: CPU 시간 제한을 설정할 수 없습니다.")

def get_memory_usage_kb(proc): # Popen 프로세스 객체를 전달받음
    """프로세스와 그 자식들의 최대 RSS 메모리 사용량을 가져옵니다."""
    max_memory = 0
    try:
        parent = psutil.Process(proc.pid)
        children = parent.children(recursive=True)
        processes = [parent] + children
        for p in processes:
            try:
                mem_info = p.memory_info()
                max_memory += mem_info.rss # Resident Set Size
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue # 프로세스가 종료되었거나 접근이 거부됨
        return max_memory // 1024 # KB 단위로 반환
    except psutil.NoSuchProcess:
        return 0 # 부모 프로세스가 이미 종료됨

def run_code():
    """사용자 코드를 실행하고, 리소스를 모니터링하며, 결과를 반환합니다."""
    start_time = time.time()
    process = None
    stdout_content = b''
    stderr_content = b''
    status = "ExecutionError"
    max_memory_usage_kb = 0

    try:
        # --- 언어에 따른 명령어 준비 ---
        if LANGUAGE == 'python':
            cmd = [sys.executable, CODE_FILE]
        # TODO: 다른 언어 지원 추가 (컴파일 + 실행)
        else:
            raise ValueError(f"지원하지 않는 언어: {LANGUAGE}")

        # --- 코드와 입력을 파일에 쓰기 ---
        with open(CODE_FILE, 'w') as f: f.write(USER_CODE)
        with open(INPUT_FILE, 'w') as f: f.write(INPUT_DATA)

        # --- 제한 및 I/O 리다이렉션으로 코드 실행 ---
        with open(INPUT_FILE, 'r') as stdin_f, open(OUTPUT_FILE, 'wb') as stdout_f, open(ERROR_FILE, 'wb') as stderr_f:
            process = subprocess.Popen(
                cmd,
                stdin=stdin_f,
                stdout=stdout_f,
                stderr=stderr_f,
                preexec_fn=lambda: set_limits(MEMORY_LIMIT_MB), # 자식 프로세스에서 제한 설정
                text=False # stdout/stderr 를 바이트로 처리
            )

            # --- 메모리 사용량 모니터링 --- 
            monitor_stop_event = threading.Event()
            def memory_monitor():
                nonlocal max_memory_usage_kb
                while not monitor_stop_event.is_set() and process.poll() is None:
                    current_mem = get_memory_usage_kb(process)
                    max_memory_usage_kb = max(max_memory_usage_kb, current_mem)
                    time.sleep(0.05) # 너무 자주 확인하지 않도록 함
            monitor_thread = threading.Thread(target=memory_monitor, daemon=True)
            monitor_thread.start()

            # --- 완료 또는 타임아웃 대기 ---
            try:
                process.wait(timeout=TIME_LIMIT_SECONDS)
                # 프로세스 종료 후 마지막 메모리 확인
                current_mem = get_memory_usage_kb(process)
                max_memory_usage_kb = max(max_memory_usage_kb, current_mem)

                if process.returncode == 0:
                    status = "Completed"
                else:
                    status = "RuntimeError"
                    # OOM 으로 종료되었는지 확인 (종종 종료 코드 -9 또는 9)
                    if process.returncode in [-9, 9]:
                         # 실제 사용량이 제한에 근접했는지 확인
                        if max_memory_usage_kb >= (MEMORY_LIMIT_MB * 1024 * 0.95): # 95% 임계값
                             status = "MemoryLimitExceeded"
            except subprocess.TimeoutExpired:
                status = "TimeLimitExceeded"
                # 프로세스와 자식들이 확실히 종료되도록 함
                try:
                    parent = psutil.Process(process.pid)
                    for child in parent.children(recursive=True):
                        child.kill()
                    parent.kill()
                except psutil.NoSuchProcess:
                    pass # 프로세스가 이미 종료됨
            except Exception as e:
                print(f"프로세스 대기/모니터링 중 오류 발생: {e}")
                status = "ExecutionError"
            finally:
                 monitor_stop_event.set() # 메모리 모니터 스레드 중지
                 monitor_thread.join(timeout=0.5) # 스레드가 종료될 때까지 잠시 대기

        # --- stdout/stderr 읽기 --- 
        with open(OUTPUT_FILE, 'rb') as f: stdout_content = f.read()
        with open(ERROR_FILE, 'rb') as f: stderr_content = f.read()

    # --- 잠재적 컴파일 오류 처리 (컴파일 단계 추가 시) ---
    # except subprocess.CalledProcessError as e:
    #     status = "CompileError"
    #     stderr_content = e.stderr
    except FileNotFoundError:
         status = "ExecutionError"
         stderr_content = "실행 스크립트 또는 인터프리터를 찾을 수 없습니다.".encode('utf-8')
    except Exception as e:
        status = "ExecutionError"
        stderr_content = str(e).encode()
    finally:
        # --- 임시 파일 정리 ---
        for f in [CODE_FILE, INPUT_FILE, OUTPUT_FILE, ERROR_FILE]:
            if os.path.exists(f): os.remove(f)

    end_time = time.time()
    execution_time = round(end_time - start_time, 3)

    # 최종 메모리 사용량 (MB)
    memory_usage_mb = round(max_memory_usage_kb / 1024)

    # 종료 코드로 MemoryLimitExceeded 잡히지 않은 경우 사용량 확인
    if status != "MemoryLimitExceeded" and memory_usage_mb > MEMORY_LIMIT_MB:
         status = "MemoryLimitExceeded"
         memory_usage_mb = MEMORY_LIMIT_MB # 보고 시 제한값으로 설정

    # --- 결과 객체 준비 ---
    result = {
        "status": status,
        "stdout": stdout_content.decode(errors='ignore'), # 문자열로 디코딩
        "stderr": stderr_content.decode(errors='ignore'),
        "executionTime": execution_time,
        "memoryUsage": memory_usage_mb,
        "expectedOutput": EXPECTED_OUTPUT, # 통과시킴
        "inputData": INPUT_DATA,        # 통과시킴
        "submissionId": SUBMISSION_ID,
        "testcaseId": TESTCASE_ID
    }
    return result

def upload_to_s3(result_data):
    """결과 JSON을 S3에 업로드합니다."""
    if not S3_BUCKET_NAME:
        print("오류: S3_BUCKET_NAME 환경 변수가 설정되지 않았습니다. 결과를 업로드할 수 없습니다.")
        return None

    result_json = json.dumps(result_data)
    s3_key = f"{S3_KEY_PREFIX}/{SUBMISSION_ID}/{TESTCASE_ID}.json"

    try:
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=s3_key,
            Body=result_json,
            ContentType='application/json'
        )
        print(f"결과를 s3://{S3_BUCKET_NAME}/{s3_key} 에 성공적으로 업로드했습니다.")
        # Step Functions를 위해 S3 위치 반환
        return {"Bucket": S3_BUCKET_NAME, "Key": s3_key}
    except ClientError as e:
        print(f"S3 업로드 오류: {e}")
        # 대체 방안으로 결과를 stdout에 출력?
        print("대체 실행: S3 오류로 인해 결과를 stdout에 출력합니다.")
        print(result_json)
        return None # 실패 표시
    except Exception as e:
        print(f"S3 업로드 중 예기치 않은 오류 발생: {e}")
        print("대체 실행: S3 오류로 인해 결과를 stdout에 출력합니다.")
        print(result_json)
        return None

if __name__ == "__main__":
    run_result = run_code()
    s3_location = upload_to_s3(run_result)

    # S3 위치(성공 시) 또는 원시 결과를 stdout에 출력
    # Step Functions가 이 출력을 사용할 수 있음
    if s3_location:
        print(json.dumps({"resultS3Location": s3_location}))
    else:
        # S3 업로드 실패 시 원본 결과를 stdout에 출력
        # Step Function의 ResultSelector가 두 경우 모두 처리해야 함
        print(json.dumps(run_result)) 