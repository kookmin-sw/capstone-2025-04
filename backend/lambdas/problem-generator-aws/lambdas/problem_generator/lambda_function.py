import json
import sys
import os
import time
from pathlib import Path

# 상위 디렉토리의 모듈을 임포트할 수 있도록 경로 추가
parent_dir = str(Path(__file__).parent.parent.parent)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from utils.aws_utils import (
    receive_message_from_sqs, delete_message_from_sqs, upload_to_s3
)

# 브릿지 모듈을 통해 problem-generator의 기능 가져오기
from utils.model_manager_bridge import generate_problem, get_api_key

def process_job(job_data):
    """작업을 처리하고 결과를 생성하는 함수"""
    start_time = time.time()
    print(f"Processing job: {job_data['job_id']}")
    
    # API 키 설정
    api_key = job_data.get('api_key', os.environ.get('GOOGLE_AI_API_KEY'))
    if not api_key:
        raise ValueError("No API key provided")
    
    # 알고리즘 유형과 난이도 가져오기
    algorithm_type = job_data['algorithm_type']
    difficulty = job_data['difficulty']
    
    # 문제 생성 실행
    try:
        # 브릿지 모듈을 통해 problem-generator의 generate_problem 함수 호출
        print(f"Calling problem-generator with algorithm_type={algorithm_type}, difficulty={difficulty}")
        result = generate_problem(api_key, algorithm_type, difficulty, verbose=True)
        end_time = time.time()
        
        # 처리 결과에 메타데이터 추가
        result.update({
            'job_id': job_data['job_id'],
            'status': 'COMPLETED',
            'processing_time': end_time - start_time,
            'completed_at': int(time.time())
        })
        
        return result
    except Exception as e:
        print(f"Error generating problem: {str(e)}")
        return {
            'job_id': job_data['job_id'],
            'status': 'FAILED',
            'error': str(e),
            'algorithm_type': algorithm_type,
            'difficulty': difficulty,
            'completed_at': int(time.time())
        }

def handler(event, context):
    """SQS에서 메시지를 처리하고 결과를 S3에 저장하는 Lambda 핸들러"""
    print("Starting problem generator worker")
    
    # SQS에서 메시지 수신
    message = receive_message_from_sqs()
    if not message:
        print("No messages in queue")
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'No messages to process'})
        }
    
    try:
        job_data = message['body']
        print(f"Received job: {job_data}")
        
        # 작업 처리
        result = process_job(job_data)
        
        # 결과를 S3에 저장
        result_key = job_data.get('result_file', f"results/{job_data['job_id']}.json")
        url = upload_to_s3(result, result_key)
        
        print(f"Result uploaded to: {url}")
        
        # 처리 완료된 메시지 삭제
        delete_message_from_sqs(message['receipt_handle'])
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Job processed successfully',
                'job_id': job_data['job_id'],
                'result_url': url
            })
        }
    except Exception as e:
        print(f"Error processing message: {str(e)}")
        
        # 오류가 발생해도 메시지 삭제
        try:
            delete_message_from_sqs(message['receipt_handle'])
        except:
            pass
        
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
