import urllib2
import json

latest = json.load(urllib2.urlopen("https://api.github.com/repos/EverythingMe/redash/releases/latest"))

print latest['assets'][0]['browser_download_url']
