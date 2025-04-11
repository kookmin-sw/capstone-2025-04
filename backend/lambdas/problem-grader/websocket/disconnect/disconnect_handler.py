# websocket/disconnect/disconnect_handler.py
import json

def handler(event, context):
    """Handles WebSocket disconnection events."""
    connection_id = event['requestContext'].get('connectionId')
    print(f"Disconnect requested from: {connection_id}")

    # TODO: Add logic here to remove the connection ID from storage (e.g., DynamoDB).

    # Return a successful response for API Gateway (Full proxy format)
    return {
        'statusCode': 200,
        'body': "" # Simple string body
    } 