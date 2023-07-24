#!/bin/env python3

import re
import subprocess
import sys


def get_change_log(previous_sha):
    args = [
        "git",
        "--no-pager",
        "log",
        "--merges",
        "--grep",
        "Merge pull request",
        '--pretty=format:"%h|%s|%b|%p"',
        "master...{}".format(previous_sha),
    ]
    log = subprocess.check_output(args)
    changes = []

    for line in log.split("\n"):
        try:
            sha, subject, body, parents = line[1:-1].split("|")
        except ValueError:
            continue

        try:
            pull_request = re.match(r"Merge pull request #(\d+)", subject).groups()[0]
            pull_request = " #{}".format(pull_request)
        except Exception:
            pull_request = ""

        author = subprocess.check_output(["git", "log", "-1", '--pretty=format:"%an"', parents.split(" ")[-1]])[1:-1]

        changes.append("{}{}: {} ({})".format(sha, pull_request, body.strip(), author))

    return changes


if __name__ == "__main__":
    previous_sha = sys.argv[1]
    changes = get_change_log(previous_sha)

    for change in changes:
        print(change)
