# websocket/connect/connect_handler.py
import json

def handler(event, context):
    """Handles WebSocket connection events."""
    connection_id = event['requestContext'].get('connectionId')
    print(f"Connect requested from: {connection_id}")

    # TODO: Add logic here to store the connection ID if needed, e.g., in DynamoDB.

    # Return a successful response for API Gateway (Full proxy format)
    return {
        'statusCode': 200,
        'body': "" # Simple string body is fine
    } 