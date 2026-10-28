---
title: Debugging a Redash Server on Docker Using Visual Studio Code
---

If you've followed [Docker Based Developer Installation Guide](https://github.com/getredash/redash/wiki/Local-development-setup), your Redash server is running inside a Docker container and cannot be debugged directly. If you wish to debug server code, you will need to use remote debugging.

## Initial Setup

1. Make sure you have the [Python Extension for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=ms-python.python) installed.
2. Install ptvsd: `pip install ptvsd`

## Starting a Debugging Session

1. In a terminal window, run `docker-compose stop server && docker-compose run --rm --service-ports server debug && docker-compose start server`
2. Switch over to Visual Studio Code and select "View -> Debug"
3. Select the "Python: Remote Attach" configuration
4. Start debugging (F5)

## Notes

- Once you hit Ctrl+C, the regular development server (with autoreload) will relaunch.
- Code reloading is not supported during a debugging session, so if you'd like to make changes, hit Ctrl+C in the terminal and restart from step 1.
