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
    REGION, IS_LOCAL, LOCALSTACK_HOSTNAME, LOCALSTACK_PORT
)

# 브릿지 모듈을 통해 problem-generator 기능 가져오기
from utils.model_manager_bridge import generate_problem, get_api_key

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

def get_aws_client(service_name, max_retries=3):
    """AWS 클라이언트를 생성하고 반환하는 함수 (Localstack 또는 실제 AWS)"""
    import boto3
    
    endpoint_url = get_endpoint_url() if IS_LOCAL else None
    
    retry_count = 0
    while retry_count < max_retries:
        try:
            client = boto3.client(
                service_name,
                endpoint_url=endpoint_url,
                region_name=REGION,
                # Localstack용 더미 자격 증명 (실제 AWS에서는 무시됨)
                aws_access_key_id='test' if IS_LOCAL else None,
                aws_secret_access_key='test' if IS_LOCAL else None
            )
            
            # 간단한 작업으로 연결 테스트
            if service_name == 'sqs':
                try:
                    client.list_queues(MaxResults=1)
                except Exception as e:
                    if 'AccessDenied' not in str(e):  # 접근 권한 오류는 연결은 된 것으로 간주
                        raise
            elif service_name == 's3':
                try:
                    client.list_buckets()
                except Exception as e:
                    if 'AccessDenied' not in str(e):
                        raise
            
            return client
        except Exception as e:
            retry_count += 1
            if retry_count >= max_retries:
                print(f"Failed to create AWS client for {service_name} after {max_retries} retries")
                raise
            else:
                print(f"Retrying AWS client creation for {service_name}: {str(e)}")
                time.sleep(2)

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

def setup_aws_resources():
    """Localstack에 필요한 AWS 리소스 설정"""
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

def submit_job(algorithm_type, difficulty, api_key=None):
    """문제 생성 요청 제출"""
    print(f"Submitting job for {algorithm_type} with {difficulty} difficulty")
    
    # API 키가 제공되었거나 환경 변수에 있는 경우만 추가
    if not api_key:
        api_key = os.environ.get('GOOGLE_AI_API_KEY')
    
    # 요청 직접 처리
    job_id = str(uuid.uuid4())
    timestamp = int(time.time())
    
    job_info = {
        'job_id': job_id,
        'status': 'QUEUED',
        'algorithm_type': algorithm_type,
        'difficulty': difficulty,
        'api_key': api_key,
        'created_at': timestamp,
        'result_file': f"results/{job_id}.json"
    }
    
    # SQS에 메시지 전송
    try:
        message_id = send_message_to_sqs(job_info)
        print(f"Message sent to SQS with ID: {message_id}")
        
        return job_id
    except Exception as e:
        print(f"Error sending message to SQS: {str(e)}")
        return None

def process_job():
    """대기 중인 작업 처리"""
    print("Processing job from queue...")
    
    # SQS에서 메시지 수신
    message = receive_message_from_sqs()
    if not message:
        print("No messages in queue")
        return None
    
    try:
        job_data = message['body']
        print(f"Processing job: {job_data['job_id']}")
        
        # API 키 설정 - 브릿지 모듈의 get_api_key 함수 사용
        api_key = get_api_key(job_data.get('api_key'))
        algorithm_type = job_data['algorithm_type']
        difficulty = job_data['difficulty']
        
        # 문제 생성 직접 실행 - 브릿지 모듈의 generate_problem 함수 사용
        start_time = time.time()
        try:
            print(f"Calling generate_problem with algorithm_type={algorithm_type}, difficulty={difficulty}")
            result = generate_problem(api_key, algorithm_type, difficulty, verbose=True)
            end_time = time.time()
            
            # 처리 결과에 메타데이터 추가
            result.update({
                'job_id': job_data['job_id'],
                'status': 'COMPLETED',
                'processing_time': end_time - start_time,
                'completed_at': int(time.time())
            })
        except Exception as e:
            print(f"Error generating problem: {str(e)}")
            result = {
                'job_id': job_data['job_id'],
                'status': 'FAILED',
                'error': str(e),
                'algorithm_type': algorithm_type,
                'difficulty': difficulty,
                'completed_at': int(time.time())
            }
        
        # 결과 처리
        result_key = job_data.get('result_file', f"results/{job_data['job_id']}.json")
        url = upload_to_s3(result, result_key)
        
        # 처리 완료된 메시지 삭제
        delete_message_from_sqs(message['receipt_handle'])
        
        return url
    except Exception as e:
        print(f"Error processing job: {str(e)}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Simulate problem generator AWS workflow locally")
    parser.add_argument('--algorithm', '-a', default='구현', help='Algorithm type')
    parser.add_argument('--difficulty', '-d', default='쉬움', choices=['튜토리얼', '쉬움', '보통', '어려움'], help='Difficulty level')
    parser.add_argument('--api_key', '-k', help='Google AI API key')
    parser.add_argument('--setup', '-s', action='store_true', help='Only setup AWS resources')
    
    args = parser.parse_args()
    
    # AWS 리소스 설정
    if not setup_aws_resources():
        print("Failed to set up AWS resources. Exiting.")
        return
    
    if args.setup:
        return
    
    # 작업 제출
    job_id = submit_job(args.algorithm, args.difficulty, args.api_key)
    
    if job_id:
        print(f"Job submitted with ID: {job_id}")
        
        # 작업 처리 (실제로는 다른 프로세스나 스케줄러가 처리)
        print("Waiting 2 seconds before processing...")
        time.sleep(2)
        
        result_url = process_job()
        if result_url:
            print(f"Job processed. Result available at: {result_url}")
        else:
            print("Failed to process job.")
    else:
        print("Failed to submit job.")

if __name__ == "__main__":
    main()
