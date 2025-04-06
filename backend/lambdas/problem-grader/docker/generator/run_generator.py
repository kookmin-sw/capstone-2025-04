import os
import sys
import json
import traceback
import boto3 # boto3 임포트

# 환경 변수 읽기
generator_code = os.environ.get("GENERATOR_CODE")
s3_bucket = os.environ.get("S3_BUCKET") # S3 버킷 이름
s3_key = os.environ.get("S3_KEY") # S3 결과 파일 경로

if not generator_code:
    print("Error: GENERATOR_CODE environment variable not set.", file=sys.stderr)
    sys.exit(1)
if not s3_bucket or not s3_key:
    print("Error: S3_BUCKET or S3_KEY environment variable not set.", file=sys.stderr)
    sys.exit(1)

# S3 클라이언트 초기화
s3_client = boto3.client('s3')

result_json = "" # 결과를 저장할 변수

try:
    # 코드를 실행할 로컬 및 글로벌 네임스페이스 생성
    local_namespace = {}
    global_namespace = {}

    # 전달받은 코드를 실행하여 함수 정의 등을 네임스페이스에 로드
    exec(generator_code, global_namespace, local_namespace)

    # 정의된 함수 중 generate_test_cases 함수 가져오기
    generate_test_cases_func = local_namespace.get("generate_test_cases")

    if not callable(generate_test_cases_func):
        print("Error: 'generate_test_cases' function not found or not callable in the provided code.", file=sys.stderr)
        sys.exit(1)

    # 테스트 케이스 생성 함수 실행
    test_cases = generate_test_cases_func()
    result_json = json.dumps(test_cases) # 결과를 JSON 문자열로 변환

    # 결과를 S3에 업로드
    s3_client.put_object(
        Bucket=s3_bucket,
        Key=s3_key,
        Body=result_json,
        ContentType='application/json'
    )
    print(f"Successfully uploaded result to s3://{s3_bucket}/{s3_key}")
    # 성공 시 표준 출력은 없거나 성공 메시지만 출력 (Lambda가 stdout을 파싱하지 않으므로)
    sys.exit(0) # 성공 코드로 종료

except Exception as e:
    print(f"Error executing generator code or uploading to S3: {e}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    # 오류 발생 시 S3에 오류 정보 저장 시도 (선택적)
    error_message = {"status": "GENERATOR_ERROR", "message": str(e), "traceback": traceback.format_exc()}
    try:
        s3_client.put_object(
             Bucket=s3_bucket,
             Key=s3_key, # 같은 키에 에러 메시지 덮어쓰기
             Body=json.dumps(error_message),
             ContentType='application/json'
        )
        print(f"Uploaded error details to s3://{s3_bucket}/{s3_key}", file=sys.stderr)
    except Exception as s3_e:
         print(f"Failed to upload error details to S3: {s3_e}", file=sys.stderr)

    sys.exit(1) # 오류 코드로 종료 