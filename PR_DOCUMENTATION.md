# RBAC Permission System Enhancements

## Overview
This PR implements a comprehensive set of permission enhancements to strengthen the Role-Based Access Control (RBAC) system in Redash. The changes enforce admin-only default permissions for queries and dashboards, integrate DataSource permissions into the RBAC framework, and restrict sensitive operations to administrators.

## Summary of Changes

### 1. Admin-Only Default Permissions for Queries and Dashboards
**Commits:** `f654b90`, `7f26d04`, `15f9f5c`, `6152ef2`

- Implemented admin-only default permissions for newly created queries and dashboards
- Added `FEATURE_DEFAULT_QUERY_ADMIN_ONLY` feature flag for backward compatibility
- Removed `create_query` and `create_dashboard` from default group permissions
- Moved creation permissions exclusively to admin groups
- Changed default `can_read` permission for queries from `true` to `false`
- Restricted query source viewing and forking to admin users only

**Key Changes:**
- Updated `QueryListResource` to create admin-only permissions when new queries are created
- Updated `QueryForkResource` to maintain admin-only permissions when queries are forked
- Modified `has_object_permission` logic to deny access when no user group permissions exist
- Database migration to update existing groups and grant full permissions to admin groups for existing content

### 2. DataSource RBAC Integration
**Commits:** `9177f26`, `24c834b`, `be39547`

- Integrated DataSource permissions into the RBAC `object_permissions` table
- Migrated existing `data_source_groups` relationships to the new permission structure
- Updated query filtering to use RBAC permissions instead of legacy DataSourceGroup joins
- Added `list_data_sources` permission to admin groups

**Key Changes:**
- Created migration to populate `object_permissions` table with DataSource permissions
- Granted admin groups full access (read, update, delete) to all data sources
- Granted non-admin groups read and conditional update access based on `view_only` flag
- Replaced DataSourceGroup joins with ObjectPermission joins in query filters
- Fixed group type comparison in migration (string literal '1' instead of integer)
- Added explicit permission checks for `object_type`, `group_id`, and `can_read`

### 3. Permission Model Updates

**Object Type Standardization:**
- Changed object_type values from lowercase to capitalized format:
  - `queries` → `Query`
  - `dashboards` → `Dashboard`
  - Added `DataSource` as new object type

**Group Permission Structure:**
- `Group.DEFAULT_PERMISSIONS`: Removed `create_query` and `create_dashboard`
- `Group.ADMIN_PERMISSIONS`: Added `create_query`, `create_dashboard`, and `list_data_sources`

## Database Migrations

The following migrations are included:

1. **Admin-only default permissions** - Grants full permissions to admin groups for existing queries and dashboards
2. **Remove create permissions from default groups** - Updates group permission arrays
3. **DataSource permissions migration** - Populates object_permissions table with DataSource entries
4. **Add list_data_sources permission** - Updates admin group permissions

All migrations include downgrade functions for rollback capability.

## Configuration

### Feature Flag
```python
FEATURE_DEFAULT_QUERY_ADMIN_ONLY = True  # Default behavior
```

Set to `False` to maintain legacy permission behavior where queries and dashboards are accessible based on data source group access.

## Impact

### Breaking Changes
- **Queries and Dashboards:** New queries and dashboards are now admin-only by default (when feature flag is enabled)
- **Create Permissions:** Non-admin users can no longer create queries or dashboards by default
- **Query Operations:** Non-admin users cannot view query source or fork queries
- **DataSources:** DataSource visibility now controlled through RBAC permissions

### Migration Path
- Existing queries and dashboards receive admin-only permissions during migration
- Existing groups have create permissions removed (non-admin) or added (admin)
- Existing DataSource access is preserved through permission migration
- Feature flag allows gradual rollout and testing

## Testing Recommendations

1. **Permission Verification:**
   - Verify admin users can create, read, update, and delete queries/dashboards
   - Verify non-admin users cannot create queries/dashboards
   - Verify non-admin users cannot access queries/dashboards without explicit permissions

2. **DataSource Access:**
   - Verify admin users can list and access all data sources
   - Verify non-admin users can only access data sources with granted permissions
   - Verify query filtering respects RBAC permissions

3. **Migration Testing:**
   - Test upgrade migrations on a copy of production data
   - Verify all existing content remains accessible to appropriate users
   - Test downgrade migrations for rollback scenarios

4. **Feature Flag Testing:**
   - Test with `FEATURE_DEFAULT_QUERY_ADMIN_ONLY = True` (new behavior)
   - Test with `FEATURE_DEFAULT_QUERY_ADMIN_ONLY = False` (legacy behavior)

## Backward Compatibility

- Feature flag (`FEATURE_DEFAULT_QUERY_ADMIN_ONLY`) provides backward compatibility
- All migrations include downgrade functions
- Legacy permission checks remain functional when feature flag is disabled
- Existing API endpoints maintain their interfaces

## Security Considerations

- Strengthens access control by enforcing explicit permission grants
- Reduces risk of unauthorized access to sensitive queries and data sources
- Aligns with principle of least privilege
- Admin-only defaults prevent accidental data exposure

## Files Modified

### Python Backend
- `redash/models/__init__.py` - Group permission constants
- `redash/handlers/queries.py` - Query creation and forking permission logic
- `redash/permissions.py` - Permission check logic
- `redash/models/queries.py` - Query filtering with RBAC

### Database Migrations
- `migrations/versions/add_list_datasources_permission.py`
- `migrations/versions/[timestamp]_datasource_permissions.py`
- `migrations/versions/[timestamp]_remove_create_permissions.py`
- `migrations/versions/[timestamp]_admin_only_defaults.py`

## Related Documentation

- See `README_RBAC_CUSTOM.md` for RBAC system overview
- See `CHANGELOG_RBAC.md` for detailed change history

## Checklist

- [x] Database migrations created with upgrade and downgrade functions
- [x] Feature flag implemented for gradual rollout
- [x] Backward compatibility maintained
- [x] Permission logic updated across all affected endpoints
- [x] Group permission constants updated
- [x] Object type standardization applied
- [x] DataSource RBAC integration completed

## Questions for Reviewers

1. Should the feature flag default to `True` or `False` for initial release?
2. Are there additional endpoints that need permission checks?
3. Should we add audit logging for permission changes?
4. Do we need additional documentation for end users?
