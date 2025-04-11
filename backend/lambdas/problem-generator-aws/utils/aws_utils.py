import boto3
import json
import os
import sys
import time
import requests
from pathlib import Path
import uuid
from botocore.exceptions import ClientError
from datetime import datetime, timezone

# 상위 디렉토리에서 config 임포트할 수 있도록 경로 추가
parent_dir = str(Path(__file__).parent.parent)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from config import (
    get_endpoint_url,
    get_queue_url,
    initialize_s3_bucket,
    initialize_dynamodb_table,
    SQS_QUEUE_NAME,
    S3_BUCKET_NAME,
    DYNAMODB_TABLE_NAME,
    REGION,
    IS_LOCAL,
    LOCALSTACK_HOSTNAME,
    LOCALSTACK_PORT,
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
                services = data.get("services", {})
                # SQS와 S3 서비스 상태 확인
                sqs_status = services.get("sqs")
                s3_status = services.get("s3")
                if sqs_status in ["running", "available"] and s3_status in [
                    "running",
                    "available",
                ]:
                    print("LocalStack SQS and S3 are ready!")
                    return True
                else:
                    print(
                        f"LocalStack services status - SQS: {sqs_status}, S3: {s3_status}"
                    )
            else:
                print(
                    f"LocalStack health check returned status code: {response.status_code}"
                )
        except Exception as e:
            print(f"Retry {retry+1}/{max_retries}: LocalStack not ready yet: {str(e)}")

        time.sleep(retry_delay)

    print("Failed to connect to LocalStack after maximum retries")
    return False


# AWS 클라이언트 초기화 (Localstack 환경 지원)
def get_aws_client(service_name, max_retries=3):
    """AWS 클라이언트를 생성하고 반환하는 함수 (Localstack 또는 실제 AWS)"""
    endpoint_url = get_endpoint_url() if IS_LOCAL else None

    if IS_LOCAL:
        wait_for_localstack()

    retry_count = 0
    while retry_count < max_retries:
        try:
            client = boto3.client(
                service_name,
                endpoint_url=endpoint_url,
                region_name=REGION,
                # Localstack용 더미 자격 증명 (실제 AWS에서는 무시됨)
                aws_access_key_id="test" if IS_LOCAL else None,
                aws_secret_access_key="test" if IS_LOCAL else None,
            )

            # 간단한 작업으로 연결 테스트 (서비스별로 다름)
            if service_name == "sqs":
                try:
                    client.list_queues(MaxResults=1)
                except Exception as e:
                    if "AccessDenied" not in str(
                        e
                    ):  # 접근 권한 오류는 연결은 된 것으로 간주
                        raise
            elif service_name == "s3":
                try:
                    client.list_buckets()
                except Exception as e:
                    if "AccessDenied" not in str(e):
                        raise

            return client
        except Exception as e:
            retry_count += 1
            if retry_count >= max_retries:
                print(
                    f"Failed to create AWS client for {service_name} after {max_retries} retries"
                )
                raise
            else:
                print(f"Retrying AWS client creation for {service_name}: {str(e)}")
                time.sleep(2)


# SQS 큐에 메시지 전송
def send_message_to_sqs(message_body):
    """메시지를 SQS 큐에 전송하는 함수"""
    sqs_client = get_aws_client("sqs")
    queue_url = get_queue_url(sqs_client)

    # 문자열이 아닌 경우 JSON으로 변환
    if not isinstance(message_body, str):
        message_body = json.dumps(message_body)

    response = sqs_client.send_message(QueueUrl=queue_url, MessageBody=message_body)
    return response["MessageId"]


# S3에 파일 업로드
def upload_to_s3(content, object_key=None, content_type="application/json"):
    """콘텐츠를 S3 버킷에 업로드하는 함수"""
    s3_client = get_aws_client("s3")
    initialize_s3_bucket(s3_client)

    # 객체 키가 없으면 UUID 생성
    if object_key is None:
        object_key = f"problem-{uuid.uuid4()}.json"

    # 문자열이 아닌 경우 JSON으로 변환
    if not isinstance(content, str):
        content = json.dumps(content)

    s3_client.put_object(
        Bucket=S3_BUCKET_NAME, Key=object_key, Body=content, ContentType=content_type
    )

    # S3 객체에 대한 URL 반환
    if IS_LOCAL:
        return f"{get_endpoint_url()}/{S3_BUCKET_NAME}/{object_key}"
    else:
        return f"https://{S3_BUCKET_NAME}.s3.amazonaws.com/{object_key}"


# S3에서 객체 URL 생성
def generate_s3_url(object_key):
    """S3 객체에 대한 URL을 생성하는 함수"""
    if IS_LOCAL:
        return f"{get_endpoint_url()}/{S3_BUCKET_NAME}/{object_key}"
    else:
        return f"https://{S3_BUCKET_NAME}.s3.amazonaws.com/{object_key}"


# SQS에서 메시지 수신
def receive_message_from_sqs():
    """SQS 큐에서 메시지를 수신하는 함수"""
    sqs_client = get_aws_client("sqs")
    queue_url = get_queue_url(sqs_client)

    response = sqs_client.receive_message(
        QueueUrl=queue_url, MaxNumberOfMessages=1, WaitTimeSeconds=1  # 짧은 폴링 시간
    )

    messages = response.get("Messages", [])
    if not messages:
        return None

    message = messages[0]
    receipt_handle = message["ReceiptHandle"]

    # 메시지 본문 파싱
    try:
        body = json.loads(message["Body"])
    except:
        body = message["Body"]

    return {"body": body, "receipt_handle": receipt_handle}


# SQS 메시지 삭제
def delete_message_from_sqs(receipt_handle):
    """처리 완료된 메시지를 SQS 큐에서 삭제하는 함수"""
    sqs_client = get_aws_client("sqs")
    queue_url = get_queue_url(sqs_client)

    sqs_client.delete_message(QueueUrl=queue_url, ReceiptHandle=receipt_handle)


# DynamoDB 테이블 관련 함수 추가 시작


def get_dynamodb_resource():
    """DynamoDB 리소스를 생성하고 반환하는 함수 (Localstack 또는 실제 AWS)"""
    endpoint_url = get_endpoint_url() if IS_LOCAL else None
    if IS_LOCAL:
        # DynamoDB 서비스 상태도 확인하도록 wait_for_localstack 수정 필요 (추후)
        wait_for_localstack()  # LocalStack 준비 확인

    return boto3.resource(
        "dynamodb",
        endpoint_url=endpoint_url,
        region_name=REGION,
        aws_access_key_id="test" if IS_LOCAL else None,
        aws_secret_access_key="test" if IS_LOCAL else None,
    )


def get_dynamodb_table():
    """DynamoDB 테이블 객체를 반환하는 함수"""
    dynamodb_resource = get_dynamodb_resource()
    # 테이블 초기화 (없으면 생성)
    initialize_dynamodb_table(dynamodb_resource)  # config에서 가져온 함수 호출
    return dynamodb_resource.Table(DYNAMODB_TABLE_NAME)


def add_job_status(problemId, algorithm_type, difficulty):
    """DynamoDB에 새로운 작업 상태를 추가하는 함수"""
    table = get_dynamodb_table()
    timestamp = datetime.now(timezone.utc).isoformat()
    try:
        table.put_item(
            Item={
                "problemId": problemId,
                "status": "QUEUED",
                "algorithm_type": algorithm_type,
                "difficulty": difficulty,
                "request_timestamp": timestamp,
                "last_updated_timestamp": timestamp,
                "result_url": None,
                "error_message": None,
            },
            ConditionExpression="attribute_not_exists(problemId)",  # 이미 존재하는 problemId면 추가하지 않음
        )
        print(f"Job {problemId} status initialized to QUEUED in DynamoDB.")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            print(
                f"Job {problemId} already exists in DynamoDB. Skipping initialization."
            )
        else:
            print(
                f"Error adding job {problemId} to DynamoDB: {e.response['Error']['Message']}"
            )
            raise  # 다른 오류는 전파


def update_job_status(problemId, new_status, result_url=None, error_message=None):
    """DynamoDB에서 작업 상태를 업데이트하는 함수"""
    table = get_dynamodb_table()
    timestamp = datetime.now(timezone.utc).isoformat()
    update_expression = "set #s = :s, last_updated_timestamp = :t"
    expression_attribute_names = {"#s": "status"}
    expression_attribute_values = {":s": new_status, ":t": timestamp}

    # result_url 이나 error_message가 None이 아닐 때만 업데이트
    if result_url is not None:
        update_expression += ", result_url = :ru"
        expression_attribute_values[":ru"] = result_url

    if error_message is not None:
        update_expression += ", error_message = :em"
        expression_attribute_values[":em"] = error_message
    elif result_url is not None:  # 성공적으로 완료되면 error_message 를 null로 설정
        update_expression += " remove error_message"

    try:
        table.update_item(
            Key={"problemId": problemId},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ConditionExpression="attribute_exists(problemId)",  # problemId가 존재할 때만 업데이트
            ReturnValues="UPDATED_NEW",
        )
        print(f"Job {problemId} status updated to {new_status} in DynamoDB.")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            print(f"Job {problemId} does not exist in DynamoDB. Cannot update status.")
        else:
            print(
                f"Error updating job {problemId} status in DynamoDB: {e.response['Error']['Message']}"
            )
            raise  # 다른 오류는 전파


def get_job_status(problemId):
    """DynamoDB에서 작업 상태를 조회하는 함수"""
    table = get_dynamodb_table()
    try:
        response = table.get_item(Key={"problemId": problemId})
        return response.get("Item")
    except ClientError as e:
        print(
            f"Error getting job {problemId} status from DynamoDB: {e.response['Error']['Message']}"
        )
        return None


# DynamoDB 관련 함수 추가 끝
