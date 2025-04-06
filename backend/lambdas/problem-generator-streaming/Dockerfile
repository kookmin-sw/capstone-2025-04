# Use a standard Python 3.9 slim image
FROM python:3.9-slim

# Set working directory explicitly
WORKDIR /var/task

# Copy function code and requirements
COPY lambda_function.py requirements.txt ./

# problem-generator 모듈 코드 복사 (빌드 컨텍스트 기준 상대 경로)
# ../problem-generator 디렉토리를 이미지 내 /var/task/problem_generator 로 복사
COPY ../problem-generator ./problem_generator/

# Install the specified packages and AWS Lambda Runtime Interface Client (RIC)
RUN pip install --no-cache-dir -r requirements.txt awslambdaric

# Set the ENTRYPOINT to use the Lambda Runtime Interface Client, pointing to the handler
ENTRYPOINT [ "/usr/local/bin/python", "-m", "awslambdaric", "lambda_function.handler" ] 