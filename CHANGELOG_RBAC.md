# Redash RBAC Custom Build - Changelog

## Version 25.12.1 - 2026-03-02

### 🐛 Bug Fixes

**Critical Fix: DataSource Visibility Issue**
- Fixed issue where only 1 out of N data sources was visible after RBAC deployment
- Root cause: `add_object_permissions` migration created permissions for Queries and Dashboards but omitted DataSources
- Impact: All DataSources became invisible to non-admin users after RBAC was enabled

### ✨ New Features

**DataSource RBAC Support**
- Added `add_datasource_permissions` migration
- Automatically migrates permissions from legacy `data_source_groups` table to new `object_permissions` table
- Preserves existing access levels (view_only flag becomes can_update permission)
- Ensures admin groups have full access to all DataSources

### 📝 Documentation

- Added comprehensive deployment guide: `BUILD_AND_DEPLOY.md`
- Added quick deployment steps: `DEPLOYMENT_STEPS.md`
- Added custom README: `README_RBAC_CUSTOM.md`
- Added automated deployment script: `build_and_deploy_fix.sh`
- Added diagnostic scripts for troubleshooting

### 🔧 Migration Details

**New Migration: `add_datasource_permissions`**
```python
# Migrates DataSource permissions from old system to RBAC
# - Reads data_source_groups table
# - Creates object_permissions entries for each DataSource
# - Maps view_only flag to can_update permission
# - Grants admin groups full access
```

**Migration Dependency Chain:**
```
fd4fc850d7ea (previous)
    ↓
add_object_permissions (Queries & Dashboards)
    ↓
add_datasource_permissions (DataSources) ← NEW in 25.12.1
```

### 🚀 Deployment

**Automated Deployment:**
```bash
sudo bash build_and_deploy_fix.sh
```

**Manual Deployment:**
```bash
docker build -t redash-rbac:25.12.1 .
docker compose run --rm server manage db upgrade
docker compose down && docker compose up -d
```

### ⚠️ Breaking Changes

None. This is a backward-compatible fix.

### 📊 Database Changes

**New Rows in `object_permissions` Table:**
- One row per DataSource per Group that has access
- Typical deployment: 8 DataSources × 2-3 Groups = 16-24 new rows

**Example:**
```sql
-- Before (no DataSource permissions)
SELECT COUNT(*) FROM object_permissions WHERE object_type = 'DataSource';
-- Result: 0

-- After migration
SELECT COUNT(*) FROM object_permissions WHERE object_type = 'DataSource';
-- Result: 16 (for 8 DataSources with 2 groups each)
```

### 🔍 Verification

**Check Migration Status:**
```bash
docker exec redash-server-1 python manage.py db current
# Should show: add_datasource_permissions
```

**Verify Permissions:**
```bash
docker exec redash-postgres-1 psql -U postgres -d postgres -c "
SELECT ds.name, COUNT(op.id) as permission_count
FROM data_sources ds
LEFT JOIN object_permissions op ON ds.id = op.object_id AND op.object_type = 'DataSource'
GROUP BY ds.name;
"
# All DataSources should have permission_count > 0
```

### 🐞 Known Issues

None in this release.

### 📦 Dependencies

No dependency changes from 25.12.0.

### 🙏 Credits

- Issue reported by: Client (JA Campus deployment)
- Root cause analysis: Development team
- Fix implemented: Development team
- Testing: Production deployment

---

## Version 25.12.0-rbac - 2025-11-20

### ✨ Initial RBAC Implementation

**New Features:**
- Object-level permissions system
- `object_permissions` table for fine-grained access control
- Support for Query and Dashboard permissions
- Group-based permission inheritance

**Migrations:**
- `add_object_permissions` - Creates RBAC infrastructure
- `remove_create_permissions_from_default_groups` - Restricts creation to admins

**Known Issues:**
- ⚠️ DataSource permissions not included (fixed in 25.12.1)

### 🔧 Technical Details

**New Database Table:**
```sql
CREATE TABLE object_permissions (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    object_type VARCHAR(255) NOT NULL,
    object_id INTEGER NOT NULL,
    can_create BOOLEAN DEFAULT FALSE,
    can_read BOOLEAN DEFAULT TRUE,
    can_update BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(group_id, object_type, object_id)
);
```

**Supported Object Types:**
- `Query` ✓
- `Dashboard` ✓
- `DataSource` ✗ (added in 25.12.1)

### 📝 Migration Behavior

**For Queries:**
- Admin groups get full permissions (read, update, delete)
- Non-admin groups get no permissions by default
- Existing query_groups table remains for backward compatibility

**For Dashboards:**
- Admin groups get full permissions (read, update, delete)
- Non-admin groups get no permissions by default
- Existing dashboard access preserved through groups

### ⚠️ Important Notes

1. **Admin-Only Default**: New objects are only visible to admin groups by default
2. **Manual Permission Grant**: Non-admin users need explicit permission grants
3. **Backward Compatibility**: Old permission tables still exist and are checked as fallback

---

## Upgrade Path

### From Upstream Redash 25.12.0

```bash
# 1. Backup database
docker exec redash-postgres-1 pg_dump -U postgres postgres > backup.sql

# 2. Build RBAC image
docker build -t redash-rbac:25.12.1 .

# 3. Update compose.yaml
# Change image to: redash-rbac:25.12.1

# 4. Run migrations
docker compose run --rm server manage db upgrade

# 5. Restart
docker compose down && docker compose up -d
```

### From 25.12.0-rbac to 25.12.1

```bash
# 1. Pull latest code
git pull

# 2. Build new image
docker build -t redash-rbac:25.12.1 .

# 3. Update compose.yaml
# Change image to: redash-rbac:25.12.1

# 4. Run migration (critical!)
docker compose run --rm server manage db upgrade

# 5. Restart
docker compose down && docker compose up -d
```

---

## Rollback Instructions

### From 25.12.1 to 25.12.0-rbac

```bash
# 1. Stop services
docker compose down

# 2. Rollback migration
docker compose run --rm server manage db downgrade

# 3. Update compose.yaml to old image
# Change image to: redash-rbac:rbac-41407fa

# 4. Start services
docker compose up -d
```

**Note**: Rolling back will remove DataSource permissions from `object_permissions` table, making DataSources invisible again.

---

## Support

For issues related to this custom build:

1. Check logs: `docker logs redash-server-1 --tail 100`
2. Verify migration: `docker exec redash-server-1 python manage.py db current`
3. Check permissions: See verification queries above
4. Review documentation: `README_RBAC_CUSTOM.md`

For upstream Redash issues:
- https://github.com/getredash/redash/issues
- https://redash.io/help/

---

## Future Roadmap

### Planned for 25.12.2
- Alert permissions in RBAC system
- Query snippet permissions
- Destination permissions
- UI for managing object permissions

### Under Consideration
- Role templates (predefined permission sets)
- Permission inheritance from parent objects
- Audit log for permission changes
- Bulk permission management API

---

**Last Updated**: March 2, 2026
**Maintainer**: Development Team
**Base Version**: Redash 25.12.0
