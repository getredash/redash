
default["redash"]["install_path"]    = "/opt"

default["redash"]["user"]            = "redash"

default['redash']['redis_url']       = "redis://localhost:6379"

default['redash']['db']['user']      = "redash"
default['redash']['db']['password']  = "secureredisecure"
#default['redash']['db']['host']      = "localhost"
default['redash']['db']['port']      = 5432
default['redash']['db']['dbname']    = "redash_db0"
default['redash']['cfg']['dbname']   = "redash_cfgdb0"
default['redash']['cfg']['user']     = "redash"
default['redash']['cfg']['password'] = "secureredisecure"
default['redash']['cfg']['host']     = node['redash']['db']['host']
default['redash']['cfg']['port']     = 5432
default['redash']['db']['postgres_pwd']  = node['postgresql']['password']['postgres']
default['redash']['cfg']['postgres_pwd'] = node['postgresql']['password']['postgres']


#Accept logins from open id's verified by google accounts:
default['redash']['allow']['google_app_domain'] = "everything.me"
#Two strings with python list inside...:
default['redash']['allow']['google_app_users']  = ['joe@gmail.com','max@gmail.com']
default['redash']['allow']['admins']            = ['timor@everything.me','arik@everything.me']

default['redash']['workers_count']   = 2
default['redash']['max_connections'] = 3

default['redash']['cookie_secret']   = "c292a0a3aa32397cdb050e233733900f"

default['redash']['server']['log']   = node['redash']['install_path']+"/redash/log/server.log"
default['redash']['worker']['log']   = node['redash']['install_path']+"/redash/log/worker.log"

default['redash']['server']['py']    = "./main"
default['redash']['worker']['py']    = "./main"

default['redash']['svlog_opt']       = "-tt"