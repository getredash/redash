import logging

from redash import settings
from redash.destinations import *

import json
import requests
import urllib
import datetime
import os

class Telegram(BaseDestination):

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "chat_id": {
                    "type": "string",
                    "title": "Chat ID"
                },
                "allow_back_to_normal": {
                    "type": "string",
                    "title": "Allow \"BACK TO NORMAL\" notifications?\nIt will be sent when the alert goes from \"TRIGGERED\" status to \"OK\" status.\n(yes/no, case insensitive)",
                    "default": "no" 
                }, 
                "allow_download_links": {
                    "type": "string",
                    "title": "Allow query result download links in notifications?\nQuery result download is available in .csv, .xlsx, and .json files.\nOnly privileged logged-in users can download the files.\n(yes/no, case insensitive)",
                    "default": "no"
                }
            },
            "required": ["chat_id"]
        }

    @classmethod
    def icon(cls):
        return 'fa-bolt'

    def notify(self, alert, query, user, new_state, app, host, options):
        recipients = [chat_id for chat_id in options.get('chat_id', '').split(',') if chat_id]

        if not recipients:
            logging.warning("No chat ID given. Skipping send.")

        domain_name = host.split('.')[0].replace("https://","") 

        essence = "*{alert_name}* @ {domain_name}  \n[Configure alert]({host}/alerts/{alert_id})\n\n*{state}* {date} (UTC+0 time)\n\nQuery link:  \n{host}/queries/{query_id}"
        
        if str(options.get('allow_download_links')).lower() == "yes":
          result_csv = "{host}/api/queries/{query_id}/results/{result_id}.csv".format(host=host,query_id=query.id,result_id=query.latest_query_data_id)
          result_xlsx = "{host}/api/queries/{query_id}/results/{result_id}.xlsx".format(host=host,query_id=query.id,result_id=query.latest_query_data_id)
          result_json = "{host}/api/queries/{query_id}/results/{result_id}.json".format(host=host,query_id=query.id,result_id=query.latest_query_data_id)
   
          essence += "  \nDownload query result in .csv:  \n[CSV download]({result_csv})".format(result_csv=result_csv)
          essence += "  \nDownload query result in .xlsx:  \n[XLSX download]({result_xlsx})".format(result_xlsx=result_xlsx)
          essence += "  \nDownload query result in .json:  \n[JSON download]({result_json})".format(result_json=result_json)
      
        send = True 

        if new_state == "triggered":
          essence = essence.format(alert_name=alert.name, domain_name=domain_name, host=host, alert_id=alert.id, state="TRIGGERED", date=str(datetime.datetime.utcnow()), query_id=query.id)
        else:
          if str(options.get('allow_back_to_normal')).lower() == "yes": 
            essence = essence.format(alert_name=alert.name, domain_name=domain_name, host=host, alert_id=alert.id, state="BACK TO NORMAL", date=str(datetime.datetime.utcnow()), query_id=query.id)
          else:
            send = False

        logging.debug("Notifying: %s", recipients)
        
        if send:
          try:
            TOKEN = os.environ.get('REDASH_BOT_EXTRA_SECRET_SPELL', '')
            URL = "https://api.telegram.org/bot{}/".format(TOKEN)

            text = urllib.pathname2url(essence)

            for chat_id in recipients:
              url = URL + "sendMessage?text={}&chat_id={}&parse_mode=markdown".format(text, chat_id)
              requests.get(url)
          except Exception:
              logging.exception("Telegram send error.")

register(Telegram)
