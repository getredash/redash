import os

# Slug of the organization holding the sub-dashboard templates. Required —
# redash_global.app refuses to start without it.
TEMPLATE_ORG_SLUG = os.environ.get("TEMPLATE_ORG_SLUG")

# The template org is folded in: deploying the templates back into their own org is never wanted.
ORG_SLUGS_EXCLUDED_FROM_DEPLOYMENT = [
    slug.strip()
    for slug in [*os.environ.get("ORG_SLUGS_EXCLUDED_FROM_DEPLOYMENT", "operations").split(","), TEMPLATE_ORG_SLUG]
    if slug and slug.strip()
]
