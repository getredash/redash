# Dashboard-Only Users Feature

This feature allows you to create users in Redash who can only view specific dashboards they've been granted permission to, without being able to see queries, alerts, or other functionality.

## Features

1. **Dashboard-only viewer role**: Users in dashboard-only groups can only access dashboards
2. **Explicit permissions**: Users can only see dashboards they've been explicitly given permissions to
3. **Restricted interface**: Home page and navigation only show dashboards, no queries or alerts
4. **Public view mode**: Dashboard-only users see dashboards in a read-only public view mode
5. **Authenticated access**: Users must still be logged in (no actual public links)

## Setup

### 1. Create a Dashboard-Only Group

Use the CLI command to create a dashboard-only group:

```bash
python manage.py create-dashboard-only-group default "Dashboard Viewers"
```

### 2. Add Users to Dashboard-Only Group

Add users to the dashboard-only group:

```bash
python manage.py add-user-to-dashboard-only-group default user@example.com "Dashboard Viewers"
```

### 3. Grant Dashboard Permissions

Grant specific dashboard view permissions to dashboard-only users:

```bash
python manage.py grant-dashboard-permission default user@example.com 123
```

Where `123` is the dashboard ID.

## API Usage

### Managing Dashboard Permissions via API

#### List Dashboard Permissions
```http
GET /api/dashboards/{dashboard_id}/permissions
```

#### Grant Dashboard Permission
```http
POST /api/dashboards/{dashboard_id}/permissions
Content-Type: application/json

{
  "user_id": 456,
  "access_type": "view"
}
```

#### Revoke Dashboard Permission
```http
DELETE /api/dashboards/{dashboard_id}/permissions/{permission_id}
```

## User Experience

### For Dashboard-Only Users:

1. **Login**: Users log in normally with their credentials
2. **Home Page**: Shows only favorite dashboards (no queries or alerts)
3. **Navigation**: Only displays "Dashboards" in the navigation menu
4. **Dashboard View**: Dashboards appear in read-only mode with parameter controls but no query access
5. **No Create/Edit**: Cannot create new dashboards, queries, or alerts

### For Administrators:

1. **User Management**: Create dashboard-only groups and assign users
2. **Permission Management**: Grant/revoke dashboard access via API or CLI
3. **Dashboard Sharing**: Control which dashboards dashboard-only users can see

## Implementation Details

### Backend Changes:

- Added `DASHBOARD_ONLY_GROUP` type and `DASHBOARD_ONLY_PERMISSIONS` to Group model
- Added `is_dashboard_only_user()` method to User model
- Modified dashboard listing to filter by explicit permissions for dashboard-only users
- Added dashboard permission management API endpoints
- Dashboard-only users see dashboards using the public dashboard serialization

### Frontend Changes:

- Modified home page to hide queries for dashboard-only users
- Updated navigation to hide queries and alerts for dashboard-only users
- Disabled create buttons for dashboard-only users
- Dashboard display uses read-only public view mode

## Security Considerations

1. Dashboard-only users must be authenticated (no anonymous access)
2. Permissions are explicit - users only see dashboards they're specifically granted access to
3. No access to underlying queries or data sources
4. Cannot create, edit, or delete any resources
5. Cannot see other users' content unless explicitly permitted

## Troubleshooting

### User Can't See Any Dashboards
- Verify user is in a dashboard-only group
- Check that dashboard permissions have been granted
- Ensure dashboards are not in draft mode

### User Can Still See Queries
- Verify user is only in dashboard-only groups
- Check user permissions don't include query-related permissions

### Dashboard Not Loading
- Verify dashboard exists and is not archived
- Check dashboard permissions are correctly set
- Ensure user has view permission for the specific dashboard 