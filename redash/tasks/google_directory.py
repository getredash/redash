import json

from redash import models, settings
from redash.worker import get_job_logger

logger = get_job_logger(__name__)

DIRECTORY_SCOPES = ["https://www.googleapis.com/auth/admin.directory.user.readonly"]


def _directory_service():
    # google-api-python-client is an optional dependency, so only import it when the
    # sync actually runs.
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    credentials = service_account.Credentials.from_service_account_info(
        json.loads(settings.GOOGLE_DIRECTORY_CREDENTIALS_JSON),
        scopes=DIRECTORY_SCOPES,
        subject=settings.GOOGLE_DIRECTORY_SUBJECT,
    )
    return build("admin", "directory_v1", credentials=credentials, cache_discovery=False)


def _active_emails(service, domain):
    """Returns every address (primary and aliases) of users in the domain who can sign in.

    Deleted users aren't listed at all, and suspended or archived users are left out, so
    any address missing from the result belongs to someone who is no longer active.
    """
    emails = set()
    request = service.users().list(
        domain=domain,
        maxResults=500,
        fields="nextPageToken,users(primaryEmail,aliases,nonEditableAliases,suspended,archived)",
    )
    while request is not None:
        response = request.execute()
        for user in response.get("users", []):
            if user.get("suspended") or user.get("archived"):
                continue
            addresses = [user["primaryEmail"]] + user.get("aliases", []) + user.get("nonEditableAliases", [])
            emails.update(address.lower() for address in addresses)
        request = service.users().list_next(request, response)

    return emails


def sync_google_directory_users():
    """Disables users who are suspended, archived or deleted in Google Workspace.

    Only users whose email is in one of the org's Google Apps domains are checked, so
    accounts from other domains (e.g. password logins) are never touched. Any Directory
    API error fails the whole run before anyone is disabled.
    """
    service = _directory_service()
    to_disable = []

    for org in models.Organization.query:
        active_emails = set()
        synced_domains = set()
        for domain in org.google_apps_domains:
            emails = _active_emails(service, domain)
            if not emails:
                # An empty domain almost certainly means a lookup problem, not that
                # everyone left, so leave its users alone.
                logger.warning("Google directory returned no active users for %s, skipping it", domain)
                continue
            active_emails |= emails
            synced_domains.add(domain.lower())

        for user in models.User.all(org):
            domain = user.email.split("@")[-1]
            if domain in synced_domains and user.email not in active_emails:
                to_disable.append(user)

    if len(to_disable) > settings.GOOGLE_DIRECTORY_SYNC_MAX_DISABLE:
        logger.error(
            "Google directory sync would disable %d users (limit %d), not disabling anyone: %s",
            len(to_disable),
            settings.GOOGLE_DIRECTORY_SYNC_MAX_DISABLE,
            ", ".join(user.email for user in to_disable),
        )
        return {"disabled": [], "skipped": len(to_disable)}

    if to_disable:
        for user in to_disable:
            logger.info("Disabling %s: no longer active in Google Workspace", user.email)
            user.disable()
        models.AlertSubscription.delete_user_email_subscriptions([user.id for user in to_disable])
        models.db.session.commit()

    return {"disabled": [user.email for user in to_disable]}
