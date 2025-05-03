# Base image
FROM python:3.12-slim

# Install coreutils for timeout command and boto3
RUN apt-get update && apt-get install -y --no-install-recommends coreutils && \
    pip install --no-cache-dir boto3 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy the execution script
COPY run_code.py .

# Set the entrypoint
CMD ["python", "run_code.py"] 