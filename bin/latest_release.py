#!/usr/bin/env python
import sys
import requests

if __name__ == '__main__':
    response = requests.get('https://api.github.com/repos/EverythingMe/redash/releases')

    if response.status_code != 200:
        exit("Failed getting releases (status code: %s)." % response.status_code)

    sorted_releases = sorted(response.json(), key=lambda release: release['id'], reverse=True)

    latest_release = sorted_releases[0]
    asset_url = latest_release['assets'][0]['url']
    filename = latest_release['assets'][0]['name']

    wget_command = 'wget --header="Accept: application/octet-stream" %s -O %s' % (asset_url, filename)

    if '--url-only' in sys.argv:
        print asset_url
    elif '--wget' in sys.argv:
        print wget_command
    else:
        print "Latest release: %s" % latest_release['tag_name']
        print latest_release['body']

        print "\nTarball URL: %s" % asset_url
        print 'wget: %s' % (wget_command)


