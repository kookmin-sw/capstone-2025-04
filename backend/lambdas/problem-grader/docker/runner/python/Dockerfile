# Use the official Python 3.12 slim image.
FROM python:3.12-slim

# Install timeout utility and boto3
RUN apt-get update && \
    apt-get install -y coreutils && \
    pip install --no-cache-dir boto3 && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory in the container.
WORKDIR /app

# Copy the execution script into the container.
COPY run_code.py .

# Define the entrypoint. It expects USER_CODE, INPUT_DATA, TIME_LIMIT as env vars.
CMD ["python", "run_code.py"] 