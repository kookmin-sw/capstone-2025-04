# Use a standard Python 3.9 slim image
FROM python:3.9-slim

# Set working directory explicitly
WORKDIR /var/task

# --- 필요한 소스 코드 복사 (빌드 컨텍스트: problem-generator-streaming/ 기준) ---
# 현재 함수 코드 및 requirements
COPY lambda_function.py requirements.txt ./

# 미리 복사해둔 problem_generator_temp 디렉토리를 이미지 안으로 복사
COPY problem_generator_temp/ ./problem_generator/
# -------------------------------------------------------------

# Install the specified packages from the copied requirements.txt
# TODO: Check if problem_generator needs its own requirements installed
RUN pip install --no-cache-dir -r requirements.txt awslambdaric

# Set the ENTRYPOINT to use the Lambda Runtime Interface Client
ENTRYPOINT [ "/usr/local/bin/python", "-m", "awslambdaric", "lambda_function.handler" ] 