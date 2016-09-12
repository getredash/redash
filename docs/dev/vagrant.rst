Setting up development environment (using Vagrant)
==================================================

To simplify contribution there is a `Vagrant
box <https://vagrantcloud.com/redash/boxes/dev>`__ available with all
the needed software to run Re:dash for development (use it only for
development, for demo purposes there is
`redash/demo <https://vagrantcloud.com/redash/boxes/demo>`__ box and the
AWS/GCE images).

To get started with this box:

1. Make sure you have recent version of
   `Vagrant <https://www.vagrantup.com/>`__ installed.
2. Clone the Re:dash repository:
   ``git clone https://github.com/getredash/redash.git``.
3. Change dir into the repository (``cd redash``)
4. To execute tests, run ``./bin/vagrant_ctl.sh test``
5. To run the app, run ``./bin/vagrant_ctl.sh start``.
   This might take some time the first time you run it,
   as it downloads the Vagrant virtual box.
   Now the server should be available on your host on port 9001 and you
   can login with username admin and password admin.
