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
    from utils.aws_utils import upload_to_s3, delete_message_from_sqs, update_job_status, generate_s3_url
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
    print(f"Received event: {json.dumps(event)}")
    
    for record in event['Records']:
        receipt_handle = record['receiptHandle']
        
        try:
            # 메시지 본문 파싱
            if isinstance(record['body'], str):
                body = json.loads(record['body'])
            else:
                body = record.get('body', {})
            
            job_id = body.get('job_id')
            algorithm_type = body.get('algorithm_type')
            difficulty = body.get('difficulty')
            result_object_key = body.get('result_object_key')
            
            if not all([job_id, algorithm_type, difficulty, result_object_key]):
                print(f"Missing required fields in message body: {body}")
                # 메시지 삭제는 하지 않고 오류 로깅만 (데드 레터 큐로 가도록)
                continue

            # DynamoDB 상태를 PROCESSING으로 업데이트
            update_job_status(job_id, 'PROCESSING')

            print(f"Processing job: {job_id} for {algorithm_type} ({difficulty})")
            
            # API 키 가져오기 (환경 변수 우선)
            api_key = get_api_key()
            
            # 문제 생성 로직 호출
            problem_result = generate_problem(api_key, algorithm_type, difficulty, verbose=True)
            
            # 결과 S3에 업로드
            result_url = upload_to_s3(problem_result, object_key=result_object_key)
            print(f"Problem for job {job_id} saved to S3: {result_url}")

            # DynamoDB 상태를 COMPLETED로 업데이트
            update_job_status(job_id, 'COMPLETED', result_url=result_url)
            
            # 성공적으로 처리된 메시지 삭제
            delete_message_from_sqs(receipt_handle)
            print(f"Message with receipt handle {receipt_handle} deleted from SQS.")

        except Exception as e:
            print(f"Error processing message: {str(e)}")
            # 오류 발생 시 job_id 가 있는지 확인 후 DynamoDB 상태 FAILED로 업데이트
            try:
                # 오류 발생 시 본문을 다시 로드 시도 (job_id 추출 목적)
                if isinstance(record.get('body'), str):
                    error_body = json.loads(record['body'])
                else:
                    error_body = record.get('body', {})
                error_job_id = error_body.get('job_id')
                if error_job_id:
                    update_job_status(error_job_id, 'FAILED', error_message=str(e))
                else:
                    print("Could not extract job_id from failed message to update status.")
            except Exception as inner_e:
                print(f"Failed to update job status to FAILED: {inner_e}")
            
            # 메시지 삭제는 하지 않음 (데드 레터 큐로 이동)
            # continue 를 사용하거나, Lambda가 자동으로 재시도하도록 둠 (설정에 따라)
            # 여기서는 명시적으로 오류를 발생시켜 Lambda 재시도를 유도할 수 있음
            # raise e
    
    return {
        'statusCode': 200,
        'body': json.dumps('Processing complete')
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
        result = generate_problem(
            api_key=api_key,
            algorithm_type=algorithm_type, 
            difficulty=difficulty,
            verbose=True
        )
        
        # 생성된 문제가 구조화된 JSON인지 확인
        if not isinstance(result, dict):
            raise ValueError("Problem generator did not return a valid result object")

        # 구조화된 문제 객체에서 핵심 컴포넌트 추출 및 보강
        problem_data = result.get('generated_problem', {})
        
        # 문제 관련 메타데이터 추가
        enhanced_result = {
            'job_id': job_id,
            'status': 'COMPLETED',
            'algorithm_type': algorithm_type,
            'difficulty': difficulty,
            'template_used': result.get('template_used', ''),
            'processing_time': time.time() - start_time,
            'generation_time': result.get('generation_time', 0),
            'completed_at': int(time.time()),
            'problem': enhance_problem_data(problem_data, algorithm_type, difficulty)
        }
        
        print(f"Problem generation completed successfully for job_id: {job_id}")
        return enhanced_result
        
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
            'title': f"{algorithm_type} {difficulty} 문제",
            'algorithm_type': algorithm_type,
            'difficulty': difficulty,
            'full_text': problem_data
        }
    
    # 문제 데이터가 없거나 잘못된 형식인 경우
    if not isinstance(problem_data, dict):
        return {
            'title': f"{algorithm_type} {difficulty} 문제",
            'algorithm_type': algorithm_type,
            'difficulty': difficulty,
            'error': "Invalid problem data format"
        }
    
    # 필수 필드 확인 및 기본값 설정
    enhanced_data = problem_data.copy()
    
    # 기본 메타데이터 설정
    if 'title' not in enhanced_data:
        enhanced_data['title'] = f"{algorithm_type} {difficulty} 문제"
    if 'algorithm_type' not in enhanced_data:
        enhanced_data['algorithm_type'] = algorithm_type
    if 'difficulty' not in enhanced_data:
        enhanced_data['difficulty'] = difficulty
    
    # JSON 구조화 확인
    has_structured_content = any(key in enhanced_data for key in [
        'description', 'input_description', 'output_description',
        'examples', 'solution_code', 'test_generator_code'
    ])
    
    # 텍스트 형식만 있고 구조화된 내용이 없는 경우
    if not has_structured_content and 'full_text' in enhanced_data:
        print("Notice: Problem has only full_text without structured content")
    
    # 객체 형태의 표준화
    if enhanced_data.get('examples') and not isinstance(enhanced_data['examples'], list):
        try:
            enhanced_data['examples'] = [json.loads(enhanced_data['examples'])]
        except:
            enhanced_data['examples'] = [{'input': enhanced_data['examples']}]
    
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
            content=result,
            object_key=result_key,
            content_type='application/json'
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
