#!/usr/bin/env python3

import requests
import json

BASE_URL = "http://localhost:5001"

def login(email, password):
    session = requests.Session()
    
    # Get CSRF token
    response = session.get(f"{BASE_URL}/login")
    
    # Login
    login_data = {
        "email": email,
        "password": password
    }
    
    response = session.post(f"{BASE_URL}/remote_user_auth", data=login_data)
    if response.status_code == 200:
        print(f"✅ Successfully logged in as {email}")
        return session
    else:
        print(f"❌ Failed to login as {email}: {response.status_code}")
        print(response.text)
        return None

def test_dashboard_access(session, email):
    print(f"\n🧪 Testing dashboard access for {email}")
    
    # Test session info
    response = session.get(f"{BASE_URL}/api/session")
    if response.status_code == 200:
        user_info = response.json()
        print(f"✅ User info: {user_info.get('name')} ({user_info.get('email')})")
        print(f"   Is dashboard only: {user_info.get('is_dashboard_only_user', False)}")
        print(f"   Groups: {user_info.get('groups', [])}")
    else:
        print(f"❌ Failed to get session info: {response.status_code}")
        return
    
    # Test dashboards list
    response = session.get(f"{BASE_URL}/api/dashboards")
    if response.status_code == 200:
        dashboards = response.json()
        print(f"✅ Can access dashboards API. Found {len(dashboards)} dashboards")
        if dashboards:
            for dashboard in dashboards[:3]:  # Show first 3
                print(f"   - {dashboard['id']}: {dashboard['name']}")
    else:
        print(f"❌ Failed to access dashboards: {response.status_code}")
        print(response.text[:200])
        return
    
    # Test specific dashboard access
    if dashboards:
        dashboard_id = dashboards[0]['id']
        response = session.get(f"{BASE_URL}/api/dashboards/{dashboard_id}")
        if response.status_code == 200:
            dashboard = response.json()
            print(f"✅ Can access dashboard {dashboard_id}: {dashboard['name']}")
            print(f"   Widgets: {len(dashboard.get('widgets', []))}")
            print(f"   Can edit: {dashboard.get('can_edit', False)}")
            print(f"   Has API key: {'api_key' in dashboard}")
        else:
            print(f"❌ Failed to access dashboard {dashboard_id}: {response.status_code}")
            print(response.text[:200])

def main():
    print("🚀 Testing Dashboard-Only User Functionality")
    print("=" * 50)
    
    # Test admin user
    admin_session = login("admin@redash.test", "admin123")
    if admin_session:
        test_dashboard_access(admin_session, "admin@redash.test")
    
    # Test dashboard-only user
    test_session = login("test@example.com", "test123")
    if test_session:
        test_dashboard_access(test_session, "test@example.com")

if __name__ == "__main__":
    main() 