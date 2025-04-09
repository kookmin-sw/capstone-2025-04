import json
import os
import boto3
from botocore.exceptions import ClientError, ReadTimeoutError
import time

# 환경 변수
SUBMISSIONS_TABLE_NAME = os.environ.get('SUBMISSIONS_TABLE_NAME', 'Submissions')
dynamodb_client = boto3.client('dynamodb')
s3_client = boto3.client('s3')

def get_result_from_s3(s3_location):
    """S3에서 결과 JSON을 다운로드하고 파싱합니다."""
    try:
        bucket = s3_location['Bucket']
        key = s3_location['Key']
        response = s3_client.get_object(Bucket=bucket, Key=key)
        result_content = response['Body'].read().decode('utf-8')
        return json.loads(result_content)
    except (ClientError, KeyError, json.JSONDecodeError, ReadTimeoutError) as e:
        print(f"S3에서 결과를 가져오거나 파싱하는 중 오류 발생 ({s3_location}): {e}")
        # runner.py 출력과 일관된 오류 구조 반환
        return {
            "status": "SystemError",
            "stderr": f"S3에서 결과를 가져오지 못했습니다: {e}",
            "stdout": "",
            "executionTime": -1,
            "memoryUsage": -1,
            "testcaseId": s3_location.get('Key', 'unknown').split('/')[-1].replace('.json', '') # 키에서 testcaseId 추출 시도
        }

def lambda_handler(event, context):
    """Step Functions Map 상태의 결과를 처리합니다."""
    print(f"이벤트 수신: {json.dumps(event)}")

    # --- 원본 입력 및 작업 결과 추출 ---
    original_input = event.get('originalInput', {})
    # SFN Map 상태의 taskResults는 각 반복의 출력을 포함
    # 각 출력은 {"resultS3Location": ...} 또는 원시 결과 JSON일 것으로 예상됨
    raw_task_outputs = event.get('taskResults', [])

    submission_id = original_input.get('submissionId')
    problem_id = original_input.get('problemId')
    user_id = original_input.get('userId')
    code = original_input.get('code') # 최종 레코드에 필요할 수 있음
    language = original_input.get('language')

    if not submission_id or not isinstance(raw_task_outputs, list):
        print("오류: submissionId가 없거나 taskResults가 리스트가 아닙니다.")
        raise ValueError("결과 처리 람다에 대한 입력 형식이 잘못되었습니다.")

    # --- 작업 결과 처리 (필요시 S3에서 가져오기) --- 
    task_results_data = []
    for task_output in raw_task_outputs:
        if isinstance(task_output, dict) and 'resultS3Location' in task_output:
            s3_location = task_output['resultS3Location']
            # testcaseId가 연결되어 있는지 확인 (SFN 통해 전달 또는 키에서 파생)
            result_data = get_result_from_s3(s3_location)
            if 'testcaseId' not in result_data and 'Key' in s3_location:
                 try:
                     # S3 키 형식: {prefix}/{submissionId}/{testcaseId}.json
                     result_data['testcaseId'] = int(s3_location['Key'].split('/')[-1].replace('.json', ''))
                 except (ValueError, IndexError, AttributeError):
                     print(f"S3 키에서 testcaseId를 안정적으로 결정할 수 없습니다: {s3_location.get('Key')}")
                     result_data['testcaseId'] = -1 # 알 수 없음 표시
            task_results_data.append(result_data)
        elif isinstance(task_output, dict) and 'status' in task_output: # 원시 결과 폴백 또는 Fargate 오류 처리
            # Handle Fargate Error 출력 시 testcaseId가 있을 수 있음
            if 'testcaseId' not in task_output:
                 task_output['testcaseId'] = -1 # 없는 경우 알 수 없음 표시
            task_results_data.append(task_output)
        else:
             print(f"경고: 인식할 수 없는 작업 출력 형식: {task_output}")
             # 오류 결과 추가
             task_results_data.append({"status": "SystemError", "stderr": "잘못된 작업 출력 형식", "testcaseId": -1})

    # --- 결과 평가 --- 
    processed_results = []
    overall_status = "Accepted" # 초기 가정
    total_score = 0
    total_testcases = len(task_results_data)
    passed_testcases = 0

    # 순서가 보장되지 않을 수 있으므로 testcaseId로 결과 정렬
    task_results_data.sort(key=lambda x: x.get('testcaseId', -1))

    for result in task_results_data:
        testcase_id = result.get('testcaseId', -1) # ID가 없으면 -1 사용
        
        # --- 결과 데이터 파싱 (S3에서 가져왔거나 직접 전달됨) --- 
        fargate_status = result.get('status', 'SystemError') # status가 없으면 SystemError 기본값
        stdout = result.get('stdout', '')
        stderr = result.get('stderr', '')
        exec_time = result.get('executionTime', -1)
        mem_usage = result.get('memoryUsage', -1)
        expected_output = result.get('expectedOutput', '') # runner.py에서 전달됨

        # --- 테스트 케이스 상태 결정 --- 
        testcase_status = "WrongAnswer" # 기본값: 오답
        if fargate_status == "Completed":
            # 간단한 정확히 일치 비교 (양쪽 공백 제거)
            if stdout.strip() == expected_output.strip():
                testcase_status = "Accepted" # 정답
                passed_testcases += 1
            else:
                testcase_status = "WrongAnswer" # 오답
        elif fargate_status == "TimeLimitExceeded":
            testcase_status = "TimeLimitExceeded" # 시간 초과
            if overall_status == "Accepted": overall_status = "TimeLimitExceeded"
        elif fargate_status == "MemoryLimitExceeded":
            testcase_status = "MemoryLimitExceeded" # 메모리 초과
            if overall_status == "Accepted": overall_status = "MemoryLimitExceeded"
        elif fargate_status == "RuntimeError":
            testcase_status = "RuntimeError" # 런타임 에러
            if overall_status == "Accepted": overall_status = "RuntimeError"
        elif fargate_status == "CompileError":
            testcase_status = "CompileError" # 컴파일 에러
            overall_status = "CompileError"
            # 컴파일 에러 시 조기 중단? 보통은 그렇다.
            # processed_results.append({...}); break # 결과 추가하고 다른 처리 중단
        elif fargate_status == "FargateTaskFailed": # SFN Catch 블록에서
            testcase_status = "SystemError" # 또는 $.errorInfo 기반의 특정 오류
            if overall_status == "Accepted": overall_status = "SystemError"
        else: # SystemError, ExecutionError, UnknownError 등
            testcase_status = fargate_status # 보고된 상태 사용
            if overall_status == "Accepted": overall_status = testcase_status
            
        # 우선순위에 따라 전체 상태 업데이트 (컴파일 > 시스템 > 시간/메모리/런타임 > 오답 > 정답)
        status_priority = {"CompileError": 5, "SystemError": 4, "TimeLimitExceeded": 3, "MemoryLimitExceeded": 3, "RuntimeError": 3, "WrongAnswer": 2, "Accepted": 1}
        if status_priority.get(testcase_status, 0) > status_priority.get(overall_status, 0):
             overall_status = testcase_status

        processed_results.append({
            'testcaseId': testcase_id,
            'status': testcase_status,
            'executionTime': exec_time,
            'memoryUsage': mem_usage,
            # 디버깅을 위해 stdout/stderr 선택적으로 포함 (크기 제한 유의)
            # 'stdout': stdout[:1000], # 필요시 자르기
            # 'stderr': stderr[:1000]
        })

    # 점수 계산
    if overall_status in ["Accepted", "WrongAnswer"] and total_testcases > 0:
         total_score = round((passed_testcases / total_testcases) * 100)
    elif overall_status != "CompileError": # 컴파일 에러 제외 TLE, MLE, RE, 시스템 오류는 0점
        total_score = 0
    # 컴파일 에러 시 점수는 초기값 0 유지

    # --- 최종 결과를 Submissions 테이블에 저장 --- 
    timestamp_ms = str(int(time.time() * 1000)) # 밀리초 타임스탬프 사용
    submitted_at_ms = original_input.get('submittedAt', timestamp_ms) # api 람다에서 ms 단위로 전달받을 것으로 예상
    
    item_to_save = {
        'submissionId': {'S': submission_id},
        'problemId': {'S': problem_id},
        'userId': {'S': user_id},
        'language': {'S': language},
        'code': {'S': code}, # 제출된 코드 저장
        'status': {'S': overall_status},
        'score': {'N': str(total_score)},
        'results': {'S': json.dumps(processed_results)}, # 상세 결과를 JSON 문자열로 저장
        'submittedAt': {'N': submitted_at_ms}, # 숫자로 저장
        'completedAt': {'N': timestamp_ms}    # 숫자로 저장
    }

    try:
        dynamodb_client.put_item(
            TableName=SUBMISSIONS_TABLE_NAME,
            Item=item_to_save
        )
        print(f"제출 {submission_id} 결과를 DynamoDB에 성공적으로 저장했습니다.")
        # 최종 상태와 점수를 반환 (Step Function의 출력이 될 수 있음)
        return {
            'submissionId': submission_id,
            'status': overall_status,
            'score': total_score
        }
    except ClientError as e:
        print(f"제출 결과 DynamoDB 저장 오류: {e.response['Error']['Message']}")
        # Step Function 실행을 실패시키기 위해 오류 발생
        raise e
    except Exception as e:
        print(f"제출 결과 저장 중 예기치 않은 오류 발생: {e}")
        raise e 