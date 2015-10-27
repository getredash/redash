#!/usr/bin/env python
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT


DATABASE_NAME = os.environ.get("REDASH_DATABASE_NAME", "postgres")
DATABASE_HOST = os.environ.get("REDASH_DATABASE_HOST", None)
DATABASE_PORT = os.environ.get("REDASH_DATABASE_PORT", None)
DATABASE_USER = os.environ.get("REDASH_DATABASE_USER", None)
DATABASE_PASSWORD = os.environ.get("REDASH_DATABASE_PASSWORD", None)
DATABASE_USER_ADMIN = os.environ.get("REDASH_DATABASE_USER_ADMIN", None)
DATABASE_PASSWORD_ADMIN = os.environ.get("REDASH_DATABASE_PASSWORD_ADMIN", None)

connection = {}
connection_admin = {}

if DATABASE_NAME is not None:
    connection['database'] = DATABASE_NAME
if DATABASE_HOST is not None:
    connection['host'] = DATABASE_HOST
    connection_admin['host'] = DATABASE_HOST
if DATABASE_PORT is not None:
    connection['port'] = DATABASE_PORT
    connection_admin['port'] = DATABASE_PORT
if DATABASE_USER is not None:
    connection['user'] = DATABASE_USER
if DATABASE_PASSWORD is not None:
    connection['password'] = DATABASE_PASSWORD
if DATABASE_USER_ADMIN is not None:
    connection_admin['user'] = DATABASE_USER_ADMIN
if DATABASE_PASSWORD_ADMIN is not None:
    connection_admin['password'] = DATABASE_PASSWORD_ADMIN

def output(text):
    os.stdout(text+'\n')

def error(text):
    os.stderr(text+'\n')

def fatal(text):
    error(text)
    sys.exit(1)

if sys.argv is None:
    fatal("No argv exists, you're doomed. Python doesn't work as expected !")

if len(sys.argv)<=1:
    fatal("You must provide one argument (either )")

if DATABASE_NAME is None or DATABASE_NAME == '':
    fatal("You must provide a non null database name")

command = sys.argv[1]

if command == 'create_db_and_role':
    conn = psycopg2.connect(**connection_admin)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    cursor.execute("select * from pg_database where datname = %(database_name)s", { 'database_name': DATABASE_NAME })
    databases = cursor.fetchall()
    database_created = False
    if len(databases) == 0:
        cursor.execute("CREATE DATABASE %(database_name)s" % { 'database_name': DATABASE_NAME })
        database_created = True
    if DATABASE_USER is not None:
        cursor.execute("select 1 from pg_roles where rolname = %(role_name)s", { 'role_name': DATABASE_USER })
        role_created = False
        roles = cursor.fetchall()
        if len(roles) == 0:
            if DATABASE_PASSWORD is None:
                cursor.execute("CREATE ROLE %(role_name)s WITH LOGIN CREATEDB" % { 'role_name': DATABASE_USER })
            else:
                cursor.execute("CREATE ROLE %(role_name)s WITH LOGIN CREATEDB PASSWORD '%(role_password)s'" % { 'role_name': DATABASE_USER, 'role_password': DATABASE_PASSWORD })
            role_created = True
        if database_created or role_created:
            cursor.execute("GRANT ALL PRIVILEGES ON DATABASE %(database_name)s to %(role_name)s" % { 'role_name': DATABASE_USER, 'database_name': DATABASE_NAME })

elif command == 'check_database_init':
    conn = psycopg2.connect(**connection)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    cursor.execute("select * from information_schema.tables where table_name='dashboards'")
    tables = cursor.fetchall()
    if len(tables) == 0:
        sys.exit(2)

elif command == 'create_reader_role':
    conn = psycopg2.connect(**connection)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    cursor.execute("select 1 from pg_roles where rolname = 'redash_reader'")
    if len(cursor.fetchall()) == 0:
        cursor.execute("CREATE ROLE redash_reader WITH PASSWORD 'redash_reader' NOCREATEROLE NOCREATEDB NOSUPERUSER LOGIN")
    cursor.execute("grant select(id,name,type) ON data_sources to redash_reader")
    cursor.execute("grant select(id,name) ON users to redash_reader")

elif command == 'check_redash_metadata':
    conn = psycopg2.connect(**connection)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    cursor.execute("select 1 from data_sources where name = %(name)s", { 'name': 're:dash metadata' })
    if len(cursor.fetchall()) == 0:
        sys.exit(2)

else:
    fatal("The argument [%s] isn't recognized as valid parameter for this script" % (command,))

