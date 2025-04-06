# Use a standard Python 3.9 slim image
FROM python:3.9-slim

# Set working directory explicitly
WORKDIR /var/task

# Copy function code and requirements
COPY lambda_function.py requirements.txt ./

# Install the specified packages and AWS Lambda Runtime Interface Client (RIC)
RUN pip install --no-cache-dir -r requirements.txt awslambdaric

# Set the ENTRYPOINT to use the Lambda Runtime Interface Client, pointing to the handler
ENTRYPOINT [ "/usr/local/bin/python", "-m", "awslambdaric", "lambda_function.lambda_handler" ] 