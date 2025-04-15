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
utils_dir = str(Path(__file__).parent.parent.parent / "utils")
if utils_dir not in sys.path:
    sys.path.insert(0, utils_dir)

# AWS 유틸리티 함수 임포트
try:
    from utils.aws_utils import (
        upload_to_s3,
        delete_message_from_sqs,
        update_job_status,
        generate_s3_url,
    )
except ImportError:
    print("Error: Cannot import aws_utils, check if the module exists")

# 브릿지 모듈을 통해 problem-generator의 기능 가져오기
try:
    from utils.model_manager_bridge import generate_problem, get_api_key
except ImportError:
    print("Error: Cannot import model_manager_bridge, check if the module exists")

# 환경 변수에서 설정 가져오기
RESULT_BUCKET = os.environ.get("RESULT_BUCKET", "problem-generator-results")
RESULT_PREFIX = os.environ.get("RESULT_PREFIX", "results/")


def handler(event, context):
    """Lambda 함수 핸들러: Batch Job 이벤트 처리"""
    # api_key = os.environ.get("GOOGLE_AI_API_KEY") # 제거
    s3_client = boto3.client("s3")
    sqs_client = boto3.client("sqs")
    job_queue_url = os.environ.get("JOB_QUEUE_URL")

    # if not api_key: # 제거
    #     print("Error: GOOGLE_AI_API_KEY environment variable is not set.")
    #     return {'statusCode': 500, 'body': json.dumps({'error': 'API key is not configured'})}

    if not job_queue_url:
        print("Error: JOB_QUEUE_URL environment variable is not set.")
        # 실패 처리 로직 (예: CW Alarm)
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "SQS queue URL is not configured"}),
        }

    print(f"Received event: {json.dumps(event)}")

    # Batch 작업 배열의 경우 jobs 키 확인
    if "jobs" in event:
        # 실제로는 하나의 작업만 처리한다고 가정 (Batch Job 배열 크기 1)
        job_data = event["jobs"][0]
        problemId = job_data.get("jobId")
        parameters = job_data.get("parameters", {})
        result_bucket_name = parameters.get("result_bucket_name")
        result_object_key = parameters.get("result_object_key")
        algorithm_type = parameters.get("algorithm_type")
        difficulty = parameters.get("difficulty")
    else:
        # SQS 메시지에서 데이터 추출 (CloudWatch Event를 통한 재시도 시)
        if "Records" not in event:
            print(
                "Error: Invalid event format. Expected 'jobs' key for Batch or 'Records' for SQS."
            )
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Invalid event format"}),
            }

        try:
            sqs_body = json.loads(event["Records"][0]["body"])
            problemId = sqs_body.get("problemId")  # 이전 시도의 Job ID 사용
            result_bucket_name = sqs_body.get("result_bucket_name")
            result_object_key = sqs_body.get("result_object_key")
            algorithm_type = sqs_body.get("algorithm_type")
            difficulty = sqs_body.get("difficulty")
        except (json.JSONDecodeError, KeyError, IndexError) as e:
            print(f"Error parsing SQS message body: {e}")
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Failed to parse SQS message"}),
            }

    # 필수 파라미터 검증
    if not all(
        [problemId, result_bucket_name, result_object_key, algorithm_type, difficulty]
    ):
        error_msg = "Missing required parameters in job data or SQS message"
        print(f"Error: {error_msg}")
        # 실패 처리: 상태 업데이트 또는 알림 (여기서는 로깅만)
        update_job_status(problemId, "FAILED", error_message=error_msg)
        return {"statusCode": 400, "body": json.dumps({"error": error_msg})}

    print(f"Processing job: {problemId} for {algorithm_type} ({difficulty})")
    update_job_status(problemId, "RUNNING")

    try:
        # 문제 생성 로직 호출 (model_manager_bridge 사용)
        # api_key 인자 제거
        problem_result = generate_problem(
            api_key=None,  # None 전달 또는 제거
            algorithm_type=algorithm_type,
            difficulty=difficulty,
            verbose=True,  # 상세 로그 활성화
        )

        # 결과 확인 및 S3 업로드
        if not problem_result or problem_result.get("error"):
            error_details = problem_result.get(
                "error", "Unknown error during problem generation"
            )
            print(f"Job {problemId} failed: {error_details}")
            update_job_status(problemId, "FAILED", error_message=error_details)
            # 실패 시 재시도 로직 (SQS DLQ 활용)
            # 여기서는 Lambda 실패로 처리 (Batch가 재시도 구성 가능)
            raise Exception(f"Problem generation failed: {error_details}")

        print(f"Job {problemId} completed successfully. Uploading result to S3...")
        s3_client.put_object(
            Bucket=result_bucket_name,
            Key=result_object_key,
            Body=json.dumps(problem_result, ensure_ascii=False, indent=2),
            ContentType="application/json",
        )

        print(
            f"Successfully uploaded result for job {problemId} to s3://{result_bucket_name}/{result_object_key}"
        )
        update_job_status(problemId, "SUCCEEDED")

        return {
            "statusCode": 200,
            "body": json.dumps(
                {"message": "Job processed successfully", "jobId": problemId}
            ),
        }

    except Exception as e:
        print(f"Error processing job {problemId}: {traceback.format_exc()}")
        error_message = f"Error processing job: {str(e)}"
        update_job_status(problemId, "FAILED", error_message=error_message)
        # 실패 시 Lambda 자체 재시도 또는 Batch/SQS 재시도 메커니즘에 의존
        # 필요시 SQS DLQ로 메시지 전송 로직 추가
        raise e  # Lambda가 실패로 처리하도록 예외 다시 발생


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
    problemId = job_data.get("problemId", str(uuid.uuid4()))
    algorithm_type = job_data.get("algorithm_type")
    difficulty = job_data.get("difficulty")

    if not algorithm_type or not difficulty:
        error_msg = "Missing required parameters: algorithm_type and difficulty"
        print(error_msg)
        return {
            "problemId": problemId,
            "status": "FAILED",
            "error": error_msg,
            "completed_at": int(time.time()),
        }

    # API 키 설정
    api_key = job_data.get("api_key")
    try:
        api_key = get_api_key(api_key)
    except ValueError as e:
        print(f"API key error: {str(e)}")
        return {
            "problemId": problemId,
            "status": "FAILED",
            "error": str(e),
            "completed_at": int(time.time()),
        }

    # 문제 생성 실행
    try:
        print(
            f"Generating problem with algorithm_type={algorithm_type}, difficulty={difficulty}"
        )

        # 브릿지 모듈을 통해 problem-generator의 generate_problem 함수 호출
        result = generate_problem(
            api_key=api_key,
            algorithm_type=algorithm_type,
            difficulty=difficulty,
            verbose=True,
        )

        # 생성된 문제가 구조화된 JSON인지 확인
        if not isinstance(result, dict):
            raise ValueError("Problem generator did not return a valid result object")

        # 구조화된 문제 객체에서 핵심 컴포넌트 추출 및 보강
        problem_data = result.get("generated_problem", {})

        # 문제 관련 메타데이터 추가
        enhanced_result = {
            "problemId": problemId,
            "status": "COMPLETED",
            "algorithm_type": algorithm_type,
            "difficulty": difficulty,
            "template_used": result.get("template_used", ""),
            "processing_time": time.time() - start_time,
            "generation_time": result.get("generation_time", 0),
            "completed_at": int(time.time()),
            "problem": enhance_problem_data(problem_data, algorithm_type, difficulty),
        }

        print(f"Problem generation completed successfully for problemId: {problemId}")
        return enhanced_result

    except Exception as e:
        error_msg = str(e)
        print(f"Error generating problem: {error_msg}")
        traceback.print_exc()

        return {
            "problemId": problemId,
            "status": "FAILED",
            "error": error_msg,
            "algorithm_type": algorithm_type,
            "difficulty": difficulty,
            "completed_at": int(time.time()),
        }


def enhance_problem_data(problem_data, algorithm_type, difficulty):
    """
    문제 데이터를 보강하여 필요한 필드를 추가하고 일관된 형식을 갖추도록 합니다.

    Args:
        problem_data (dict): generate_problem 함수에서 반환한 문제 데이터
        algorithm_type (str): 알고리즘 유형
        difficulty (str): 난이도

    Returns:
        dict: 보강된 문제 데이터
    """
    # 문제 데이터가 문자열인 경우 (기존 방식에서 생성된 경우)
    if isinstance(problem_data, str):
        return {
            "title": f"{algorithm_type} {difficulty} 문제",
            "algorithm_type": algorithm_type,
            "difficulty": difficulty,
            "full_text": problem_data,
        }

    # 문제 데이터가 없거나 잘못된 형식인 경우
    if not isinstance(problem_data, dict):
        return {
            "title": f"{algorithm_type} {difficulty} 문제",
            "algorithm_type": algorithm_type,
            "difficulty": difficulty,
            "error": "Invalid problem data format",
        }

    # 필수 필드 확인 및 기본값 설정
    enhanced_data = problem_data.copy()

    # 기본 메타데이터 설정
    if "title" not in enhanced_data:
        enhanced_data["title"] = f"{algorithm_type} {difficulty} 문제"
    if "algorithm_type" not in enhanced_data:
        enhanced_data["algorithm_type"] = algorithm_type
    if "difficulty" not in enhanced_data:
        enhanced_data["difficulty"] = difficulty

    # JSON 구조화 확인
    has_structured_content = any(
        key in enhanced_data
        for key in [
            "description",
            "input_description",
            "output_description",
            "examples",
            "solution_code",
            "test_generator_code",
        ]
    )

    # 텍스트 형식만 있고 구조화된 내용이 없는 경우
    if not has_structured_content and "full_text" in enhanced_data:
        print("Notice: Problem has only full_text without structured content")

    # 객체 형태의 표준화
    if enhanced_data.get("examples") and not isinstance(
        enhanced_data["examples"], list
    ):
        try:
            enhanced_data["examples"] = [json.loads(enhanced_data["examples"])]
        except:
            enhanced_data["examples"] = [{"input": enhanced_data["examples"]}]

    return enhanced_data


def upload_result_to_s3(result, result_key):
    """
    처리 결과를 S3에 저장

    Args:
        result (dict): 저장할 결과 데이터
        result_key (str): S3 객체 키
    """
    try:
        # 결과를 S3에 저장
        upload_to_s3(
            content=result, object_key=result_key, content_type="application/json"
        )

        print(f"Result uploaded to S3: s3://{RESULT_BUCKET}/{result_key}")

    except Exception as e:
        print(f"Error uploading result to S3: {str(e)}")
        traceback.print_exc()


# 로컬 테스트용 코드
if __name__ == "__main__":
    # 테스트 이벤트 생성
    test_event = {
        "Records": [
            {
                "body": json.dumps(
                    {
                        "problemId": str(uuid.uuid4()),
                        "algorithm_type": "구현",
                        "difficulty": "쉬움",
                    }
                )
            }
        ]
    }

    # 핸들러 함수 호출
    handler(test_event, None)
