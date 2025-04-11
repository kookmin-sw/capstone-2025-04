import boto3
import os
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

cognito_client = boto3.client("cognito-idp")
# Get the target group name from environment variables set by Terraform
general_group_name = os.environ["GENERAL_USERS_GROUP_NAME"]


def lambda_handler(event, context):
    """
    Cognito Post Confirmation Trigger.
    Adds the confirmed user to the specified 'GeneralUsers' group.
    """
    logger.info(f"Received event: {event}")

    if event.get("triggerSource") != "PostConfirmation_ConfirmSignUp":
        logger.info(
            f"Trigger source is not PostConfirmation_ConfirmSignUp ({event.get('triggerSource')}). No action needed."
        )
        return event  # Return event for other confirmation types

    user_pool_id = event["userPoolId"]
    user_name = event["userName"]  # Cognito's unique username (often the 'sub')

    logger.info(
        f"User {user_name} confirmed in pool {user_pool_id}. Attempting to add to group '{general_group_name}'."
    )

    try:
        cognito_client.admin_add_user_to_group(
            UserPoolId=user_pool_id, Username=user_name, GroupName=general_group_name
        )
        logger.info(
            f"Successfully added user {user_name} to group '{general_group_name}'"
        )

    except cognito_client.exceptions.UserNotFoundException:
        logger.error(f"User {user_name} not found in the pool during group assignment.")
    except cognito_client.exceptions.ResourceNotFoundException:
        logger.error(
            f"Group '{general_group_name}' or User Pool '{user_pool_id}' not found."
        )
    except Exception as e:
        # Log the error but do not fail the confirmation process itself
        logger.error(
            f"Error adding user {user_name} to group '{general_group_name}': {str(e)}"
        )
        # Depending on requirements, you might want to raise the exception,
        # but typically you don't want group assignment failure to block user confirmation.

    # Return the event object back to Cognito as required
    return event
