#yum install python-devel openldap-devel
#pip install python-ldap

#env variables for /opt/redash/.env file
#export REDASH_LDAP_BASE_DN="DC=users,DC=domain,DC=com"
#export REDASH_LDAP_SERVER="ldap://ldap_server:389/"
#export REDASH_LDAP_ADMIN_CN="CN=ldap admin,CN=Users,DC=domain,DC=com"
#export REDASH_LDAP_ADMIN_PASSWORD="admin_pass"
#export REDASH_LDAP_DOMAIN="domain.com"

import logging
import requests
import ldap

from flask import redirect, url_for, Blueprint, flash, request, session, Flask
from flask_login import login_user
from sqlalchemy.orm.exc import NoResultFound

from redash import models, settings
from redash.authentication.org_resolving import current_org

logger = logging.getLogger('ldap_auth')

def get_ldap_connection():
    conn = ldap.initialize(settings.LDAP_SERVER)
    return conn

def ldap_login(username, password):
    filter_query = '(&(objectClass=user)(sAMAccountName='+username+'))'

    conn = get_ldap_connection()
    conn.simple_bind_s(settings.LDAP_ADMIN_CN, settings.LDAP_ADMIN_PASSWORD)
    ldap_result_id = conn.search(settings.LDAP_BASE_DN,ldap.SCOPE_SUBTREE,filter_query)

    result_set = []
    while 1:
        try:
            result_type, result_data = conn.result(ldap_result_id, 0,2)
        except ldap.TIMEOUT:
            break;
        if (result_data == []):
            break
        else:
            if result_type == ldap.RES_SEARCH_ENTRY:
                result_set.append(result_data)
                break

    if len(result_set) == 0:
        return False;
    else:
        try:
            user_conn = ldap.initialize(settings.LDAP_SERVER)
            user_conn = get_ldap_connection()
            user_dn = result_set[0][0][0]
            user_conn.simple_bind_s(user_dn, password)
            return result_set
        except ldap.LDAPError, error_message:
            return False
