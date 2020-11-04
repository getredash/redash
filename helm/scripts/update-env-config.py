import urllib.request
import re


def upper_repl(match):
    return match.group(1).upper()


vars = []
# Add some undocumented/operational values
vars.append({
    'name': 'secretKey',
    'env': 'REDASH_SECRET_KEY',
    'desc': 'Secret key used for data encryption',
    'default': '',
    'secret': True,
    'required': True,
})
# Parse the docs and build a list of environment variables
with urllib.request.urlopen('https://raw.githubusercontent.com/getredash/website/master/src/pages/kb/open-source/admin-guide/env-vars-settings.md') as response:
    data = response.read().decode('utf-8')
    for line in data.splitlines():
        m = re.match(
            r"^\s*[|]\s*[`](REDASH_.+)[`]\s*[|]\s([^|]*)\s*[|]\s([^|]*)", line)
        if m:
            name = env = m.group(1).strip()
            desc = m.group(2).strip()
            default = m.group(3).strip()
            if env in ['REDASH_REDIS_URL', 'REDASH_DATABASE_URL']:
                continue
            secret = False
            if env in ['REDASH_LDAP_BIND_DN_PASSWORD', 'REDASH_MAIL_PASSWORD', 'REDASH_GOOGLE_CLIENT_SECRET', 'REDASH_COOKIE_SECRET', 'REDASH_SECRET_KEY']:
                secret = True
            required = False
            if env in ['REDASH_COOKIE_SECRET', 'REDASH_SECRET_KEY']:
                required = True
                # Unset default to make this clear
                default = ''
            name = re.sub(r"REDASH_", "", name).lower()
            name = re.sub(r"_([a-z])", upper_repl, name)
            vars.append({
                'name': name,
                'env': env,
                'desc': desc,
                'default': default,
                'secret': secret,
                'required': required,
            })

# Replace lines between markers with config based on the docs
start_token = '## Start primary Redash configuration'
end_token = '## End primary Redash configuration'

print("values.yaml snippet")
print()
config = [start_token]
for var in vars:
    required = ""
    if var['required']:
        required = "REQUIRED "
    comment = "  # redash.%s -- %s`%s` value. Defaults to `%s`." % (
        var['name'], required, var['env'], var['default'])
    if len(var['desc']) > 0:
        comment += " %s." % (var['desc'].capitalize())
    if var['secret']:
        comment += " Stored as a Secret value."
    config.append(comment)
    config.append('  %s:' % (var['name']))
config.append('  ## End primary Redash configuration')

values = open("values.yaml", 'r+')
content = re.sub(start_token + '.*' + end_token,
                 "\n".join(config), values.read(), flags=re.DOTALL)
values.seek(0)
values.truncate()
values.write(content)
values.close()

print("secrets.yaml snippet")
print()
config = [start_token]
for var in vars:
    required = 'default "" '
    if var['required']:
        config.append('  {{ $null := required "A value for one of the following variables is required: redash.%s (secure random value), redash.existingSecret (secret name)" (or .Values.redash.%s .Values.redash.existingSecret) }}' % (
            var['name'], var['name']))
    if var['secret']:
        config.append('  %s: {{ default "" .Values.redash.%s | b64enc | quote }}' % (
            var['name'], var['name']))
config.append('  ## End primary Redash configuration')

secrets = open("templates/secrets.yaml", 'r+')
content = re.sub(start_token + '.*' + end_token,
                 "\n".join(config), secrets.read(), flags=re.DOTALL)
secrets.seek(0)
secrets.truncate()
secrets.write(content)
secrets.close()

print("_helpers.tpl snippet")
print()

config = [start_token]
for var in vars:
    if var['secret']:
        config.append(
            "{{- if or .Values.redash.%s .Values.redash.existingSecret }}" % (var['name']))
        config.append("- name: %s" % (var['env']))
        config.append('  valueFrom:')
        config.append('    secretKeyRef:')
        config.append(
            '      name: {{ include "redash.secretName" . }}')
        config.append('      key: %s' % (var['name']))
    else:
        config.append(
            "{{- if .Values.redash.%s }}" % (var['name']))
        config.append("- name: %s" % (var['env']))
        config.append(
            "  value: {{ default "" .Values.redash.%s | quote }}" % (var['name']))
    config.append("{{- end }}")
config.append('## End primary Redash configuration')

secrets = open("templates/_helpers.tpl", 'r+')
content = re.sub(start_token + '.*' + end_token,
                 "\n".join(config), secrets.read(), flags=re.DOTALL)
secrets.seek(0)
secrets.truncate()
secrets.write(content)
secrets.close()
