import json
import logging
import os
import boto3

logger = logging.getLogger(__name__)


def get_application_config():
    """Fetches application config from SSM Parameter Store.

    Reads the STACKLET_PREFIX environment variable and fetches
    /stacklet/{prefix}/application-config from AWS SSM Parameter Store.

    Returns:
        dict: The application configuration as a JSON object
    """
    stacklet_prefix = os.environ.get("STACKLET_PREFIX") or "dev"
    region = os.environ.get("AWS_REGION")
    param_name = f"/stacklet/{stacklet_prefix}/application-config"

    logger.info(
        f"Fetching SSM parameter: {param_name} from region: {region} (prefix: {stacklet_prefix})"
    )

    client = boto3.client("ssm", region_name=region)

    try:
        response = client.get_parameter(Name=param_name, WithDecryption=True)
        logger.info(f"Successfully fetched parameter: {param_name}")
        # Parse the parameter value as JSON
        return json.loads(response["Parameter"]["Value"])
    except Exception as e:
        logger.error(
            f"Failed to fetch SSM parameter. Name: {param_name}, Region: {region}, "
            f"STACKLET_PREFIX env: {stacklet_prefix}, Error: {str(e)}"
        )
        raise
