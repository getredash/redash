# Redash RBAC Custom Build

## Version: 25.12.1 (RBAC Edition)

This is a custom build of Redash with enhanced Role-Based Access Control (RBAC) features.

### Base Version
- **Upstream Redash**: 25.12.0
- **Custom Build**: 25.12.1
- **Build Date**: March 2, 2026
- **Image Tag**: `redash-rbac:rbac-fix-datasources`

---

## What's Different from Upstream Redash?

### 1. Enhanced RBAC System
This build includes a comprehensive object-level permissions system:

- **Object Permissions Table**: Fine-grained access control for Queries, Dashboards, and DataSources
- **Group-Based Access**: Permissions assigned at the group level
- **Permission Types**: 
  - `can_read` - View access
  - `can_update` - Edit access
  - `can_delete` - Delete access
  - `can_create` - Create access (for object types)

### 2. Custom Migrations
Additional migrations beyond upstream Redash:

- `add_object_permissions` - Creates RBAC infrastructure
- `add_datasource_permissions` - Adds DataSource RBAC support (v25.12.1)
- `remove_create_permissions_from_default_groups` - Restricts creation to admins

### 3. DataSource Visibility Fix
**Version 25.12.1** specifically addresses an issue where DataSources were not visible after enabling RBAC. This version ensures:

- All existing DataSources get proper RBAC permissions
- Permissions are migrated from the legacy `data_source_groups` table
- Admin groups maintain full access to all DataSources
- Non-admin users retain their existing access levels

---

## Installation & Deployment

### Quick Start

```bash
# Clone repository
git clone <your-repo-url>
cd redash

# Build image
docker build -t redash-rbac:25.12.1 .

# Deploy
docker compose up -d
```

### Upgrading from Previous RBAC Build

If you're upgrading from an earlier RBAC build (e.g., `rbac-41407fa`):

```bash
# Pull latest code
git pull

# Build new image
docker build -t redash-rbac:25.12.1 .

# Update compose.yaml to use new image
# Then run migration and restart
docker compose run --rm server manage db upgrade
docker compose down && docker compose up -d
```

See [BUILD_AND_DEPLOY.md](BUILD_AND_DEPLOY.md) for detailed instructions.

---

## Configuration

### Environment Variables

All standard Redash environment variables are supported. Key ones:

```bash
# Database
REDASH_DATABASE_URL=postgresql://user:pass@host/db

# Redis
REDASH_REDIS_URL=redis://host:6379/0

# Security
REDASH_COOKIE_SECRET=<random-string>
REDASH_SECRET_KEY=<random-string>

# Query Runners (optional - defaults to all)
REDASH_ENABLED_QUERY_RUNNERS=pg,mysql,bigquery
REDASH_DISABLED_QUERY_RUNNERS=mongodb
```

### RBAC Configuration

RBAC is enabled by default in this build. To manage permissions:

1. **Via UI**: Settings > Groups > [Group Name] > Permissions
2. **Via API**: Use the object permissions endpoints
3. **Via Database**: Direct SQL (not recommended for production)

---

## Supported Data Sources

This build supports all 74 data sources from upstream Redash:

- PostgreSQL, MySQL, SQL Server, Oracle
- BigQuery, Redshift, Snowflake, Databricks
- MongoDB, Cassandra, Elasticsearch
- And 60+ more...

See [Redash Documentation](https://redash.io/help/data-sources/supported-data-sources) for full list.

---

## Key Features

### From Upstream Redash
- Browser-based query editor with auto-complete
- Rich visualizations and dashboards
- Scheduled query refreshes
- Alerts and notifications
- REST API
- Multi-organization support

### Custom RBAC Features
- Object-level permissions for Queries, Dashboards, DataSources
- Group-based access control
- Granular permission types (read, update, delete)
- Backward compatible with legacy permission system
- Admin override capabilities

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Redash Frontend                      │
│                  (React + TypeScript)                    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Redash API Server                      │
│                   (Flask + Python)                       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │           RBAC Permission Layer                   │  │
│  │  - Check object_permissions table                │  │
│  │  - Fallback to data_source_groups                │  │
│  │  - Admin bypass                                   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
        ┌──────────────┐        ┌──────────────┐
        │  PostgreSQL  │        │    Redis     │
        │   Database   │        │    Cache     │
        └──────────────┘        └──────────────┘
                │
                ▼
        ┌──────────────┐
        │ RQ Workers   │
        │ (Background) │
        └──────────────┘
```

---

## Database Schema Changes

### New Tables (RBAC)

#### `object_permissions`
```sql
CREATE TABLE object_permissions (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    object_type VARCHAR(255) NOT NULL,  -- 'Query', 'Dashboard', 'DataSource'
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

### Modified Behavior

- **DataSource.all()**: Now checks `object_permissions` table
- **Query.all()**: Filters based on RBAC permissions
- **Dashboard.all()**: Filters based on RBAC permissions

---

## Migration Guide

### From Upstream Redash (25.x)

1. Backup your database
2. Build this custom image
3. Run migrations: `docker compose run --rm server manage db upgrade`
4. Restart services

**Note**: Existing permissions from `data_source_groups`, `query_groups`, etc. will be migrated to the new RBAC system.

### From Earlier RBAC Build

If you're on an earlier RBAC build and seeing missing DataSources:

```bash
# Option 1: Run migration
docker compose run --rm server manage db upgrade

# Option 2: Use automated script
sudo bash build_and_deploy_fix.sh
```

See [DEPLOYMENT_STEPS.md](DEPLOYMENT_STEPS.md) for details.

---

## Troubleshooting

### DataSources Not Visible

**Symptom**: Only 1 out of N data sources shows up after deployment.

**Cause**: Missing RBAC permissions for DataSources.

**Solution**:
```bash
# Check if migration ran
docker exec redash-server-1 python manage.py db current

# Should show: add_datasource_permissions

# If not, run migration
docker compose run --rm server manage db upgrade
```

### Permission Denied Errors

**Symptom**: Users can't access resources they should have access to.

**Solution**:
```bash
# Check user's groups
docker exec redash-server-1 python -c "
from redash.models import User
user = User.query.filter_by(email='user@example.com').first()
print(f'Groups: {user.group_ids}')
"

# Check object permissions
docker exec redash-postgres-1 psql -U postgres -d postgres -c "
SELECT * FROM object_permissions 
WHERE object_type = 'DataSource' AND object_id = 1;
"
```

### Query Runner Not Registered

**Symptom**: "Query runner not found" errors.

**Solution**:
```bash
# Check registered runners
docker exec redash-server-1 python -c "
from redash.query_runner import query_runners
print(f'Registered: {len(query_runners)}')
print(list(query_runners.keys()))
"

# Check environment variables
docker exec redash-server-1 env | grep REDASH_ENABLED_QUERY_RUNNERS
```

---

## Development

### Local Setup

```bash
# Install dependencies
poetry install

# Run migrations
python manage.py db upgrade

# Start development server
python manage.py runserver --debugger --reload
```

### Running Tests

```bash
# All tests
pytest

# Specific test
pytest tests/models/test_data_sources.py
```

### Creating Migrations

```bash
# Auto-generate migration
python manage.py db migrate -m "Description"

# Edit the generated file in migrations/versions/

# Apply migration
python manage.py db upgrade
```

---

## API Changes

### New Endpoints

#### Get Object Permissions
```
GET /api/groups/{group_id}/permissions
```

Response:
```json
{
  "queries": [...],
  "dashboards": [...],
  "datasources": [...]
}
```

#### Update Object Permissions
```
POST /api/groups/{group_id}/permissions
```

Body:
```json
{
  "datasources": [
    {
      "object_id": 1,
      "can_read": true,
      "can_update": false
    }
  ]
}
```

---

## Security Considerations

1. **Admin Access**: Admin users bypass RBAC checks - use sparingly
2. **Default Permissions**: New objects get admin-only access by default
3. **Group Membership**: Users inherit permissions from all their groups
4. **API Keys**: API keys inherit permissions from their owner user

---

## Performance

### Optimization Tips

1. **Database Indexes**: Ensure indexes on `object_permissions` table exist
2. **Redis Caching**: Use Redis for schema caching
3. **Query Results**: Enable query result caching
4. **Connection Pooling**: Configure appropriate pool sizes

### Monitoring

```bash
# Check query performance
docker exec redash-postgres-1 psql -U postgres -d postgres -c "
SELECT query, calls, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
"

# Check Redis memory
docker exec redash-redis-1 redis-cli INFO memory
```

---

## Support & Contributing

### Getting Help

- **Issues**: Check existing issues or create new one
- **Documentation**: See [Redash Docs](https://redash.io/help/)
- **Logs**: `docker logs redash-server-1`

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

## License

BSD-2-Clause (same as upstream Redash)

---

## Changelog

### Version 25.12.1 (2026-03-02)
- **Fix**: Added missing DataSource permissions to RBAC system
- **Migration**: `add_datasource_permissions` migration
- **Improvement**: Automatic migration of legacy `data_source_groups` permissions
- **Documentation**: Added comprehensive deployment guides

### Version 25.12.0-rbac (2025-11-20)
- **Feature**: Initial RBAC implementation
- **Migration**: `add_object_permissions` migration for Queries and Dashboards
- **Migration**: `remove_create_permissions_from_default_groups`

---

## Credits

- **Upstream Redash**: [getredash/redash](https://github.com/getredash/redash)
- **RBAC Implementation**: Custom development
- **Contributors**: See git history

---

## Quick Reference

### Common Commands

```bash
# Check version
docker exec redash-server-1 python -c "from redash import __version__; print(__version__)"

# Run migration
docker compose run --rm server manage db upgrade

# Check migration status
docker exec redash-server-1 python manage.py db current

# Backup database
docker exec redash-postgres-1 pg_dump -U postgres postgres > backup.sql

# Restore database
docker exec -i redash-postgres-1 psql -U postgres postgres < backup.sql

# View logs
docker logs redash-server-1 --tail 100 -f

# Restart services
docker compose restart server worker scheduler
```

### Important Files

- `migrations/versions/add_datasource_permissions.py` - DataSource RBAC fix
- `redash/models/__init__.py` - DataSource model with RBAC
- `redash/handlers/data_sources.py` - DataSource API endpoints
- `compose.yaml` - Docker Compose configuration
- `.env` - Environment variables

---

**For detailed deployment instructions, see [DEPLOYMENT_STEPS.md](DEPLOYMENT_STEPS.md)**
