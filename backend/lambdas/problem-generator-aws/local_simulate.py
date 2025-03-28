import os
import json
import time
import argparse
import subprocess
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add the current directory to sys.path to enable proper imports
current_dir = Path(__file__).parent.absolute()
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

# Now we can import our modules
try:
    from utils.aws_utils import get_aws_client, get_queue_url, initialize_s3_bucket, wait_for_localstack
    from lambdas.request_handler.lambda_function import handler as request_handler
    from lambdas.problem_generator.lambda_function import handler as problem_generator
except ImportError as e:
    print(f"Error importing problem generator modules: {e}")
    # Continue with setup anyway since we can still set up AWS resources

# .env 파일 로드
load_dotenv()

# Localstack을 사용하도록 환경변수 설정 (이미 .env에 설정되어 있을 수 있음)
if 'IS_LOCAL' not in os.environ:
    os.environ['IS_LOCAL'] = 'true'

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

def submit_job(algorithm_type, difficulty, api_key=None):
    """문제 생성 요청 제출"""
    print(f"Submitting job for {algorithm_type} with {difficulty} difficulty")
    
    # 요청 데이터 생성
    request_data = {
        'algorithm_type': algorithm_type,
        'difficulty': difficulty
    }
    
    if api_key:
        request_data['api_key'] = api_key
    
    # 요청 핸들러 호출
    response = request_handler(request_data, {})
    print(f"Response from request handler: {response}")
    
    # 응답이 문자열인 경우 파싱
    if isinstance(response.get('body'), str):
        body = json.loads(response['body'])
    else:
        body = response.get('body', {})
    
    return body.get('job_id')

def process_job():
    """대기 중인 작업 처리"""
    print("Processing job from queue...")
    
    # 작업 처리 핸들러 호출
    response = problem_generator({}, {})
    print(f"Response from problem generator: {response}")
    
    # 응답이 문자열인 경우 파싱
    if isinstance(response.get('body'), str):
        body = json.loads(response['body'])
    else:
        body = response.get('body', {})
    
    return body.get('result_url')

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
    
    # API 키 설정
    api_key = args.api_key or os.environ.get('GOOGLE_AI_API_KEY')
    if not api_key:
        print("Warning: No API key provided. Set GOOGLE_AI_API_KEY environment variable or use --api_key")
    
    # 작업 제출
    job_id = submit_job(args.algorithm, args.difficulty, api_key)
    
    if job_id:
        print(f"Job submitted with ID: {job_id}")
        
        # 작업 처리 (실제로는 다른 프로세스나 스케줄러가 처리)
        print("Waiting 2 seconds before processing...")
        time.sleep(2)
        
        result_url = process_job()
        if result_url:
            print(f"Job processed. Result available at: {result_url}")

if __name__ == "__main__":
    main()
