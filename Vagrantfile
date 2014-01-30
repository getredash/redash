# -*- mode: ruby -*-
# vi: set ft=ruby :

# Vagrantfile API/syntax version. Don't touch unless you know what you're doing!
VAGRANTFILE_API_VERSION = '2'

POSTGRES_PASSWORD     = 'securepass'

# Currently, chef postgress cookbook works with cleartext paswords,
# unless the password begins with 'md5'
# See https://github.com/hw-cookbooks/postgresql/issues/95
require "digest/md5"
postgres_password_md5 = 'md5'+Digest::MD5.hexdigest(POSTGRES_PASSWORD+'postgres')

# After starting the vagrant machine, the application is accessible via the URL
# http://localhost:9999
HOST_PORT_TO_FORWARD_TO_REDASH = 9999

# Deploy direcly the code in parent dir; Don't download a release tarball 
live_testing_deployment = true

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box     = 'ubuntu-precise-cloudimg-amd64'
  config.vm.box_url = 'http://cloud-images.ubuntu.com/vagrant/precise/current/precise-server-cloudimg-amd64-vagrant-disk1.box'
  
  if config.respond_to? :cache
    config.cache.auto_detect  = true
  end
  
  config.berkshelf.enabled    = true
  config.omnibus.chef_version = :latest

  config.vm.network 'forwarded_port', guest: 8888, host: HOST_PORT_TO_FORWARD_TO_REDASH
  
  if live_testing_deployment
    config.vm.synced_folder "..", "/opt/redash"
  end
  
  config.vm.provision :chef_solo do |chef|
     # run apt-get update before anything else (specifically postgresql)..
     chef.add_recipe 'apt'
     chef.add_recipe 'redash::redis_for_redash'
     chef.add_recipe 'postgresql::client'
     chef.add_recipe 'postgresql::server'
     chef.add_recipe 'redash::redash_pg_schema'
     chef.add_recipe 'redash::redash'
     # chef.log_level  = :debug
     chef.json = {
       'apt'        => { 'compiletime' => true },
       'postgresql' => { 'password'    => {'postgres' => postgres_password_md5 } },
       'redash'     => { 'db'          => {'host'     => 'localhost',
                                           'user'     => 'postgres',
                                           'password' => POSTGRES_PASSWORD },
                         'allow'           => {'google_app_domain' => 'gmail.com',
                                               'admins'            => ['joe@egmail.com','jack@gmail.com']},
                         'install_tarball' => !live_testing_deployment,
                         'user'            => live_testing_deployment ? 'vagrant' : 'redash'}
     }
   end
end
