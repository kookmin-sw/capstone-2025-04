# Use the official Python 3.12 slim image.
FROM python:3.12-slim

# Install boto3 for S3 access
RUN pip install --no-cache-dir boto3

# Set the working directory in the container.
WORKDIR /app

# Copy the Python script into the container.
COPY run_generator.py .

# Make the script executable (optional, depends on how it's run).
# RUN chmod +x run_generator.py

# Set the entrypoint command to run the Python script.
# The script will read the code from the GENERATOR_CODE environment variable.
CMD ["python", "run_generator.py"] 