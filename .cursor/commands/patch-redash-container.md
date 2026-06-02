# patch-redash-container

## Fetch scan results (CLI)

Use **`AWS_PROFILE=dev`** and run **outside the Cursor sandbox** (full permissions), for example:

```bash
AWS_PROFILE=dev aws ecr describe-image-scan-findings \
  --region ap-southeast-2 \
  --repository-name redash \
  --image-id imageDigest=sha256:<digest-from-console-url> \
  --output json > scan.json
```

Console link pattern (replace digest as needed):

`https://ap-southeast-2.console.aws.amazon.com/ecr/repositories/private/639989371409/redash/_/image/sha256:<digest>/details?region=ap-southeast-2`

Parse severity counts from `imageScanFindings.findingSeverityCounts` and details from `imageScanFindings.enhancedFindings`.

**Note:** The scan results will show the state of the **previous** image. After pushing a new image, allow 24 hours for Inspector to complete the scan before fetching new results.

## Prioritize findings

Address in this order:

1. **CRITICAL** — e.g. recent advisories on **axios**, **dompurify**, **lodash**, **tough-cookie**, **flatted**, **elliptic** (GHSA), plus any **Python** packages flagged (e.g. **urllib3**, **flask**).
2. **HIGH** — transitive JS (e.g. **babel-traverse**, **cross-spawn**, **path-to-regexp**, **tar**, **minimatch**, **qs**, **braces**, **serialize-javascript**) and Python deps as listed in findings.
3. **MEDIUM/LOW** — Address if time permits, but prioritize CRITICAL and HIGH first.

**Important notes:**
- Re-check each CVE against the **declared fixed version** in the finding; some Inspector IDs (especially future-dated CVE years) should be **confirmed with vendor/OS** before over-pinning.
- **OS-level vulnerabilities** (libxml2, postgresql, nghttp2, etc.) require base Docker image updates and cannot be fixed via package managers.
- Check if vulnerabilities are in the **base image** by looking at the package manager type (OS, DPKG, APT) - these should be skipped unless updating the base image.

## Image hygiene (reduces noise)

- If the scan references **`/app/yarn.lock` and `/app/pnpm-lock.yaml`**, the image contains **both** lockfiles. Prefer **one** JS package manager in the final app layer so scanners do not double-count the same npm tree.
- After **Python** dependency bumps, run **`poetry lock`** (and commit **`poetry.lock`**) so Docker `poetry install` matches **`pyproject.toml`**.
- After **JS** changes, run **`yarn install`** (or refresh **`yarn.lock`** and **`viz-lib/yarn.lock`**) so the Docker frontend stage stays consistent.
- Use **`resolutions`** field in `package.json` and `viz-lib/package.json` to force specific versions of transitive dependencies.

You should prefer `pnpm` over `yarn` because that is now on the `master` branch in the upstream repo. See https://github.com/getredash/redash

**Current branch uses Yarn** - this fork maintains Yarn for consistency with the v26.3.0 base.

## Validate locally (Docker-first)

1. **`make compose_build`** — must pass frontend (Yarn/webpack) and backend (Poetry) stages.
2. **`make test`** — runs full test suite (backend + frontend + linting).
   - Backend: ~887 tests (pytest)
   - Frontend: ~89 tests (jest)
   - Expected time: ~4 minutes
   - Note: Some tests may be skipped (e.g., JWT tests that have environment issues in full suite but pass in isolation)
3. **Check linter errors** — Pre-commit hooks run `black` and `ruff` for Python code formatting.

## Git

**Commit** remediation to git on a new branch for these fixes (not `master`); **do not push** until I have had time to manually test the image.

**Commit message format:**
```
fix: update dependencies and resolve <issue-type>

Brief description of what was updated and why.

Python dependency updates:
- package: old → new (reason/CVE)

JavaScript dependency updates:
- package: old → new (reason/CVE)

Configuration changes:
- Any settings or behavior changes
```

## Updating ECR

When I instruct you to push to ECR, use these steps:

**Prerequisites:**
- Must run with `required_permissions: ["all"]` (outside sandbox)
- Requires `AWS_PROFILE=dev` for ECR authentication
- Docker build takes ~6 minutes for ARM64 platform
- Docker push takes ~5 minutes (most layers cached after first push)

```bash
# 1. Create and push git tag
export TAG_VERSION=v26.3.0p5  # Increment patch number
git tag $TAG_VERSION
git push origin $TAG_VERSION

# 2. Build Docker image for ARM64
docker build --platform linux/arm64 -t redash:$TAG_VERSION .

# 3. Login to ECR (requires AWS_PROFILE=dev)
AWS_PROFILE=dev aws ecr get-login-password --region ap-southeast-2 | \
  docker login --username AWS --password-stdin 639989371409.dkr.ecr.ap-southeast-2.amazonaws.com

# 4. Tag and push versioned image
docker tag redash:$TAG_VERSION 639989371409.dkr.ecr.ap-southeast-2.amazonaws.com/redash:$TAG_VERSION
docker push 639989371409.dkr.ecr.ap-southeast-2.amazonaws.com/redash:$TAG_VERSION

# 5. Tag and push as latest
docker tag redash:$TAG_VERSION 639989371409.dkr.ecr.ap-southeast-2.amazonaws.com/redash:latest
docker push 639989371409.dkr.ecr.ap-southeast-2.amazonaws.com/redash:latest
```

**Verify push:**
- Check digest matches between versioned tag and latest
- Expected image size: ~1.89GB
- Console: https://ap-southeast-2.console.aws.amazon.com/ecr/repositories/private/639989371409/redash

**Latest versions:**
- v26.3.0p4: sha256:7bc4028d5c84df5deb75a9e0480f093957025f6ccde6bc6a4dc1cc45bfdc08d2 (2026-05-15)

