import os
from dotenv import load_dotenv
from botocore.exceptions import ClientError

# .env 파일 로드
load_dotenv()

# 환경 설정
IS_LOCAL = os.environ.get('IS_LOCAL', 'false').lower() == 'true'
LOCALSTACK_HOSTNAME = os.environ.get('LOCALSTACK_HOSTNAME', 'localhost')
LOCALSTACK_PORT = os.environ.get('LOCALSTACK_PORT', '4566')

# AWS 리소스 설정
REGION = os.environ.get('AWS_REGION', 'us-east-1')
SQS_QUEUE_NAME = os.environ.get('SQS_QUEUE_NAME', 'problem-generator-queue')
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'problem-generator-results')
DYNAMODB_TABLE_NAME = os.environ.get('DYNAMODB_TABLE_NAME', 'problem-job-status')

# Localstack 엔드포인트
def get_endpoint_url():
    if IS_LOCAL:
        return f'http://{LOCALSTACK_HOSTNAME}:{LOCALSTACK_PORT}'
    return None

# SQS 큐 URL
def get_queue_url(sqs_client):
    if IS_LOCAL:
        # Localstack에서는 항상 먼저 큐 생성 시도
        try:
            # 큐가 이미 있는지 확인
            try:
                response = sqs_client.get_queue_url(QueueName=SQS_QUEUE_NAME)
                return response['QueueUrl']
            except:
                # 큐가 없으면 생성
                print(f"Creating new SQS queue: {SQS_QUEUE_NAME}")
                response = sqs_client.create_queue(QueueName=SQS_QUEUE_NAME)
                return response['QueueUrl']
        except Exception as e:
            print(f"Error with SQS queue: {str(e)}")
            # 모든 실패 시 기본 LocalStack URL 형식 반환
            return f"{get_endpoint_url()}/000000000000/{SQS_QUEUE_NAME}"
    else:
        # AWS 환경에서는 기존 큐 URL 가져오기
        try:
            response = sqs_client.get_queue_url(QueueName=SQS_QUEUE_NAME)
            return response['QueueUrl']
        except:
            # 큐가 없으면 생성 후 URL 반환
            print(f"Creating new SQS queue in AWS: {SQS_QUEUE_NAME}")
            response = sqs_client.create_queue(QueueName=SQS_QUEUE_NAME)
            return response['QueueUrl']

# S3 버킷 초기화
def initialize_s3_bucket(s3_client):
    if IS_LOCAL:
        try:
            s3_client.create_bucket(Bucket=S3_BUCKET_NAME)
        except:
            # 이미 존재하는 경우 무시
            pass

# DynamoDB 테이블 초기화 함수 추가
def initialize_dynamodb_table(dynamodb_resource):
    """DynamoDB 테이블을 생성하거나 존재하는지 확인합니다."""
    try:
        table = dynamodb_resource.create_table(
            TableName=DYNAMODB_TABLE_NAME,
            KeySchema=[
                {
                    'AttributeName': 'job_id',
                    'KeyType': 'HASH'  # 파티션 키
                }
            ],
            AttributeDefinitions=[
                {
                    'AttributeName': 'job_id',
                    'AttributeType': 'S' # 문자열 타입
                }
            ],
            ProvisionedThroughput={
                'ReadCapacityUnits': 1, # 온디맨드 또는 더 낮은 값으로 설정 가능
                'WriteCapacityUnits': 1
            }
        )
        # 테이블 생성을 기다립니다.
        print(f"Waiting for table {DYNAMODB_TABLE_NAME} to be created...")
        table.meta.client.get_waiter('table_exists').wait(TableName=DYNAMODB_TABLE_NAME, WaiterConfig={'Delay': 1, 'MaxAttempts': 10})
        print(f"DynamoDB table '{DYNAMODB_TABLE_NAME}' created.")
        return table
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        if error_code == 'ResourceInUseException':
            print(f"DynamoDB table '{DYNAMODB_TABLE_NAME}' already exists.")
            return dynamodb_resource.Table(DYNAMODB_TABLE_NAME)
        elif error_code == 'LimitExceededException' and IS_LOCAL:
            print(f"LocalStack DynamoDB limit reached, assuming table '{DYNAMODB_TABLE_NAME}' exists.")
            return dynamodb_resource.Table(DYNAMODB_TABLE_NAME)
        else:
            print(f"Error initializing DynamoDB table: {e}")
            raise
