# RBAC Permission System Enhancements

## Description
This PR strengthens the RBAC system by implementing admin-only default permissions for queries and dashboards, integrating DataSource permissions into the RBAC framework, and restricting sensitive operations to administrators.

## Changes

### Admin-Only Default Permissions
- New queries and dashboards are now admin-only by default
- Removed `create_query` and `create_dashboard` from default group permissions
- Changed default `can_read` permission for queries to `false`
- Restricted query source viewing and forking to admins only
- Added `FEATURE_DEFAULT_QUERY_ADMIN_ONLY` feature flag for backward compatibility

### DataSource RBAC Integration
- Migrated DataSource permissions to `object_permissions` table
- Updated query filtering to use RBAC permissions instead of legacy joins
- Added `list_data_sources` permission to admin groups
- Preserved existing DataSource access through permission migration

### Database Migrations
- ✅ Admin-only default permissions for existing content
- ✅ Remove create permissions from default groups
- ✅ DataSource permissions migration
- ✅ Add list_data_sources permission
- All migrations include downgrade functions

## Breaking Changes
⚠️ **When `FEATURE_DEFAULT_QUERY_ADMIN_ONLY = True` (default):**
- New queries/dashboards are admin-only by default
- Non-admin users cannot create queries/dashboards without explicit permission
- Non-admin users cannot view query source or fork queries
- DataSource visibility controlled through RBAC permissions

## Backward Compatibility
- Feature flag allows legacy behavior when set to `False`
- All migrations are reversible
- Existing API interfaces unchanged

## Testing
- [ ] Verify admin users can create/access all resources
- [ ] Verify non-admin users have restricted access
- [ ] Test DataSource permission filtering
- [ ] Test migrations on production-like data
- [ ] Test with feature flag enabled and disabled

## Security Impact
✅ Strengthens access control with explicit permission grants
✅ Reduces unauthorized access risk
✅ Aligns with principle of least privilege
✅ Prevents accidental data exposure

## Related Issues
<!-- Link any related issues here -->

## Deployment Notes
1. Run database migrations
2. Configure `FEATURE_DEFAULT_QUERY_ADMIN_ONLY` setting
3. Review and adjust group permissions as needed
4. Communicate changes to users

---

**Commits:**
- feat(permissions): Add list_data_sources permission to admin groups
- feat(permissions): Update DataSource query filtering to use RBAC permissions
- feat(permissions): Add DataSource permissions to RBAC system
- feat(permissions): Restrict query source viewing and forking to admins
- feat(permissions): Change default read permission for queries to false
- feat(permissions): Remove create permissions from default groups
- feat(permissions): Implement admin-only default permissions for queries and dashboards
