# Design Record: The Standard Group

## Context

Somebody arriving from core-backend who has never been here before needs an account. Redash's own just-in-time provisioning puts new users in the organization's **default** group, which can read every data source in the organization. That is right for somebody who builds dashboards and wrong for a client who reads them.

METR already had an answer to this in production, applied by hand: a group called `Standard`, carrying `list_dashboards` and `execute_query` and nothing else, with data sources and dashboards granted to it per organization.

---

## Decision

New arrivals are provisioned into the organization's group of type `standard`. Single sign-on never creates that group; if there is none, the arrival is refused, the person is told to contact support, and Sentry is told which organization and how to fix it.

---

## Why a Type and Not a Name

An audit of production found 41 organizations with a de-facto standard group and 80 without. Most call it `Standard`, one calls it `standard`, and four call it something else entirely — `Standard GAG`, `StandardUser`, `Nutzer`, `user`. All 41 carry the same two permissions.

Matching on a name at sign-in time would mean carrying that list and its spelling variations in the request path forever, and a group named `standard` is one click away in the admin UI, so the match would never be trustworthy. Migration `c4a7e9b21f08` resolves the names once — the bulk rule by name, the four exceptions by organization slug — and the runtime asks for a type.

Nothing in the admin UI can set a type, so `standard` is a namespace only our own code writes to.

## Why an Index Rather Than a Runtime Check

The same migration adds a partial unique index, `ix_groups_one_standard_per_org`, on `groups (org_id) WHERE type = 'standard'`. It makes two standard groups in one organization impossible, so the sign-in path has no branch for that case and no test for a state that cannot occur.

It also makes the migration — and the deploy — fail if an organization turns out to have two, which is the right moment to find out. The index is declared in the model metadata as well as in the migration, because `create_tables` builds a fresh database from the metadata and stamps the head revision, skipping every migration.

## Why Single Sign-On Does Not Create the Group

Creating one is a row's work and would look like it had succeeded. But an empty group grants no data source and no dashboard, and in Redash a dashboard appears only if it is granted to a group you are in. The arrival would sign in and find nothing — silently, with nothing to tell anybody.

Refusing instead means the one person affected is told to ask, and we are paged with the organization's name and the command that fixes it. Which data sources and which dashboards a client should see is a decision per organization, made in the dashboards deploy, and a migration cannot make it.

`./manage.py metr create_standard_group <org_slug>` creates the group. toolbox runs it when an organization is created; somebody runs it against an existing organization when its client is about to be switched on. Running it twice is harmless.

## What a Provisioned User Is Called

The token carries `first_name` and `last_name` — Django's own field names, because core-backend is where they come from — and the account is named by joining them. Both are mandatory there.

A token missing either one is refused exactly as a missing standard group is: nothing is written, the visitor is told to contact support, and Sentry is told who it was and that the name needs setting in core-backend. Guessing a name, or falling back to the email address, would create an account that looks deliberate and is wrong, and nothing would ever correct it — the name is written once, at provisioning, and an existing user's name is never touched again.

One consequence worth knowing: somebody with a single legal name cannot be provisioned. core-backend requires both fields, so they cannot exist there either; if that ever changes, this is the line to loosen.

## Why the Refusal Is Scoped to Provisioning

Neither the group nor the name is read unless somebody new arrives. An organization without one still serves everybody who already has an account. Failing every login over a missing group would turn a setup step nobody has done yet into an outage for people it has nothing to do with — the exact failure this module is built to avoid.

---

## Consequences

- Existing users keep whatever groups they have and never join the standard group. They are matched by email, like everyone else, which is why email addresses cannot be changed here.
- A genuinely new user in an organization whose standard group has no grants still sees an empty dashboard list. The group exists; filling it is the dashboards deploy's job.
- `has_dashboards` in core-backend is off by default and switched on per client, so no arrival can reach an organization nobody has checked.
