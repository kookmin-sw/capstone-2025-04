import sys
import subprocess
import json
import time
import os
import resource # For setting resource limits (Linux/Unix)
import threading

# Configuration (passed via environment variables or command line args)
# These should match the names used in the Step Functions Task state definition
CODE_FILE = "user_code.py" # Temporary file to store user code
INPUT_FILE = "input.txt"
OUTPUT_FILE = "output.txt"
ERROR_FILE = "error.txt"

# Read parameters passed as environment variables (set by Fargate task definition overrides)
# It's generally safer to pass sensitive data like code via files mounted
# into the container, but for simplicity, we start with env vars.
# Consider security implications carefully.
USER_CODE = os.environ.get('USER_CODE', '')
INPUT_DATA = os.environ.get('INPUT_DATA', '')
TIME_LIMIT_SECONDS = float(os.environ.get('TIME_LIMIT', '1')) # Time limit in seconds
MEMORY_LIMIT_MB = int(os.environ.get('MEMORY_LIMIT', '128')) # Memory limit in MB
EXPECTED_OUTPUT = os.environ.get('EXPECTED_OUTPUT', '') # Passed for result processing lambda
LANGUAGE = os.environ.get('LANGUAGE', 'python').lower() # Default to python

def set_limits(memory_limit_mb, time_limit_seconds):
    """Set resource limits for the child process."""
    # Set memory limit (RLIMIT_AS: address space)
    memory_limit_bytes = memory_limit_mb * 1024 * 1024
    resource.setrlimit(resource.RLIMIT_AS, (memory_limit_bytes, memory_limit_bytes))

    # Note: Setting CPU time limit (RLIMIT_CPU) can be tricky and might not behave as expected
    # with subprocess.run timeout. Relying on subprocess timeout is generally more reliable.
    # resource.setrlimit(resource.RLIMIT_CPU, (int(time_limit_seconds), int(time_limit_seconds)))

def run_code():
    """Run the user code with resource limits and input redirection."""
    start_time = time.time()
    process = None
    stdout_content = b''
    stderr_content = b''
    status = "ExecutionError"
    memory_usage_kb = 0

    try:
        # Prepare command based on language
        if LANGUAGE == 'python':
            cmd = [sys.executable, CODE_FILE]
        # Add other languages here (e.g., Java, C++ compilation and execution)
        # elif LANGUAGE == 'java':
        #     # Compile first: subprocess.run(["javac", CODE_FILE], check=True, capture_output=True)
        #     # Run: cmd = ["java", "UserCodeClassName"] # Adjust class name
        # elif LANGUAGE == 'cpp':
        #     # Compile first: subprocess.run(["g++", CODE_FILE, "-o", "user_code"], check=True, capture_output=True)
        #     # Run: cmd = ["./user_code"]
        else:
            raise ValueError(f"Unsupported language: {LANGUAGE}")

        # Write user code and input to files
        with open(CODE_FILE, 'w') as f:
            f.write(USER_CODE)
        with open(INPUT_FILE, 'w') as f:
            f.write(INPUT_DATA)

        # Run the code with input redirection and timeout
        # preexec_fn is used to set resource limits *in the child process* before exec
        with open(INPUT_FILE, 'r') as stdin_f, open(OUTPUT_FILE, 'wb') as stdout_f, open(ERROR_FILE, 'wb') as stderr_f:
            process = subprocess.Popen(
                cmd,
                stdin=stdin_f,
                stdout=stdout_f,
                stderr=stderr_f,
                preexec_fn=lambda: set_limits(MEMORY_LIMIT_MB, TIME_LIMIT_SECONDS), # Set limits in child
                text=False # Work with bytes for stdout/stderr
            )
            
            # Monitor memory usage in a separate thread (basic example)
            # More robust monitoring might be needed
            max_memory_usage_kb = 0
            monitor_stop_event = threading.Event()
            
            def memory_monitor():
                nonlocal max_memory_usage_kb
                while not monitor_stop_event.is_set() and process.poll() is None:
                    try:
                        # This gets memory usage of the Popen object itself, NOT the child process directly
                        # For accurate child memory, need to inspect /proc/<pid>/status (Linux)
                        # A more complex approach using psutil or reading /proc is needed for accuracy.
                        # This is a placeholder for a more robust solution.
                        # current_mem = resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss # Might work on some systems
                        # For now, we'll report 0 until a better method is implemented
                        current_mem = 0 
                        max_memory_usage_kb = max(max_memory_usage_kb, current_mem)
                    except Exception:
                        pass # Ignore errors during monitoring
                    time.sleep(0.05) # Check frequently but not too aggressively
            
            monitor_thread = threading.Thread(target=memory_monitor)
            monitor_thread.start()

            try:
                process.wait(timeout=TIME_LIMIT_SECONDS)
                status = "Completed" if process.returncode == 0 else "RuntimeError"
            except subprocess.TimeoutExpired:
                status = "TimeLimitExceeded"
                process.kill() # Ensure the process is terminated
            finally:
                 monitor_stop_event.set() # Stop the memory monitor thread
                 monitor_thread.join()
                 memory_usage_kb = max_memory_usage_kb # Use the max value found

        # Read output/error after process finishes
        with open(OUTPUT_FILE, 'rb') as f:
            stdout_content = f.read()
        with open(ERROR_FILE, 'rb') as f:
            stderr_content = f.read()

    except subprocess.CalledProcessError as e: # Handles compile errors if check=True used
        status = "CompileError"
        stderr_content = e.stderr
    except FileNotFoundError:
         status = "ExecutionError"
         stderr_content = b"Runner script or interpreter not found."
    except Exception as e:
        status = "ExecutionError"
        stderr_content = str(e).encode()
    finally:
        # Clean up temporary files
        for f in [CODE_FILE, INPUT_FILE, OUTPUT_FILE, ERROR_FILE]:
            if os.path.exists(f): os.remove(f)

    end_time = time.time()
    execution_time = round(end_time - start_time, 3)

    # Basic check if memory limit was likely exceeded (based on resource limit)
    # More accurate check might need OS-specific tools or parsing stderr for OOM messages
    if status == "RuntimeError" and process and process.returncode in [-9, 9]: # SIGKILL often indicates OOM killer
        status = "MemoryLimitExceeded"
        # Note: Accurate memory usage reporting when OOM killed is difficult
        memory_usage_kb = MEMORY_LIMIT_MB * 1024 # Report the limit as usage

    return {
        "status": status,
        "stdout": stdout_content.decode(errors='ignore'), # Decode to string
        "stderr": stderr_content.decode(errors='ignore'),
        "executionTime": execution_time,
        "memoryUsage": round(memory_usage_kb / 1024), # Convert KB to MB
        "expectedOutput": EXPECTED_OUTPUT, # Pass this through for the processor lambda
        "inputData": INPUT_DATA # Pass this through
    }

if __name__ == "__main__":
    result = run_code()
    # Output result as JSON to stdout, which Step Functions/Lambda can capture
    print(json.dumps(result)) 