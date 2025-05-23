import click
from redash import models
from redash.cli import manager


@manager.command()
@click.argument("org_slug")
@click.argument("group_name")
def create_dashboard_only_group(ctx, org_slug, group_name):
    """Create a dashboard-only group for an organization."""
    try:
        org = models.Organization.get_by_slug(org_slug)
        if not org:
            click.echo(f"Organization '{org_slug}' not found")
            return
        
        existing_group = models.Group.query.filter(
            models.Group.org == org,
            models.Group.name == group_name
        ).first()
        
        if existing_group:
            click.echo(f"Group '{group_name}' already exists in organization '{org_slug}'")
            return
        
        group = models.Group(
            name=group_name,
            org=org,
            type=models.Group.DASHBOARD_ONLY_GROUP,
            permissions=models.Group.DASHBOARD_ONLY_PERMISSIONS
        )
        
        models.db.session.add(group)
        models.db.session.commit()
        
        click.echo(f"Created dashboard-only group '{group_name}' for organization '{org_slug}'")
        
    except Exception as e:
        click.echo(f"Error creating group: {str(e)}")


@manager.command()
@click.argument("org_slug")
@click.argument("user_email")
@click.argument("group_name")
def add_user_to_dashboard_only_group(ctx, org_slug, user_email, group_name):
    """Add a user to a dashboard-only group."""
    try:
        org = models.Organization.get_by_slug(org_slug)
        if not org:
            click.echo(f"Organization '{org_slug}' not found")
            return
        
        user = models.User.get_by_email_and_org(user_email, org)
        if not user:
            click.echo(f"User '{user_email}' not found in organization '{org_slug}'")
            return
        
        group = models.Group.query.filter(
            models.Group.org == org,
            models.Group.name == group_name,
            models.Group.type == models.Group.DASHBOARD_ONLY_GROUP
        ).first()
        
        if not group:
            click.echo(f"Dashboard-only group '{group_name}' not found in organization '{org_slug}'")
            return
        
        if group.id not in (user.group_ids or []):
            user.group_ids = (user.group_ids or []) + [group.id]
            models.db.session.add(user)
            models.db.session.commit()
            click.echo(f"Added user '{user_email}' to dashboard-only group '{group_name}'")
        else:
            click.echo(f"User '{user_email}' is already in group '{group_name}'")
            
    except Exception as e:
        click.echo(f"Error adding user to group: {str(e)}")


@manager.command()
@click.argument("org_slug")
@click.argument("user_email")
@click.argument("dashboard_id")
def grant_dashboard_permission(ctx, org_slug, user_email, dashboard_id):
    """Grant dashboard view permission to a dashboard-only user."""
    try:
        org = models.Organization.get_by_slug(org_slug)
        if not org:
            click.echo(f"Organization '{org_slug}' not found")
            return
        
        user = models.User.get_by_email_and_org(user_email, org)
        if not user:
            click.echo(f"User '{user_email}' not found in organization '{org_slug}'")
            return
        
        if not user.is_dashboard_only_user():
            click.echo(f"User '{user_email}' is not a dashboard-only user")
            return
        
        dashboard = models.Dashboard.get_by_id_and_org(dashboard_id, org)
        if not dashboard:
            click.echo(f"Dashboard '{dashboard_id}' not found in organization '{org_slug}'")
            return
        
        # Find an admin user to be the grantor
        admin_user = models.User.query.join(models.Group).filter(
            models.User.org == org,
            models.Group.permissions.contains(["admin"]),
            models.User.disabled_at.is_(None)
        ).first()
        
        if not admin_user:
            click.echo("No admin user found to grant permission")
            return
        
        permission = models.AccessPermission.grant(
            dashboard,
            "view",
            user,
            admin_user
        )
        models.db.session.commit()
        
        click.echo(f"Granted dashboard '{dashboard.name}' view permission to user '{user_email}'")
        
    except Exception as e:
        click.echo(f"Error granting permission: {str(e)}") 