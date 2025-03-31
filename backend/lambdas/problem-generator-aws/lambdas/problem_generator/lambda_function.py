import json
import sys
import os
import time
import boto3
import uuid
import traceback
from pathlib import Path

# 상위 디렉토리의 모듈을 임포트할 수 있도록 경로 추가
parent_dir = str(Path(__file__).parent.parent.parent)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# utils 디렉토리를 sys.path에 추가
utils_dir = str(Path(__file__).parent.parent.parent / 'utils')
if utils_dir not in sys.path:
    sys.path.insert(0, utils_dir)

# AWS 유틸리티 함수 임포트
try:
    from utils.aws_utils import upload_to_s3
except ImportError:
    print("Error: Cannot import aws_utils, check if the module exists")

# 브릿지 모듈을 통해 problem-generator의 기능 가져오기
try:
    from utils.model_manager_bridge import generate_problem, get_api_key
except ImportError:
    print("Error: Cannot import model_manager_bridge, check if the module exists")

# 환경 변수에서 설정 가져오기
RESULT_BUCKET = os.environ.get('RESULT_BUCKET', 'problem-generator-results')
RESULT_PREFIX = os.environ.get('RESULT_PREFIX', 'results/')

def handler(event, context):
    """
    SQS로부터 받은 문제 생성 요청을 처리하는 Lambda 핸들러
    """
    print(f"Received event: {json.dumps(event, indent=2)}")
    
    # SQS 이벤트에서 메시지 추출
    for record in event.get('Records', []):
        try:
            # 메시지 본문 파싱
            message_body = json.loads(record['body'])
            result = process_job(message_body)
            
            # 결과 S3에 저장
            job_id = message_body.get('job_id', str(uuid.uuid4()))
            result_key = f"{RESULT_PREFIX}{job_id}.json"
            upload_result_to_s3(result, result_key)
            
        except Exception as e:
            print(f"Error processing message: {str(e)}")
            traceback.print_exc()
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Processing completed'})
    }

def process_job(job_data):
    """
    작업을 처리하고 결과를 생성하는 함수
    
    Args:
        job_data (dict): SQS 메시지에서 추출한 작업 정보
        
    Returns:
        dict: 처리 결과
    """
    start_time = time.time()
    print(f"Processing job: {job_data}")
    
    # 필수 파라미터 확인
    job_id = job_data.get('job_id', str(uuid.uuid4()))
    algorithm_type = job_data.get('algorithm_type')
    difficulty = job_data.get('difficulty')
    
    if not algorithm_type or not difficulty:
        error_msg = "Missing required parameters: algorithm_type and difficulty"
        print(error_msg)
        return {
            'job_id': job_id,
            'status': 'FAILED',
            'error': error_msg,
            'completed_at': int(time.time())
        }
    
    # API 키 설정
    api_key = job_data.get('api_key')
    try:
        api_key = get_api_key(api_key)
    except ValueError as e:
        print(f"API key error: {str(e)}")
        return {
            'job_id': job_id,
            'status': 'FAILED',
            'error': str(e),
            'completed_at': int(time.time())
        }
    
    # 문제 생성 실행
    try:
        print(f"Generating problem with algorithm_type={algorithm_type}, difficulty={difficulty}")
        
        # 브릿지 모듈을 통해 problem-generator의 generate_problem 함수 호출
        # 이제 문제 설명, 코드, 테스트 케이스 모두 생성됨
        result = generate_problem(
            api_key=api_key,
            algorithm_type=algorithm_type, 
            difficulty=difficulty,
            verbose=True
        )
        
        # 메타데이터 추가
        result.update({
            'job_id': job_id,
            'status': 'COMPLETED',
            'processing_time': time.time() - start_time,
            'completed_at': int(time.time())
        })
        
        print(f"Problem generation completed successfully for job_id: {job_id}")
        return result
        
    except Exception as e:
        error_msg = str(e)
        print(f"Error generating problem: {error_msg}")
        traceback.print_exc()
        
        return {
            'job_id': job_id,
            'status': 'FAILED',
            'error': error_msg,
            'algorithm_type': algorithm_type,
            'difficulty': difficulty,
            'completed_at': int(time.time())
        }

def upload_result_to_s3(result, result_key):
    """
    처리 결과를 S3에 저장
    
    Args:
        result (dict): 저장할 결과 데이터
        result_key (str): S3 객체 키
    """
    try:
        # 결과를 S3에 저장
        s3_client = boto3.client('s3')
        s3_client.put_object(
            Bucket=RESULT_BUCKET,
            Key=result_key,
            Body=json.dumps(result, ensure_ascii=False),
            ContentType='application/json'
        )
        
        print(f"Result uploaded to S3: s3://{RESULT_BUCKET}/{result_key}")
        
    except Exception as e:
        print(f"Error uploading result to S3: {str(e)}")
        traceback.print_exc()

# 로컬 테스트용 코드
if __name__ == "__main__":
    # 테스트 이벤트 생성
    test_event = {
        'Records': [{
            'body': json.dumps({
                'job_id': str(uuid.uuid4()),
                'algorithm_type': '구현',
                'difficulty': '쉬움'
            })
        }]
    }
    
    # 핸들러 함수 호출
    handler(test_event, None)
