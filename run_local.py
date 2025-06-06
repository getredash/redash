#!/usr/bin/env python
"""
Simple script to run Redash locally without Docker
"""
import os
import sys

# Set minimal environment variables
os.environ.setdefault('REDASH_DATABASE_URL', 'postgresql://localhost/redash')
os.environ.setdefault('REDASH_REDIS_URL', 'redis://localhost:6379/0')
os.environ.setdefault('REDASH_SECRET_KEY', 'your-secret-key-here')
os.environ.setdefault('REDASH_COOKIE_SECRET', 'your-cookie-secret-here')
os.environ.setdefault('REDASH_LOG_LEVEL', 'INFO')
os.environ.setdefault('REDASH_HOST', 'http://localhost:5000')

# Disable query runners that have complex dependencies
os.environ['REDASH_DISABLED_QUERY_RUNNERS'] = ','.join([
    'redash.query_runner.yandex_metrica',
    'redash.query_runner.uptycs',
    'redash.query_runner.google_analytics',
    'redash.query_runner.google_spreadsheets',
    'redash.query_runner.databricks',
    'redash.query_runner.snowflake',
    'redash.query_runner.presto',
    'redash.query_runner.vertica',
    'redash.query_runner.cassandra',
    'redash.query_runner.scylla',
    'redash.query_runner.treasuredata',
    'redash.query_runner.sqlite',
    'redash.query_runner.dynamodb_sql',
    'redash.query_runner.mssql',
    'redash.query_runner.memsql',
    'redash.query_runner.mapd',
    'redash.query_runner.jql',
    'redash.query_runner.google_analytics',
    'redash.query_runner.axibase_tsd',
    'redash.query_runner.salesforce',
    'redash.query_runner.qubole',
    'redash.query_runner.db2',
    'redash.query_runner.druid',
    'redash.query_runner.kylin',
    'redash.query_runner.drill',
    'redash.query_runner.uptycs',
    'redash.query_runner.yandex_metrica'
])

if __name__ == '__main__':
    from redash import create_app
    from redash.cli import manager
    
    if len(sys.argv) > 1 and sys.argv[1] == 'create_db':
        # Create database tables
        app = create_app()
        with app.app_context():
            from redash import models
            from redash.models import db
            db.create_all()
            
            # Create default org and admin user
            default_org = models.Organization(name="Default", slug="default", settings={})
            db.session.add(default_org)
            db.session.flush()  # Get the ID
            
            admin_group = models.Group(
                name="admin", 
                permissions=models.Group.ADMIN_PERMISSIONS, 
                org=default_org, 
                type=models.Group.BUILTIN_GROUP
            )
            default_group = models.Group(
                name="default", 
                permissions=models.Group.DEFAULT_PERMISSIONS, 
                org=default_org, 
                type=models.Group.BUILTIN_GROUP
            )
            
            db.session.add(admin_group)
            db.session.add(default_group)
            db.session.flush()  # Get the IDs
            
            # Create admin user
            user = models.User(
                org=default_org,
                name="Admin",
                email="admin@example.com",
                group_ids=[admin_group.id, default_group.id]
            )
            user.hash_password("admin")
            db.session.add(user)
            
            db.session.commit()
            print("Database created successfully!")
            print("Admin user created: admin@example.com / admin")
    else:
        # Run the Flask app
        app = create_app()
        app.run(host='0.0.0.0', port=5000, debug=True) 