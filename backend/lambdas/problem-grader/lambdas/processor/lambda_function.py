import json
import os
import boto3
from botocore.exceptions import ClientError
import time

# Environment variables
SUBMISSIONS_TABLE_NAME = os.environ.get('SUBMISSIONS_TABLE_NAME', 'Submissions')
dynamodb_client = boto3.client('dynamodb')

def lambda_handler(event, context):
    """Processes the results from the Step Functions Map state (Fargate task results)."""
    print(f"Received event: {json.dumps(event)}")

    # Input 'event' is expected to be the output of the Step Functions Map state,
    # which is a list of results from each Fargate task invocation.
    # It also contains the original input to the Map state under a specific key (e.g., 'originalInput').
    
    # --- Extract original input and task results ---
    # The exact structure depends on how the Step Functions workflow is defined.
    # Assuming the Map state output is directly the list of Fargate task results,
    # and the original input is passed through a ResultSelector or available elsewhere.
    # We need submissionId, problemId, userId from the initial input.
    # Let's assume the Map state passes the initial input along like this:
    
    # Example expected input structure (adjust based on actual SFN definition):
    # {
    #   "originalInput": { ... original lambda input ... },
    #   "taskResults": [ { fargate_output_1 }, { fargate_output_2 }, ... ]
    # }
    
    original_input = event.get('originalInput', {})
    task_results = event.get('taskResults', []) # Assuming Map state output is under 'taskResults'
    
    submission_id = original_input.get('submissionId')
    problem_id = original_input.get('problemId')
    user_id = original_input.get('userId')
    code = original_input.get('code') # Might need code for final record
    language = original_input.get('language')
    
    if not submission_id or not isinstance(task_results, list):
        print("Error: Missing submissionId or taskResults is not a list.")
        # Consider raising an error to fail the Step Functions execution
        raise ValueError("Invalid input format for result processor lambda")

    # --- Process Fargate Task Results --- 
    processed_results = []
    overall_status = "Accepted" # Initial assumption
    total_score = 0
    # Assuming the number of testcases matches the number of task results
    total_testcases = len(task_results) 
    passed_testcases = 0

    for i, result in enumerate(task_results):
        testcase_id = i # Simple 0-based index as testcase ID
        
        # --- Parse result from Fargate task --- 
        # The structure of 'result' depends on the output of your runner.py script.
        # Example expected structure from runner.py:
        # {
        #   "status": "Completed" | "TimeLimitExceeded" | "MemoryLimitExceeded" | "RuntimeError" | "CompileError",
        #   "stdout": "...",
        #   "stderr": "...",
        #   "executionTime": 0.5, # seconds
        #   "memoryUsage": 64, # MB
        #   "expectedOutput": "..." # Passed from SFN Map state iterator
        #   "inputData": "..." # Passed from SFN Map state iterator
        # }
        
        fargate_status = result.get('status', 'UnknownError')
        stdout = result.get('stdout', '')
        stderr = result.get('stderr', '')
        exec_time = result.get('executionTime', -1)
        mem_usage = result.get('memoryUsage', -1)
        expected_output = result.get('expectedOutput', '') # Crucial: Needs to be passed to Fargate task
        
        # --- Determine testcase status --- 
        testcase_status = "WrongAnswer" # Default if completed but output mismatches
        if fargate_status == "Completed":
            # Simple exact match comparison (trim whitespace)
            if stdout.strip() == expected_output.strip():
                testcase_status = "Accepted"
                passed_testcases += 1
            else:
                testcase_status = "WrongAnswer"
        elif fargate_status == "TimeLimitExceeded":
            testcase_status = "TimeLimitExceeded"
            overall_status = "TimeLimitExceeded"
        elif fargate_status == "MemoryLimitExceeded":
            testcase_status = "MemoryLimitExceeded"
            if overall_status == "Accepted": overall_status = "MemoryLimitExceeded"
        elif fargate_status == "RuntimeError":
            testcase_status = "RuntimeError"
            if overall_status == "Accepted": overall_status = "RuntimeError"
        elif fargate_status == "CompileError": # Should ideally be caught before running testcases
            testcase_status = "CompileError"
            overall_status = "CompileError"
        else:
            testcase_status = "ExecutionError" # Catch-all for other issues
            if overall_status == "Accepted": overall_status = "ExecutionError"
            
        # Update overall status if any test case fails (except Accepted/WrongAnswer)
        if testcase_status not in ["Accepted", "WrongAnswer"] and overall_status == "Accepted":
             overall_status = testcase_status # First critical error determines overall status

        processed_results.append({
            'testcaseId': testcase_id,
            'status': testcase_status,
            'executionTime': exec_time,
            'memoryUsage': mem_usage,
            # Optionally include stdout/stderr for debugging, but be mindful of size limits
            # 'stdout': stdout[:1000], # Truncate if necessary
            # 'stderr': stderr[:1000]
        })
        
    # If all testcases passed but some were WrongAnswer, set overall status
    if overall_status == "Accepted" and passed_testcases < total_testcases:
        overall_status = "WrongAnswer"
        
    # Calculate score (e.g., percentage of passed testcases)
    if total_testcases > 0 and overall_status in ["Accepted", "WrongAnswer"]:
         total_score = round((passed_testcases / total_testcases) * 100)
    else:
        total_score = 0 # No score for TLE, MLE, RE, CE etc.

    # --- Save final results to Submissions table --- 
    timestamp = str(time.time())
    item_to_save = {
        'submissionId': {'S': submission_id},
        'problemId': {'S': problem_id},
        'userId': {'S': user_id},
        'language': {'S': language},
        'code': {'S': code}, # Store the submitted code
        'status': {'S': overall_status},
        'score': {'N': str(total_score)},
        'results': {'S': json.dumps(processed_results)}, # Store detailed results as JSON string
        'submittedAt': {'S': original_input.get('submittedAt', timestamp)}, # If passed from API lambda
        'completedAt': {'S': timestamp}
    }

    try:
        dynamodb_client.put_item(
            TableName=SUBMISSIONS_TABLE_NAME,
            Item=item_to_save
        )
        print(f"Successfully saved submission {submission_id} results to DynamoDB.")
        # Return the final status and score, which can be the output of the Step Function
        return {
            'submissionId': submission_id,
            'status': overall_status,
            'score': total_score
        }
    except ClientError as e:
        print(f"Error saving submission results to DynamoDB: {e.response['Error']['Message']}")
        # Raise error to fail the Step Function execution
        raise e
    except Exception as e:
        print(f"Unexpected error saving submission results: {e}")
        raise e 