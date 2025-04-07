# Use AWS official Python 3.9 base image for Lambda
FROM public.ecr.aws/lambda/python:3.9

# Set working directory explicitly
WORKDIR ${LAMBDA_TASK_ROOT}

# --- 필요한 소스 코드 복사 (빌드 컨텍스트: problem-generator-streaming/ 기준) ---
# 현재 함수 코드 및 requirements
COPY lambda_function.py requirements.txt ./

# 미리 복사해둔 problem_generator_temp 디렉토리를 이미지 안으로 복사
COPY problem_generator_temp/ ./problem_generator/
# -------------------------------------------------------------

# Install the specified packages from the copied requirements.txt
# The base image might already include awslambdaric, if not, add it to requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Set the CMD to execute your handler function
CMD [ "lambda_function.handler" ] 