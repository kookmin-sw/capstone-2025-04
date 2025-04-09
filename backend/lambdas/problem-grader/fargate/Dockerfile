# Base Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the runner script
COPY runner.py .

# Entrypoint for the container
ENTRYPOINT ["python", "runner.py"] 