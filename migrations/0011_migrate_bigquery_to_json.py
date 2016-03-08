from base64 import b64encode
import json
from redash.models import DataSource


def convert_p12_to_pem(p12file):
    from OpenSSL import crypto
    with open(p12file, 'rb') as f:
        p12 = crypto.load_pkcs12(f.read(), "notasecret")

    return crypto.dump_privatekey(crypto.FILETYPE_PEM, p12.get_privatekey())

if __name__ == '__main__':

    for ds in DataSource.select(DataSource.id, DataSource.type, DataSource.options):

        if ds.type == 'bigquery':
            options = json.loads(ds.options)

            if 'jsonKeyFile' in options:
                continue

            new_options = {
                'projectId': options['projectId'],
                'jsonKeyFile': b64encode(json.dumps({
                    'client_email': options['serviceAccount'],
                    'private_key': convert_p12_to_pem(options['privateKey'])
                }))
            }

            ds.options = json.dumps(new_options)
            ds.save(only=ds.dirty_fields)
        elif ds.type == 'google_spreadsheets':
            options = json.loads(ds.options)
            if 'jsonKeyFile' in options:
                continue

            with open(options['credentialsFilePath']) as f:
                new_options = {
                    'jsonKeyFile': b64encode(f.read())
                }

            ds.options = json.dumps(new_options)
            ds.save(only=ds.dirty_fields)
