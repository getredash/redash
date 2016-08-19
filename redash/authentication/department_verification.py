import logging
import requests
from requests.auth import HTTPBasicAuth
from redash import settings

logger = logging.getLogger('department_verification')

def get_user_department(email):
    headers = {"Accept": "application/json"}
    auth = HTTPBasicAuth(settings.BAMBOOHR_API_KEY, 'x')
    response = requests.get('https://api.bamboohr.com/api/gateway.php/appfolio/v1/employees/directory', headers=headers, auth=auth)

    if response.status_code == 401:
        logger.warning("Failed getting user department (response code 401).")
        return None

    for employee in response.json()['employees']:
        if employee['workEmail'] == email:
            return employee['department']

    logger.warning("User email not found in Bamboo employee directory: %s", email)
    return None

def verify_department_membership(org, email):
    department = get_user_department(email)
    if department in org.allowed_departments:
        return True
    else:
        logger.warning("User tried to login from an unauthorized department: %s (department: %s)", email, department)
        return False
