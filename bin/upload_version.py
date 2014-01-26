#!python
import os
import sys
import json
import requests

if __name__ == '__main__':
  version = sys.argv[1]
  filepath = sys.argv[2]
  filename = filepath.split('/')[-1]
  github_token = os.environ['GITHUB_TOKEN']
  auth = (github_token, 'x-oauth-basic')
  commit_sha = os.environ['CIRCLE_SHA1']

  params = json.dumps({
    'tag_name': 'v{0}'.format(version),
    'name': 're:dash v{0}'.format(version),
    'target_commitish': commit_sha
  })

  response = requests.post('https://api.github.com/repos/everythingme/redash/releases',
                            data=params,
                            auth=auth)

  upload_url = response.json()['upload_url']
  upload_url = upload_url.replace('{?name}', '')

  with open(filepath) as file_content:
    headers = {'Content-Type': 'application/gzip'}
    response = requests.post(upload_url, file_content, params={'name': filename}, auth=auth, headers=headers, verify=False)

