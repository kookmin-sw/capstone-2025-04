import os
import json
import time
import argparse
import subprocess
import sys
import uuid
import requests
from pathlib import Path
from dotenv import load_dotenv

# 현재 디렉토리 경로 설정 및 환경 변수 로드
current_dir = Path(__file__).parent.absolute()
sys.path.append(str(current_dir))

# 환경 변수 로드
load_dotenv(dotenv_path=current_dir / '.env')

# problem-generator의 .env 파일을 로드 (우선순위 높게)
generator_path = current_dir.parent / 'problem-generator'
generator_env_path = generator_path / '.env'
if generator_env_path.exists():
    load_dotenv(dotenv_path=generator_env_path, override=True)
    print(f"Loaded environment variables from {generator_env_path}")

# Localstack을 사용하도록 환경변수 설정
if 'IS_LOCAL' not in os.environ:
    os.environ['IS_LOCAL'] = 'true'

# AWS 관련 설정 가져오기
from config import (
    get_endpoint_url, SQS_QUEUE_NAME, S3_BUCKET_NAME, 
    REGION, IS_LOCAL, LOCALSTACK_HOSTNAME, LOCALSTACK_PORT,
    initialize_dynamodb_table, DYNAMODB_TABLE_NAME
)

# 브릿지 모듈을 통해 problem-generator 기능 가져오기
from utils.model_manager_bridge import generate_problem, get_api_key
from utils.aws_utils import (
    get_aws_client, send_message_to_sqs, receive_message_from_sqs, 
    delete_message_from_sqs, upload_to_s3, generate_s3_url,
    add_job_status, update_job_status, get_job_status,
    wait_for_localstack, get_dynamodb_resource
)

def wait_for_localstack(max_retries=10, retry_delay=2):
    """LocalStack이 준비될 때까지 기다리는 함수"""
    if not IS_LOCAL:
        return True
    
    # 업데이트된 health 엔드포인트 사용
    endpoint = f"http://{LOCALSTACK_HOSTNAME}:{LOCALSTACK_PORT}/_localstack/health"
    print(f"Waiting for LocalStack to be ready at {endpoint}...")
    
    for retry in range(max_retries):
        try:
            response = requests.get(endpoint, timeout=2)
            if response.status_code == 200:
                data = response.json()
                services = data.get('services', {})
                # SQS와 S3 서비스 상태 확인
                sqs_status = services.get('sqs')
                s3_status = services.get('s3')
                if sqs_status in ["running", "available"] and s3_status in ["running", "available"]:
                    print("LocalStack SQS and S3 are ready!")
                    return True
                else:
                    print(f"LocalStack services status - SQS: {sqs_status}, S3: {s3_status}")
            else:
                print(f"LocalStack health check returned status code: {response.status_code}")
        except Exception as e:
            print(f"Retry {retry+1}/{max_retries}: LocalStack not ready yet: {str(e)}")
        
        time.sleep(retry_delay)
    
    print("Failed to connect to LocalStack after maximum retries")
    return False

def get_queue_url(sqs_client):
    """SQS 큐 URL을 가져오는 함수"""
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

def initialize_s3_bucket(s3_client):
    """S3 버킷을 초기화하는 함수"""
    if IS_LOCAL:
        try:
            s3_client.create_bucket(Bucket=S3_BUCKET_NAME)
            print(f"Created S3 bucket: {S3_BUCKET_NAME}")
        except Exception as e:
            # 이미 존재하는 경우 무시
            print(f"S3 bucket setup: {str(e)}")

def receive_message_from_sqs():
    """SQS 큐에서 메시지를 수신하는 함수"""
    sqs_client = get_aws_client('sqs')
    queue_url = get_queue_url(sqs_client)
    
    response = sqs_client.receive_message(
        QueueUrl=queue_url,
        MaxNumberOfMessages=1,
        WaitTimeSeconds=1  # 짧은 폴링 시간
    )
    
    messages = response.get('Messages', [])
    if not messages:
        return None
    
    message = messages[0]
    receipt_handle = message['ReceiptHandle']
    
    # 메시지 본문 파싱
    try:
        body = json.loads(message['Body'])
    except:
        body = message['Body']
    
    return {
        'body': body,
        'receipt_handle': receipt_handle
    }

def delete_message_from_sqs(receipt_handle):
    """처리 완료된 메시지를 SQS 큐에서 삭제하는 함수"""
    sqs_client = get_aws_client('sqs')
    queue_url = get_queue_url(sqs_client)
    
    sqs_client.delete_message(
        QueueUrl=queue_url,
        ReceiptHandle=receipt_handle
    )

def upload_to_s3(content, object_key=None, content_type='application/json'):
    """콘텐츠를 S3 버킷에 업로드하는 함수"""
    s3_client = get_aws_client('s3')
    initialize_s3_bucket(s3_client)
    
    # 객체 키가 없으면 UUID 생성
    if object_key is None:
        object_key = f"problem-{uuid.uuid4()}.json"
    
    # 문자열이 아닌 경우 JSON으로 변환
    if not isinstance(content, str):
        content = json.dumps(content)
    
    s3_client.put_object(
        Bucket=S3_BUCKET_NAME,
        Key=object_key,
        Body=content,
        ContentType=content_type
    )
    
    # S3 객체에 대한 URL 반환
    if IS_LOCAL:
        return f"{get_endpoint_url()}/{S3_BUCKET_NAME}/{object_key}"
    else:
        return f"https://{S3_BUCKET_NAME}.s3.amazonaws.com/{object_key}"

def check_docker_running():
    """Docker가 실행 중인지 확인"""
    try:
        result = subprocess.run(['docker', 'info'], 
                               stdout=subprocess.PIPE, 
                               stderr=subprocess.PIPE,
                               text=True,
                               check=False)
        return result.returncode == 0
    except Exception:
        return False

def check_localstack_running():
    """LocalStack 컨테이너가 실행 중인지 확인"""
    try:
        result = subprocess.run(['docker', 'ps', '--filter', 'name=problem-generator-localstack'], 
                               stdout=subprocess.PIPE, 
                               text=True, 
                               check=False)
        return 'localstack' in result.stdout.lower()
    except Exception:
        return False

def start_localstack():
    """Docker-compose로 LocalStack 시작"""
    print("Starting LocalStack with docker-compose...")
    try:
        subprocess.run(['docker-compose', 'up', '-d'], 
                      stdout=subprocess.PIPE, 
                      stderr=subprocess.PIPE,
                      text=True,
                      check=True)
        print("LocalStack started successfully")
        # 컨테이너가 완전히 초기화될 때까지 대기
        time.sleep(3)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Failed to start LocalStack: {e}")
        print(f"Error output: {e.stderr}")
        return False

def setup_resources():
    """LocalStack에 필요한 AWS 리소스(SQS, S3, DynamoDB)를 설정합니다."""
    print("Setting up AWS resources in Localstack...")
    
    # Docker 및 LocalStack 실행 확인
    if not check_docker_running():
        print("Error: Docker is not running. Please start Docker and try again.")
        return False
    
    if not check_localstack_running():
        print("LocalStack is not running. Attempting to start...")
        if not start_localstack():
            print("Error: Could not start LocalStack. Please check your Docker installation.")
            return False
    
    # LocalStack이 완전히 준비될 때까지 대기
    if not wait_for_localstack():
        print("Error: LocalStack is not ready after waiting. Please check LocalStack status.")
        return False
    
    try:
        # SQS 큐 생성
        sqs_client = get_aws_client('sqs')
        queue_url = get_queue_url(sqs_client)
        print(f"SQS Queue URL: {queue_url}")
        
        # S3 버킷 생성
        s3_client = get_aws_client('s3')
        initialize_s3_bucket(s3_client)
        print(f"S3 Bucket initialized")

        # DynamoDB 테이블 생성/확인
        dynamodb_resource = get_dynamodb_resource()
        initialize_dynamodb_table(dynamodb_resource)
        print(f"DynamoDB table '{DYNAMODB_TABLE_NAME}' initialized.")

        return True
    except Exception as e:
        print(f"Error setting up AWS resources: {str(e)}")
        return False

# SQS 큐에 메시지 전송
def send_message_to_sqs(message_body):
    """메시지를 SQS 큐에 전송하는 함수"""
    sqs_client = get_aws_client('sqs')
    queue_url = get_queue_url(sqs_client)
    
    # 문자열이 아닌 경우 JSON으로 변환
    if not isinstance(message_body, str):
        message_body = json.dumps(message_body)
    
    response = sqs_client.send_message(
        QueueUrl=queue_url,
        MessageBody=message_body
    )
    return response['MessageId']

def submit_job(algorithm_type, difficulty):
    """문제 생성 작업을 SQS에 제출하고 DynamoDB 상태를 초기화합니다."""
    print(f"Submitting job for {algorithm_type} with {difficulty} difficulty")
    job_id = str(uuid.uuid4())
    result_object_key = f"results/{job_id}.json"
    result_url = generate_s3_url(result_object_key)
    
    message_body = {
        'job_id': job_id,
        'algorithm_type': algorithm_type,
        'difficulty': difficulty,
        'result_object_key': result_object_key
    }
    
    message_id = send_message_to_sqs(message_body)
    print(f"Message sent to SQS with ID: {message_id}")
    
    # DynamoDB 상태 초기화
    add_job_status(job_id, algorithm_type, difficulty)
    
    return job_id, result_url

def process_queue_locally(api_key):
    """SQS 큐에서 메시지를 가져와 로컬에서 문제 생성을 시뮬레이션합니다."""
    print("Processing job from queue...")
    message_info = receive_message_from_sqs()
    
    if not message_info:
        print("No messages in the queue.")
        return
        
    body = message_info['body']
    receipt_handle = message_info['receipt_handle']
    
    job_id = body.get('job_id')
    algorithm_type = body.get('algorithm_type')
    difficulty = body.get('difficulty')
    result_object_key = body.get('result_object_key')

    if not all([job_id, algorithm_type, difficulty, result_object_key]):
        print(f"Invalid message format: {body}. Skipping.")
        # 잘못된 메시지는 큐에서 삭제할 수 있음 (선택 사항)
        # delete_message_from_sqs(receipt_handle)
        return

    print(f"Processing job: {job_id}")
    
    try:
        # DynamoDB 상태를 PROCESSING으로 업데이트
        update_job_status(job_id, 'PROCESSING')
        print(f"[{job_id}] DynamoDB status updated to PROCESSING.")
        
        # 문제 생성 호출
        print(f"[{job_id}] Calling generate_problem with algorithm_type={algorithm_type}, difficulty={difficulty}")
        start_time = time.time()
        problem_result = generate_problem(api_key, algorithm_type, difficulty, verbose=True)
        end_time = time.time()
        print(f"[{job_id}] generate_problem finished in {end_time - start_time:.2f} seconds.")
        
        # 결과 S3에 업로드
        result_url = upload_to_s3(problem_result, object_key=result_object_key)
        print(f"[{job_id}] Result uploaded to S3: {result_url}")

        # DynamoDB 상태를 COMPLETED로 업데이트
        update_job_status(job_id, 'COMPLETED', result_url=result_url)
        print(f"[{job_id}] DynamoDB status updated to COMPLETED.")
        
        # 메시지 삭제
        delete_message_from_sqs(receipt_handle)
        print(f"[{job_id}] Message deleted from SQS.")
        
    except Exception as e:
        print(f"[{job_id}] Error processing job: {str(e)}")
        # DynamoDB 상태를 FAILED로 업데이트
        update_job_status(job_id, 'FAILED', error_message=str(e))
        print(f"[{job_id}] DynamoDB status updated to FAILED.")
        # 실패한 메시지는 큐에 남겨둠 (또는 데드 레터 큐로)

def main():
    parser = argparse.ArgumentParser(description="Simulate Problem Generator AWS locally using LocalStack")
    parser.add_argument("--setup", action="store_true", help="Initialize AWS resources in LocalStack and exit")
    parser.add_argument("-a", "--algorithm", default="구현", help="Algorithm type for the problem")
    parser.add_argument("-d", "--difficulty", default="쉬움", help="Difficulty level for the problem")
    parser.add_argument("-k", "--api_key", help="Google AI API Key (overrides environment variable)")
    
    args = parser.parse_args()
    
    # API 키 로드
    api_key = get_api_key(args.api_key)
    
    # 리소스 설정 모드
    if args.setup:
        print("--setup flag provided. Initializing resources only.")
        setup_resources()
        return
        
    # 일반 실행 모드
    print("Running in simulation mode.")
    setup_resources() # 매번 실행 시 리소스 확인/생성
    
    # 작업 제출
    job_id, result_url = submit_job(args.algorithm, args.difficulty)
    print(f"==> Job Submitted: ID={job_id}, Algorithm='{args.algorithm}', Difficulty='{args.difficulty}'")
    
    # DynamoDB에서 초기 상태 확인
    print(f"Checking initial status for job {job_id}...")
    time.sleep(1) # DynamoDB 반영 시간 약간 대기
    initial_status = get_job_status(job_id)
    print(f"==> Initial DynamoDB Status: {initial_status}")
    
    # 큐 처리 시뮬레이션
    print(f"\nSimulating queue processing for job {job_id}...")
    time.sleep(2) # 처리 시작 전 약간 대기
    process_queue_locally(api_key)
    
    # DynamoDB에서 최종 상태 확인
    print(f"\nChecking final status for job {job_id}...")
    time.sleep(1) 
    final_status = get_job_status(job_id)
    print(f"==> Final DynamoDB Status: {final_status}")
    print("\nSimulation finished.")

if __name__ == "__main__":
    main()
