#!python
import os
import sys
import json
import requests
import subprocess


def capture_output(command):
    proc = subprocess.Popen(command, stdout=subprocess.PIPE)
    return proc.stdout.read()


if __name__ == '__main__':
    version = sys.argv[1]
    filepath = sys.argv[2]
    filename = filepath.split('/')[-1]
    github_token = os.environ['GITHUB_TOKEN']
    auth = (github_token, 'x-oauth-basic')
    commit_sha = os.environ['CIRCLE_SHA1']

    commit_body = capture_output(["git", "log", "--format=%b", "-n", "1", commit_sha])
    file_md5_checksum = capture_output(["md5sum", filepath]).split()[0]
    file_sha256_checksum = capture_output(["sha256sum", filepath]).split()[0]
    version_body = "%s\n\nMD5: %s\nSHA256: %s" % (commit_body, file_md5_checksum, file_sha256_checksum)

    params = json.dumps({
        'tag_name': 'v{0}'.format(version),
        'name': 're:dash v{0}'.format(version),
        'body': version_body,
        'target_commitish': commit_sha,
        'prerelease': True
    })

    response = requests.post('https://api.github.com/repos/everythingme/redash/releases',
                             data=params,
                             auth=auth)

    upload_url = response.json()['upload_url']
    upload_url = upload_url.replace('{?name}', '')

    with open(filepath) as file_content:
        headers = {'Content-Type': 'application/gzip'}
        response = requests.post(upload_url, file_content, params={'name': filename}, auth=auth,
                                 headers=headers, verify=False)

