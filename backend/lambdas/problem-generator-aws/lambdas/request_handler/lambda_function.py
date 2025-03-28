import json
import sys
import os
from pathlib import Path
import uuid
import time

# 상위 디렉토리의 모듈을 임포트할 수 있도록 경로 추가
parent_dir = str(Path(__file__).parent.parent.parent)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from utils.aws_utils import send_message_to_sqs, generate_s3_url

def validate_input(event):
    """요청 내용을 검증하는 함수"""
    body = None
    
    # API Gateway의 경우
    if 'body' in event:
        try:
            body = json.loads(event['body'])
        except:
            body = event['body']
    else:
        # 직접 호출 또는 다른 이벤트 소스
        body = event
    
    # 필수 파라미터 검증
    required = ['algorithm_type', 'difficulty']
    for param in required:
        if param not in body:
            return None, f"Missing required parameter: {param}"
    
    # API 키 검증 (있는 경우)
    api_key = body.get('api_key')
    if api_key is None and 'GOOGLE_AI_API_KEY' not in os.environ:
        return None, "API key is required"
    
    return body, None

def handler(event, context):
    """
    사용자의 문제 생성 요청을 처리하고 SQS에 작업을 등록하는 Lambda 핸들러
    """
    print(f"Received event: {event}")
    
    # 입력 검증
    body, error = validate_input(event)
    if error:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': error})
        }
    
    # 작업 ID 생성
    job_id = str(uuid.uuid4())
    
    # 처리 시간 추가
    timestamp = int(time.time())
    
    # 작업 정보 생성
    job_info = {
        'job_id': job_id,
        'status': 'QUEUED',
        'algorithm_type': body['algorithm_type'],
        'difficulty': body['difficulty'],
        'api_key': body.get('api_key', os.environ.get('GOOGLE_AI_API_KEY')),
        'created_at': timestamp
    }
    
    # 결과 파일 이름 생성
    result_key = f"results/{job_id}.json"
    job_info['result_file'] = result_key
    
    # SQS에 메시지 전송
    try:
        message_id = send_message_to_sqs(job_info)
        print(f"Message sent to SQS with ID: {message_id}")
    except Exception as e:
        print(f"Error sending message to SQS: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': f"Failed to queue job: {str(e)}"})
        }
    
    # 성공 응답
    result_url = generate_s3_url(result_key)
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'job_id': job_id,
            'status': 'QUEUED',
            'algorithm_type': body['algorithm_type'],
            'difficulty': body['difficulty'],
            'result_url': result_url
        })
    }
