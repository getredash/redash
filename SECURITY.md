# Security Policy

## Reporting a Vulnerability

Please email security@redash.io to report any security vulnerabilities. We will acknowledge receipt of your vulnerability and strive to send you regular updates about our progress. If you're curious about the status of your disclosure please feel free to email us again. If you want to encrypt your disclosure email, you can use [this PGP key](https://keybase.io/arikfr/key.asc).

## Out of Scope
 
The following are known design characteristics of Redash rather than vulnerabilities, and reports about them will generally be declined:
 
- **Code execution via the Python query runner.** The Python data source is intentionally not a security sandbox and is disabled by default. Anyone granted access to a Python data source should be trusted to run code in the Redash worker environment. Sandbox escapes in the Python query runner (including RestrictedPython bypasses) are out of scope.
- **Requests to internal hosts from an admin-configured data source (SSRF).** Data sources can only be created or modified by admins (endpoints are gated by `@require_admin`), and connecting to arbitrary hosts — including internal ones — is a core function of the product. Deciding whether a data source may reach an internal address is left to the admin who configures it.
 
If you're unsure whether something falls in scope, email us anyway — we'd rather hear about it.
 
