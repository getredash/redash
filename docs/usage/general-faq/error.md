---
categories:
- troubleshooting
collection: general-faq
helpscout_url: https://help.redash.io/article/145-error
keywords: null
name: 'Error: Worker Exited Prematurely: Signal 9 (sigkill)'
slug: error
---
If you see the error message - "Error Running Query: Worker exited
prematurely: signal 9 (SIGKILL)" this might indicate the query runner ran out
of memory - this usually happens with large result sets.

Try to run the query once more to make sure it wasn't some momentary thing.

