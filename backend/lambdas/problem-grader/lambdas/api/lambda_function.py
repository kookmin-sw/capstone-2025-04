import json
import os
import boto3
from botocore.exceptions import ClientError
import uuid
import time
import traceback

# Environment variables
PROBLEMS_TABLE_NAME = os.environ.get('PROBLEMS_TABLE_NAME', 'Problems')
GRADER_STATE_MACHINE_ARN = os.environ.get('GRADER_STATE_MACHINE_ARN')
# Fargate & S3 related environment variables (passed to Step Functions)
CODE_RUNNER_TASK_DEFINITION_ARN = os.environ.get('CODE_RUNNER_TASK_DEFINITION_ARN')
ECS_CLUSTER_NAME = os.environ.get('ECS_CLUSTER_NAME')
SUBNET_IDS = os.environ.get('SUBNET_IDS', '')
SECURITY_GROUP_IDS = os.environ.get('SECURITY_GROUP_IDS', '')
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME') # Bucket for Fargate results
S3_KEY_PREFIX = os.environ.get('S3_KEY_PREFIX', 'grader-results') # Prefix for Fargate results

dynamodb_client = boto3.client('dynamodb')
stepfunctions_client = boto3.client('stepfunctions')

def lambda_handler(event, context):
    """Handles API Gateway/Lambda Function URL requests to start grading."""
    print(f"Received event: {json.dumps(event)}")
    request_timestamp_ms = str(int(time.time() * 1000)) # Record submission time

    try:
        # 1. Parse request body
        body = json.loads(event.get('body', '{}'))
        problem_id = body.get('problemId')
        user_code = body.get('code')
        language = body.get('language')
        user_id = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('sub') # Example: Get user ID from Cognito authorizer

        if not all([problem_id, user_code, language]):
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing required fields: problemId, code, language'})
            }

        # 2. Fetch problem details (testcases, limits) from DynamoDB
        try:
            response = dynamodb_client.get_item(
                TableName=PROBLEMS_TABLE_NAME,
                Key={'problemId': {'S': problem_id}}
            )
            problem_item = response.get('Item')
            if not problem_item:
                return {
                    'statusCode': 404,
                    'body': json.dumps({'error': f'Problem with ID {problem_id} not found'})
                }

            # --- Extract necessary problem data --- 
            # Adapt this based on the actual schema in the Problems table
            # Assuming testcases are stored as a JSON string
            try:
                testcases_str = problem_item.get('testcases', {'S': '[]'})['S']
                testcases = json.loads(testcases_str)
            except (KeyError, json.JSONDecodeError):
                 return {'statusCode': 500, 'body': json.dumps({'error': 'Failed to parse testcases from problem data'})}

            # Assuming timeLimit and memoryLimit are stored as Numbers (N)
            time_limit = int(problem_item.get('timeLimit', {'N': '1'})['N']) # Default 1 second
            memory_limit = int(problem_item.get('memoryLimit', {'N': '128'})['N']) # Default 128 MB
            # --- Extraction end ---

        except ClientError as e:
            print(f"DynamoDB Error: {e}")
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'Could not fetch problem details'})
            }

        # 3. Prepare input for Step Functions
        submission_id = str(uuid.uuid4())
        sfn_input = {
            'submissionId': submission_id,
            'problemId': problem_id,
            'userId': user_id or 'anonymous', # Handle cases where user ID might not be available
            'code': user_code,
            'language': language,
            'testcases': testcases,
            'timeLimit': time_limit,
            'memoryLimit': memory_limit,
            'submittedAt': request_timestamp_ms, # Pass submission time
            'vpcConfig': { # Pass VPC details within a nested object
                'subnetIds': SUBNET_IDS.split(',') if SUBNET_IDS else [],
                'securityGroupIds': SECURITY_GROUP_IDS.split(',') if SECURITY_GROUP_IDS else []
            }
        }

        # Input validation for required environment variables
        required_vars = [
            GRADER_STATE_MACHINE_ARN,
            CODE_RUNNER_TASK_DEFINITION_ARN,
            ECS_CLUSTER_NAME,
            SUBNET_IDS,
            SECURITY_GROUP_IDS,
            S3_BUCKET_NAME
        ]
        if not all(required_vars):
            missing = [name for name, var in zip(['GRADER_STATE_MACHINE_ARN', 'CODE_RUNNER_TASK_DEFINITION_ARN', 'ECS_CLUSTER_NAME', 'SUBNET_IDS', 'SECURITY_GROUP_IDS', 'S3_BUCKET_NAME'], required_vars) if not var]
            error_msg = f"Missing required environment variable(s): {', '.join(missing)}. Cannot start grading."
            print(f"Error: {error_msg}")
            return {
                'statusCode': 500,
                'body': json.dumps({'error': error_msg})
            }

        # 4. Start Step Functions execution
        if not GRADER_STATE_MACHINE_ARN:
             return {'statusCode': 500, 'body': json.dumps({'error': 'State machine ARN not configured'})}

        response = stepfunctions_client.start_execution(
            stateMachineArn=GRADER_STATE_MACHINE_ARN,
            name=submission_id, # Use unique submission ID as execution name
            input=json.dumps(sfn_input)
        )

        execution_arn = response['executionArn']
        print(f"Started Step Functions execution: {execution_arn}")

        # 5. Return submission ID to the client
        return {
            'statusCode': 202, # Accepted
            'body': json.dumps({
                'message': 'Grading process started.',
                'submissionId': submission_id,
                'executionArn': execution_arn # Optional: return for tracking
            })
        }

    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid JSON format in request body'})
        }
    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'})
        } 