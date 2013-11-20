#
# Cookbook Name:: redash
# Recipe:: default
#

include_recipe "postgresql::client"
include_recipe "python"
include_recipe "runit"

#Enable cheff to interact with pg:
include_recipe "database::postgresql"

#Download and deploy the redash release
#TODO: version should be acc. to what's in metadata.rb

#TODO: install path should be a configurable attribute
user node['redash']['user'] do
  system true
end


#Ark fails due to errors in remote_file not telling rest-client to expect binary..
#solution: use an older rest-client..
chef_gem "rest-client__p" do
  action       :purge
  package_name "rest-client"
end
chef_gem "rest-client__i" do
  action       :install
  package_name "rest-client"
  version      "1.5.0"
end

ark "bla" do
  #url     "http://github.com/EverythingMe/redash/releases/download/v0.1.35/redash.35.tar.gz"
  #url     "http://www.xmlcan.ca/~timor/redash.35.tar.gz"
  url     "http://www.xmlcan.ca/~timor/bla.tar.gz"
  action  :put
  path    node["redash"]["install_path"]
  
  #Due to peculiarity of the way the archive gets created:
  strip_leading_dir false
end

#Install dependencies acc. to file:
bash ":install pip dependencies" do 
  code <<-EOS
  cd #{node["redash"]["install_path"]}/redash
  pip install -r ./rd_service/requirements.txt
  EOS
end

#Configure:
template "#{node["redash"]["install_path"]}/redash/rd_service/settings.py" do
  source "settings.py.erb"
end

#Setup pg user(s) and database(s):
pg_db_super_connection = {
  :host     => node['redash']['db']['host'],
  :port     => node['redash']['db']['port'],
  :username => 'postgres',
  :password => node['redash']['db']['postgres_pwd']
}
pg_cfg_super_connection = {
  :host     => node['redash']['cfg']['host'],
  :port     => node['redash']['cfg']['port'],
  :username => 'postgres',
  :password => node['redash']['cfg']['postgres_pwd']
}

#The data db:
postgresql_database node['redash']['db']['dbname'] do
  connection  pg_db_super_connection
  action      :create
end

#The configuration db:
postgresql_database node['redash']['cfg']['dbname'] do
  connection  pg_cfg_super_connection
  action      :create
end


postgresql_database_user "redash_db_user" do
  username       node['redash']['db']['user']
  connection     pg_db_super_connection
  password       node['redash']['db']['password']
  database_name  node['redash']['db']['dbname']
  privileges     [:all]
  action         [:create,:grant]
end

postgresql_database_user "redash_cfg_user" do
  username       node['redash']['cfg']['user']
  connection     pg_cfg_super_connection
  password       node['redash']['cfg']['password']
  database_name  node['redash']['cfg']['dbname']
  privileges     [:all]
  action         [:create,:grant]
end


#Initialize the DB, connecting as normal user:
#Setup pg user(s) and database(s):
pg_db_connection = {
  :host     => node['redash']['db']['host'],
  :port     => node['redash']['db']['port'],
  :user     => node['redash']['db']['user'],
  :password => node['redash']['db']['password'],
  :dbname   => node['redash']['cfg']['dbname']
}
constr = pg_db_connection.map{|(k,v)| "#{k}=#{v}"}.join(" ")
bash ":initialize db" do 
  code <<-EOS
  cd #{node["redash"]["install_path"]}/redash
  
  psql "#{constr}" < ./rd_service/data/tables.sql
  EOS
end


#Install runit scripts and bring the system up:
runit_service "redash-server"
runit_service "redash-worker"
