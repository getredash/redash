#!/usr/bin/env python3
"""
Decode a Base64 SAMLResponse (or raw SAML XML) and print diagnostics.

Usage:
  python scripts/inspect_saml_b64.py path/to/b64.txt
  python scripts/inspect_saml_b64.py -   # stdin
  echo 'PHN...' | python scripts/inspect_saml_b64.py -

Does not verify XML signatures (needs xmlsec + IdP cert). Checks structure,
timestamps, audience/recipient vs optional --entity-id, and Redash-oriented
attribute hints.
"""

from __future__ import annotations

import argparse
import base64
import re
import sys
import textwrap
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Optional

# SAML 2.0 namespaces
NS = {
    "saml": "urn:oasis:names:tc:SAML:2.0:assertion",
    "samlp": "urn:oasis:names:tc:SAML:2.0:protocol",
    "ds": "http://www.w3.org/2000/09/xmldsig#",
}


def _localname(tag: str) -> str:
    if "}" in tag:
        return tag.split("}", 1)[1]
    return tag


def decode_payload(raw: str) -> bytes:
    raw = raw.strip().replace("\n", "").replace("\r", "")
    # URL-safe vs standard
    for decoder in (
        lambda s: base64.b64decode(s, validate=True),
        lambda s: base64.urlsafe_b64decode(s + "=="[: (4 - len(s) % 4) % 4]),
    ):
        try:
            return decoder(raw)
        except Exception:
            continue
    raise ValueError("Not valid Base64; try pasting raw XML instead.")


def parse_xml(data: bytes) -> ET.Element:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        text = data.decode("utf-8", errors="replace")
    if text.lstrip().startswith("<"):
        root = ET.fromstring(text)
        return root
    # Assume base64
    decoded = decode_payload(text)
    return ET.fromstring(decoded.decode("utf-8"))


def findall(el: ET.Element, path: str) -> List[ET.Element]:
    return el.findall(path, NS)


def findtext(el: Optional[ET.Element], path: str, default: str = "") -> str:
    if el is None:
        return default
    hit = el.find(path, NS)
    if hit is not None and hit.text is not None:
        return hit.text.strip()
    return default


def check_signature_value_whitespace(root: ET.Element) -> list[str]:
    issues = []
    for sig in root.iter(f"{{{NS['ds']}}}SignatureValue"):
        if sig.text is None:
            issues.append("SignatureValue has no text")
            continue
        t = sig.text
        if t != t.strip():
            issues.append("SignatureValue text has leading/trailing whitespace (can break verification)")
        if "\n" in t or "\r" in t:
            issues.append("SignatureValue contains newlines inside text (risky for some verifiers)")
        inner = "".join(t.split())
        if not re.fullmatch(r"[A-Za-z0-9+/=]+", inner):
            issues.append("SignatureValue (collapsed) does not look like base64")
    if not list(root.iter(f"{{{NS['ds']}}}SignatureValue")):
        issues.append("No ds:SignatureValue elements found")
    return issues


def parse_saml_time(s: str) -> Optional[datetime]:
    if not s:
        return None
    s = s.strip()
    # Zulu
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "input",
        help="File path, or '-' for stdin (Base64 one line or raw XML)",
    )
    ap.add_argument(
        "--entity-id",
        metavar="URI",
        help="SP entity ID to compare against saml:Audience",
    )
    ap.add_argument(
        "--acs-url",
        metavar="URL",
        help="Expected Recipient / Destination (substring match)",
    )
    ap.add_argument(
        "--dump-xml",
        action="store_true",
        help="Print pretty-decoded XML to stdout",
    )
    args = ap.parse_args()

    if args.input == "-":
        raw = sys.stdin.read()
    else:
        with open(args.input, encoding="utf-8") as f:
            raw = f.read()

    try:
        data = raw.strip().encode("utf-8")
        if raw.lstrip().startswith("<"):
            root = ET.fromstring(raw)
            xml_bytes = raw.encode("utf-8")
        else:
            xml_bytes = decode_payload(raw)
            root = ET.fromstring(xml_bytes.decode("utf-8"))
    except ET.ParseError as e:
        print("XML parse error:", e, file=sys.stderr)
        return 1
    except ValueError as e:
        print("Decode error:", e, file=sys.stderr)
        return 1

    print("=== Decode OK ===")
    print(f"Root element: {_localname(root.tag)}")
    print(f"Decoded size: {len(xml_bytes)} bytes")

    if args.dump_xml:
        print("\n--- XML (decoded) ---")
        try:
            import xml.dom.minidom

            pretty = xml.dom.minidom.parseString(xml_bytes).toprettyxml(indent="  ")
            print(pretty)
        except Exception:
            print(xml_bytes.decode("utf-8", errors="replace"))

    issues: List[str] = []
    warnings: List[str] = []
    notes: List[str] = []

    # Response-level
    dest = root.get("Destination") or ""
    resp_id = root.get("ID") or ""
    in_resp_to = root.get("InResponseTo") or ""
    issue_instant = root.get("IssueInstant") or ""
    print("\n=== samlp:Response ===")
    print(f"  Destination: {dest}")
    print(f"  InResponseTo: {in_resp_to}")
    print(f"  IssueInstant: {issue_instant}")

    if args.acs_url and args.acs_url not in dest:
        issues.append(f"Destination does not contain expected ACS substring {args.acs_url!r}")

    status_el = root.find(".//samlp:Status/samlp:StatusCode", NS)
    status = (status_el.get("Value") if status_el is not None else "") or ""
    print(f"  StatusCode: {status}")
    if "Success" not in status:
        issues.append(f"Non-success status: {status}")

    # Assertion
    assertions = findall(root, ".//saml:Assertion")
    print(f"\n=== Assertions: {len(assertions)} ===")
    if len(assertions) != 1:
        issues.append(f"Expected 1 assertion, found {len(assertions)} (Redash/pysaml2 often requires exactly one)")

    for i, assn in enumerate(assertions):
        print(f"\n--- Assertion {i} ---")
        print(f"  ID: {assn.get('ID')}")
        print(f"  IssueInstant: {assn.get('IssueInstant')}")

        subj = assn.find(".//saml:Subject", NS)
        name_id = findtext(subj, "saml:NameID", "") if subj is not None else ""
        print(f"  NameID: {name_id[:80]}{'…' if len(name_id) > 80 else ''}")

        scd = assn.find(".//saml:SubjectConfirmationData", NS)
        if scd is not None:
            recip = scd.get("Recipient") or ""
            nooa = scd.get("NotOnOrAfter") or ""
            irt = scd.get("InResponseTo") or ""
            print(f"  SubjectConfirmationData Recipient: {recip}")
            print(f"  SubjectConfirmationData NotOnOrAfter: {nooa}")
            print(f"  SubjectConfirmationData InResponseTo: {irt}")
            if args.acs_url and args.acs_url not in recip:
                issues.append("SubjectConfirmationData Recipient does not contain expected ACS URL substring")

        cond = assn.find(".//saml:Conditions", NS)
        if cond is not None:
            nb = cond.get("NotBefore") or ""
            nooa = cond.get("NotOnOrAfter") or ""
            print(f"  Conditions NotBefore: {nb}")
            print(f"  Conditions NotOnOrAfter: {nooa}")
            now = datetime.now(timezone.utc)
            for label, ts in ("NotBefore", nb), ("NotOnOrAfter", nooa):
                dt = parse_saml_time(ts)
                if dt and dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                if dt:
                    delta = (dt - now).total_seconds()
                    if label == "NotBefore" and delta > 120:
                        issues.append(f"NotBefore is {delta:.0f}s in the future (clock skew?)")
                    if label == "NotOnOrAfter" and delta < -120:
                        issues.append(f"NotOnOrAfter is {-delta:.0f}s in the past (expired assertion)")

        audiences = [a.text.strip() for a in findall(assn, ".//saml:AudienceRestriction/saml:Audience") if a.text]
        print(f"  Audiences: {audiences}")
        if args.entity_id and args.entity_id not in audiences:
            issues.append(
                f"SP entity-id {args.entity_id!r} not in Audience list {audiences} "
                "(pysaml2 requires exact match to conf.entityid)"
            )

        # Attributes — Redash uses friendly names after mapping
        attr_statement = assn.find(".//saml:AttributeStatement", NS)
        friendly: dict[str, list[str]] = {}
        if attr_statement is not None:
            for attr in attr_statement.findall("saml:Attribute", NS):
                name = attr.get("Name") or ""
                short = name.rsplit("/", 1)[-1] if "/" in name else name
                key = attr.get("FriendlyName") or short or name
                values = []
                for v in attr.findall("saml:AttributeValue", NS):
                    values.append((v.text or "").strip())
                friendly[key] = values
                # also index by raw Name ending
                if name.endswith("givenname") or name == "FirstName":
                    pass

        print("\n  --- Attributes (FriendlyName or short Name, first 25) ---")
        shown = 0
        for k in sorted(friendly.keys()):
            if shown >= 25:
                notes.append(f"... {len(friendly) - 25} more attribute keys omitted from listing")
                break
            vals = friendly[k]
            preview = vals[:3]
            if len(vals) > 3:
                preview.append(f"(+{len(vals) - 3} more)")
            print(f"    {k}: {preview}")
            shown += 1

        for need in ("FirstName", "LastName"):
            if need not in friendly:
                issues.append(f"Mapped attribute {need!r} not present (Redash expects ava['{need}'])")
            else:
                vals = friendly[need]
                if not vals or all(v == "" for v in vals):
                    warnings.append(
                        f"Attribute {need!r} is empty — Redash still does ava['{need}'][0] "
                        "(empty string is OK; missing list would be IndexError)"
                    )

        if "RedashGroups" in friendly:
            print(f"\n  RedashGroups count: {len(friendly['RedashGroups'])}")

    sig_issues = check_signature_value_whitespace(root)
    print("\n=== Signature formatting ===")
    if sig_issues:
        for s in sig_issues:
            print(f"  [!] {s}")
            if "whitespace" in s or "newlines" in s:
                issues.append(s)
    else:
        print("  No obvious SignatureValue whitespace problems")

    print("\n=== Summary ===")
    if issues:
        print("Issues (worth fixing / may break SP):")
        for s in issues:
            print(f"  - {s}")
    if warnings:
        print("Warnings:")
        for s in warnings:
            print(f"  - {s}")
    if not issues and not warnings:
        print("No structural issues flagged (signature not cryptographically verified).")

    if notes:
        print("\nNotes:")
        for s in notes:
            print(f"  - {s}")

    print(
        textwrap.dedent(
            """

            Hint: compare Audience values to your Redash org SAML entity ID.
            Example:
              python scripts/inspect_saml_b64.py capture.b64 \\
                --entity-id 'urn:auth0:orchestrated-integration.au.auth0.com:*' \\
                --acs-url 'saml/callback'
            """
        ).rstrip()
    )

    return 1 if issues else 0


if __name__ == "__main__":
    sys.exit(main())
