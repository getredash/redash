Setting up development environment (using Vagrant)
==================================================

To simplify contribution there is a `Vagrant
box <https://vagrantcloud.com/redash/boxes/dev>`__ available with all
the needed software to run re:dash for development (use it only for
development, for demo purposes there is
`redash/demo <https://vagrantcloud.com/redash/boxes/demo>`__ box and the
AWS/GCE images).

To get started with this box:

1.  Make sure you have recent version of
    `Vagrant <https://www.vagrantup.com/>`__ installed.
2.  Clone the re:dash repository:
    ``git clone https://github.com/getredash/redash.git``.
3.  Change dir into the repository (``cd redash``) and run run
    ``vagrant up``. This might take some time the first time you run it,
    as it downloads the Vagrant virtual box.
4.  Once Vagrant is ready, ssh into the instance (``vagrant ssh``), and
    change dir to ``/opt/redash/current`` -- this is where your local
    repository copy synced to.
5.  Copy ``.env`` file into this directory (``cp ../.env ./``).
6.  From ``/opt/redash/current/rd_ui`` run ``bower install`` to install
    frontend packages. This can be done from your host machine as well,
    if you have bower installed.
7.  Go back to ``/opt/redash/current`` and install python dependencies
    ``sudo pip install -r requirements.txt``
8.  Apply migrations

    ::

        export PYTHONPATH=. && find migrations/ -type f  | grep 00 --null | xargs -I file bin/run python file

9.  Start the server and background workers with
    ``bin/run honcho start -f Procfile.dev``.
10. Now the server should be available on your host on port 9001 and you
    can login with username admin and password admin.
