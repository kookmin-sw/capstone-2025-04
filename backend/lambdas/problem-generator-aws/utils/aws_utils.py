import json
import boto3
import os
import time
import requests
from pathlib import Path
import sys

# 상위 디렉토리의 모듈을 임포트할 수 있도록 경로 추가
parent_dir = str(Path(__file__).parent.parent)
if (parent_dir not in sys.path):
    sys.path.insert(0, parent_dir)

from config import (
    IS_LOCAL, REGION, SQS_QUEUE_NAME, S3_BUCKET_NAME, 
    get_endpoint_url, get_queue_url, initialize_s3_bucket
)

def wait_for_localstack(max_retries=5, delay=1):
    """LocalStack이 준비될 때까지 대기 (간소화 버전)"""
    if not IS_LOCAL:
        return True
    
    endpoint = get_endpoint_url()
    print(f"Checking LocalStack at {endpoint}...")
    
    # 직접 SQS와 S3 서비스에 연결 시도
    try:
        sqs_client = get_aws_client('sqs')
        s3_client = get_aws_client('s3')
        
        # 간단한 작업 시도
        sqs_client.list_queues()
        try:
            s3_client.list_buckets()
        except Exception:
            # S3에서 오류가 발생해도 무시 (버킷이 없어도 괜찮음)
            pass
            
        print("LocalStack 서비스에 성공적으로 연결했습니다.")
        return True
    except Exception as e:
        print(f"LocalStack 서비스 연결 실패: {str(e)}")
        return False

def get_aws_client(service_name):
    """AWS 서비스에 대한 클라이언트를 생성"""
    kwargs = {}
    
    if IS_LOCAL:
        kwargs.update({
            'endpoint_url': get_endpoint_url(),
            'region_name': REGION,
            'aws_access_key_id': 'test',
            'aws_secret_access_key': 'test',
        })
    
    return boto3.client(service_name, **kwargs)

def send_message_to_sqs(message_body):
    """SQS 큐에 메시지 전송"""
    sqs_client = get_aws_client('sqs')
    queue_url = get_queue_url(sqs_client)
    
    # 메시지가 딕셔너리인 경우 JSON으로 직렬화
    if isinstance(message_body, dict):
        message_body = json.dumps(message_body)
    
    response = sqs_client.send_message(
        QueueUrl=queue_url,
        MessageBody=message_body
    )
    
    return response['MessageId']

def receive_message_from_sqs():
    """SQS 큐에서 메시지 수신"""
    sqs_client = get_aws_client('sqs')
    queue_url = get_queue_url(sqs_client)
    
    response = sqs_client.receive_message(
        QueueUrl=queue_url,
        MaxNumberOfMessages=1,
        VisibilityTimeout=60,
        WaitTimeSeconds=0
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
        'receipt_handle': receipt_handle,
        'body': body
    }

def delete_message_from_sqs(receipt_handle):
    """처리 완료된 SQS 메시지 삭제"""
    sqs_client = get_aws_client('sqs')
    queue_url = get_queue_url(sqs_client)
    
    sqs_client.delete_message(
        QueueUrl=queue_url,
        ReceiptHandle=receipt_handle
    )

def upload_to_s3(data, key):
    """데이터를 S3에 업로드"""
    s3_client = get_aws_client('s3')
    
    # 딕셔너리를 JSON 문자열로 변환
    if isinstance(data, dict):
        content = json.dumps(data, ensure_ascii=False, indent=2)
    else:
        content = data
    
    s3_client.put_object(
        Bucket=S3_BUCKET_NAME,
        Key=key,
        Body=content,
        ContentType='application/json'
    )
    
    # 파일 URL 생성
    return generate_s3_url(key)

def generate_s3_url(key):
    """S3 객체에 대한 URL 생성"""
    if IS_LOCAL:
        endpoint = get_endpoint_url()
        return f"{endpoint}/{S3_BUCKET_NAME}/{key}"
    else:
        return f"https://{S3_BUCKET_NAME}.s3.amazonaws.com/{key}"

def download_from_s3(key, local_path=None):
    """S3에서 파일 다운로드"""
    s3_client = get_aws_client('s3')
    
    if local_path is None:
        # 파일 내용을 메모리에 로드
        response = s3_client.get_object(
            Bucket=S3_BUCKET_NAME,
            Key=key
        )
        content = response['Body'].read().decode('utf-8')
        
        try:
            return json.loads(content)
        except:
            return content
    else:
        # 파일을 로컬에 다운로드
        s3_client.download_file(
            S3_BUCKET_NAME,
            key,
            local_path
        )
        return local_path
