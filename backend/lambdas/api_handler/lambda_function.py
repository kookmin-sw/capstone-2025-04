# backend/lambdas/api_handler/lambda_function.py
import json
import os
import uuid
import boto3
import traceback
import base64
from botocore.exceptions import ClientError
from boto3.dynamodb.types import TypeDeserializer

# Environment variables set in template.yaml
PROBLEMS_TABLE_NAME = os.environ.get('PROBLEMS_TABLE_NAME')
SUBMISSIONS_TABLE_NAME = os.environ.get('SUBMISSIONS_TABLE_NAME')
PROBLEM_GENERATOR_FUNCTION_ARN = os.environ.get('PROBLEM_GENERATOR_FUNCTION_ARN')
GRADER_STATE_MACHINE_ARN = os.environ.get('GRADER_STATE_MACHINE_ARN')

# Boto3 clients (lazy initialization)
lambda_client = None
stepfunctions_client = None
dynamodb_client = None

def get_lambda_client():
    global lambda_client
    if lambda_client is None:
        lambda_client = boto3.client('lambda')
    return lambda_client

def get_stepfunctions_client():
    global stepfunctions_client
    if stepfunctions_client is None:
        stepfunctions_client = boto3.client('stepfunctions')
    return stepfunctions_client

def get_dynamodb_client():
    global dynamodb_client
    if dynamodb_client is None:
        # Use boto3.resource for easier DynamoDB interaction
        dynamodb_resource = boto3.resource('dynamodb')
        dynamodb_client = {
            'resource': dynamodb_resource,
            'problems_table': dynamodb_resource.Table(PROBLEMS_TABLE_NAME) if PROBLEMS_TABLE_NAME else None,
            'submissions_table': dynamodb_resource.Table(SUBMISSIONS_TABLE_NAME) if SUBMISSIONS_TABLE_NAME else None
        }
    return dynamodb_client

def format_response(status_code, body):
    """Helper to format API Gateway proxy response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*' # Adjust CORS header as needed
        },
        'body': json.dumps(body, default=str) # Use default=str for datetime etc.
    }

def format_error(status_code, message):
    """Helper to format error response"""
    return format_response(status_code, {'error': message})

def handle_generate_problem(event):
    """Handles POST /problems requests"""
    try:
        body = json.loads(event.get('body', '{}'))
        prompt = body.get('prompt')
        difficulty = body.get('difficulty')

        if not prompt or not difficulty:
            return format_error(400, "Request body must include 'prompt' and 'difficulty'.")

        if not PROBLEM_GENERATOR_FUNCTION_ARN:
             return format_error(500, "Problem Generator Function ARN is not configured.")

        print(f"Invoking ProblemGenerator function asynchronously: {PROBLEM_GENERATOR_FUNCTION_ARN}")
        invocation_payload = json.dumps({
            'prompt': prompt,
            'difficulty': difficulty
        })

        lambda_cli = get_lambda_client()
        # Invoke ProblemGenerator Lambda asynchronously
        lambda_cli.invoke(
             FunctionName=PROBLEM_GENERATOR_FUNCTION_ARN,
             InvocationType='Event',
             Payload=invocation_payload
        )

        print("ProblemGenerator function invoked successfully.")
        return format_response(202, {'message': 'Problem generation request accepted and is processing in the background.'})

    except json.JSONDecodeError:
        return format_error(400, "Invalid JSON format in request body.")
    except ClientError as e:
         print(f"AWS client error invoking generator: {e}")
         return format_error(500, f"Error communicating with problem generator: {e.response['Error']['Message']}")
    except Exception as e:
        print(f"Error handling /problems POST request: {e}")
        print(traceback.format_exc())
        return format_error(500, f"Internal server error: {str(e)}")

def handle_list_problems(event):
    """Handles GET /problems requests"""
    try:
        db_clients = get_dynamodb_client()
        if not db_clients.get('problems_table'):
             return format_error(500, "Problems table is not configured.")

        problems_table = db_clients['problems_table']
        # Use scan with projection for summary
        scan_kwargs = {
            'ProjectionExpression': "problemId, title, difficulty, algorithmType"
        }
        problems = []
        done = False
        start_key = None

        while not done:
            if start_key:
                scan_kwargs['ExclusiveStartKey'] = start_key
            response = problems_table.scan(**scan_kwargs)
            problems.extend(response.get('Items', []))
            start_key = response.get('LastEvaluatedKey', None)
            done = start_key is None

        print(f"Retrieved {len(problems)} problems.")
        return format_response(200, {'problems': problems})

    except ClientError as e:
         print(f"DynamoDB error listing problems: {e}")
         return format_error(500, f"Error retrieving problems list: {e.response['Error']['Message']}")
    except Exception as e:
        print(f"Error handling GET /problems request: {e}")
        print(traceback.format_exc())
        return format_error(500, f"Internal server error: {str(e)}")

def handle_get_problem_details(event):
    """Handles GET /problems/{problemId} requests"""
    try:
        problem_id = event.get('pathParameters', {}).get('problemId')
        if not problem_id:
            return format_error(400, "Missing 'problemId' in path.")

        db_clients = get_dynamodb_client()
        if not db_clients.get('problems_table'):
             return format_error(500, "Problems table is not configured.")

        problems_table = db_clients['problems_table']
        response = problems_table.get_item(
            Key={'problemId': problem_id}
        )

        if 'Item' not in response:
            return format_error(404, f"Problem with ID '{problem_id}' not found.")

        problem_details = response['Item']
        # Boto3 resource automatically handles deserialization
        # Testcases might still be stored as JSON string
        if 'testcases' in problem_details and isinstance(problem_details['testcases'], str):
            try:
                problem_details['testcases'] = json.loads(problem_details['testcases'])
            except json.JSONDecodeError:
                print(f"Warning: Could not decode testcases JSON for problem {problem_id}")
                # Keep the string or return an error depending on requirements

        return format_response(200, problem_details)

    except ClientError as e:
         print(f"DynamoDB error getting problem details: {e}")
         return format_error(500, f"Error retrieving problem details: {e.response['Error']['Message']}")
    except Exception as e:
        print(f"Error handling GET /problems/{problem_id} request: {e}")
        print(traceback.format_exc())
        return format_error(500, f"Internal server error: {str(e)}")

def handle_submit_solution(event):
    """Handles POST /submissions requests"""
    try:
        body = json.loads(event.get('body', '{}'))
        problem_id = body.get('problemId')
        code = body.get('code')
        language = body.get('language')

        if not all([problem_id, code, language]):
            return format_error(400, "Request body must include 'problemId', 'code', and 'language'.")

        db_clients = get_dynamodb_client()
        sfn_client = get_stepfunctions_client()

        if not GRADER_STATE_MACHINE_ARN or not db_clients.get('problems_table') or not db_clients.get('submissions_table'):
             return format_error(500, "Service configuration is incomplete (StateMachine ARN or Table Names).")

        problems_table = db_clients['problems_table']
        submissions_table = db_clients['submissions_table']

        # 1. Get problem details from ProblemsTable
        problem_response = problems_table.get_item(
            Key={'problemId': problem_id}
        )
        if 'Item' not in problem_response:
            return format_error(404, f"Problem with ID '{problem_id}' not found.")
        problem_item = problem_response['Item']

        # Parse testcases (assuming stored as JSON string)
        try:
            testcases_str = problem_item.get('testcases', '[]')
            testcases = json.loads(testcases_str)
        except json.JSONDecodeError:
             print(f"Error decoding testcases for problem {problem_id}")
             return format_error(500, "Error processing problem testcases.")

        time_limit = problem_item.get('timeLimit', 1.0)
        memory_limit = problem_item.get('memoryLimit', 256)

        # 2. Create submission record in SubmissionsTable
        submission_id = str(uuid.uuid4())
        import datetime
        timestamp = datetime.datetime.utcnow().isoformat()
        submission_item = {
            'submissionId': submission_id,
            'problemId': problem_id,
            'language': language,
            'code': code, # Consider S3 for large code
            'status': 'PENDING',
            'createdAt': timestamp,
        }
        submissions_table.put_item(Item=submission_item)

        # 3. Prepare input for Step Functions
        sfn_input = {
            'submissionId': submission_id,
            'problemId': problem_id,
            'code': code,
            'language': language,
            'testcases': testcases,
            'timeLimit': time_limit,
            'memoryLimit': memory_limit,
            # Pass other necessary info from problem_item if needed by SFN/Fargate
            # These need to be defined in the State Machine Input schema
            'taskDefinitionArn': os.environ.get('GRADER_TASK_DEFINITION_ARN'), # Assuming env var is set
            'clusterName': os.environ.get('ECS_CLUSTER_NAME'), # Assuming env var is set
            'subnets': os.environ.get('VPC_SUBNET_IDS', '').split(','), # Assuming env var is set
            'securityGroups': os.environ.get('VPC_SECURITY_GROUP_IDS', '').split(','), # Assuming env var is set
            's3BucketName': os.environ.get('GRADER_S3_BUCKET_NAME'), # Assuming env var is set
            's3KeyPrefix': f"results/{submission_id}" # Example prefix
        }

        # 4. Start Step Functions execution
        sfn_response = sfn_client.start_execution(
            stateMachineArn=GRADER_STATE_MACHINE_ARN,
            name=submission_id,  # Use submission ID for unique execution name
            input=json.dumps(sfn_input)
        )
        execution_arn = sfn_response['executionArn']

        print(f"Started Step Functions execution: {execution_arn}")
        return format_response(202, {
            'message': 'Submission received and grading process started.',
            'submissionId': submission_id,
            'executionArn': execution_arn
        })

    except json.JSONDecodeError:
        return format_error(400, "Invalid JSON format in request body.")
    except ClientError as e:
         error_code = e.response['Error']['Code']
         error_message = e.response['Error']['Message']
         print(f"AWS client error submitting solution: {e}")
         if error_code == 'ResourceNotFoundException' and 'problemId' in error_message:
             return format_error(404, f"Problem with ID '{problem_id}' not found.")
         elif error_code == 'StateMachineDoesNotExist':
              return format_error(500, "Grading state machine not found.")
         elif error_code == 'ExecutionAlreadyExists':
              # Should ideally not happen with UUIDs, but handle just in case
              return format_error(409, f"Submission ID '{submission_id}' already exists.")
         else:
              return format_error(500, f"Error during submission: {error_message}")
    except Exception as e:
        print(f"Error handling POST /submissions request: {e}")
        print(traceback.format_exc())
        return format_error(500, f"Internal server error: {str(e)}")

def handle_list_submissions(event):
    """Handles GET /submissions requests"""
    try:
        db_clients = get_dynamodb_client()
        if not db_clients.get('submissions_table'):
             return format_error(500, "Submissions table is not configured.")

        submissions_table = db_clients['submissions_table']
        limit = int(event.get('queryStringParameters', {}).get('limit', 100))
        start_key_encoded = event.get('queryStringParameters', {}).get('startKey')
        start_key = None
        if start_key_encoded:
            try:
                # Assuming startKey is the JSON string of the LastEvaluatedKey
                start_key = json.loads(base64.b64decode(start_key_encoded).decode('utf-8'))
            except (TypeError, json.JSONDecodeError, base64.binascii.Error):
                return format_error(400, "Invalid startKey parameter format.")

        scan_kwargs = {
            'Limit': limit,
            'ProjectionExpression': "submissionId, problemId, #st, language, createdAt",
            'ExpressionAttributeNames': {"#st": "status"} # Handle reserved keyword 'status'
        }
        if start_key:
            scan_kwargs['ExclusiveStartKey'] = start_key

        response = submissions_table.scan(**scan_kwargs)
        submissions = response.get('Items', [])
        last_evaluated_key = response.get('LastEvaluatedKey')
        next_start_key = None
        if last_evaluated_key:
             # Encode the LastEvaluatedKey as base64 JSON string for the next request
             next_start_key = base64.b64encode(json.dumps(last_evaluated_key).encode('utf-8')).decode('utf-8')

        return format_response(200, {
            'submissions': submissions,
            'nextStartKey': next_start_key
        })

    except ClientError as e:
         print(f"DynamoDB error listing submissions: {e}")
         return format_error(500, f"Error retrieving submissions list: {e.response['Error']['Message']}")
    except Exception as e:
        print(f"Error handling GET /submissions request: {e}")
        print(traceback.format_exc())
        return format_error(500, f"Internal server error: {str(e)}")

def handle_get_submission_status(event):
    """Handles GET /submissions/{submissionId} requests"""
    try:
        submission_id = event.get('pathParameters', {}).get('submissionId')
        if not submission_id:
            return format_error(400, "Missing 'submissionId' in path.")

        db_clients = get_dynamodb_client()
        if not db_clients.get('submissions_table'):
             return format_error(500, "Submissions table is not configured.")

        submissions_table = db_clients['submissions_table']
        response = submissions_table.get_item(
            Key={'submissionId': submission_id}
        )

        if 'Item' not in response:
            return format_error(404, f"Submission with ID '{submission_id}' not found.")

        submission_details = response['Item']
        # Ensure results are parsed if stored as string
        if 'results' in submission_details and isinstance(submission_details['results'], str):
            try:
                submission_details['results'] = json.loads(submission_details['results'])
            except json.JSONDecodeError:
                 print(f"Warning: Could not decode results JSON for submission {submission_id}")
                 submission_details['results'] = [] # Or handle error

        return format_response(200, submission_details)

    except ClientError as e:
         print(f"DynamoDB error getting submission status: {e}")
         return format_error(500, f"Error retrieving submission status: {e.response['Error']['Message']}")
    except Exception as e:
        print(f"Error handling GET /submissions/{submission_id} request: {e}")
        print(traceback.format_exc())
        return format_error(500, f"Internal server error: {str(e)}")

def handler(event, context):
    """Main Lambda handler to route requests based on HTTP method and path"""
    print("Received event:")
    print(json.dumps(event))

    http_method = event.get('requestContext', {}).get('http', {}).get('method')
    path = event.get('requestContext', {}).get('http', {}).get('path')

    if http_method == 'POST' and path == '/problems':
        return handle_generate_problem(event)
    elif http_method == 'GET' and path == '/problems':
        return handle_list_problems(event)
    elif http_method == 'GET' and path.startswith('/problems/'):
        return handle_get_problem_details(event)
    elif http_method == 'POST' and path == '/submissions':
        return handle_submit_solution(event)
    elif http_method == 'GET' and path == '/submissions':
        return handle_list_submissions(event)
    elif http_method == 'GET' and path.startswith('/submissions/'):
        return handle_get_submission_status(event)
    else:
        return format_error(404, f"Route not found: {http_method} {path}")

# Example of local testing setup (requires aws-sam-cli)
# if __name__ == '__main__':
#     # Example event for POST /problems
#     test_event_post_problem = {
#         "requestContext": {"http": {"method": "POST", "path": "/problems"}},
#         "body": json.dumps({"prompt": "test prompt", "difficulty": "쉬움"})
#     }
#     print(handler(test_event_post_problem, None))
#
#     # Example event for POST /submissions
#     test_event_post_submission = {
#         "requestContext": {"http": {"method": "POST", "path": "/submissions"}},
#         "body": json.dumps({
#             "problemId": "some-problem-id",
#             "code": "print('hello')",
#             "language": "python"
#         })
#     }
#     # Note: This will fail locally unless mocking AWS services or running against AWS
#     # print(handler(test_event_post_submission, None)) 