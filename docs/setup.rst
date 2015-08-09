Setting up re:dash instance
###########################

The `provisioning
script <https://github.com/EverythingMe/redash/blob/master/setup/bootstrap.sh>`__
works on Ubuntu 12.04, Ubuntu 14.04 and Debian Wheezy. This script
installs all needed dependencies and creates basic setup.

To ease the process, there are also images for AWS and Google Compute
Cloud. These images created with the same provision script using Packer.

Create an instance
==================

Google Compute Engine
---------------------

First, you need to add the images to your account:

.. code:: bash

    $ gcloud compute images create "redash-071-b1015" --source-uri gs://redash-images/redash.0.7.1.b1015.tar.gz

Next you need to launch an instance using this image (n1-standard-1
instance type is recommended). If you plan using re:dash with BigQuery,
you can use a dedicated image which comes with BigQuery preconfigured
(using instance permissions):

.. code:: bash

    $ gcloud compute images create "redash-071-b1015-bq" gs://redash-images/redash.0.7.1.b1015-bq.tar.gz

Note that you need to launch this instance with BigQuery access:

.. code:: bash

    $ gcloud compute instances create <your_instance_name> --image redash-071-b1015-bq --scopes storage-ro bigquery

(the same can be done from the web interface, just make sure to enable
BigQuery access)

Now proceed to `"Setup" <#setup>`__.

AWS
---

Launch the instance with from the pre-baked AMI (for small deployments
t2.micro should be enough):

-  us-east-1: `ami-95e04efe <https://console.aws.amazon.com/ec2/home?region=us-east-1#LaunchInstanceWizard:ami=ami-95e04efe>`__
-  us-west-2: `ami-01d8d331 <https://console.aws.amazon.com/ec2/home?region=us-west-2#LaunchInstanceWizard:ami=ami-01d8d331>`__
-  us-west-1: `ami-b35ea1f7 <https://console.aws.amazon.com/ec2/home?region=us-west-1#LaunchInstanceWizard:ami=ami-b35ea1f7>`__
-  eu-west-1: `ami-d46734a3 <https://console.aws.amazon.com/ec2/home?region=eu-west-1#LaunchInstanceWizard:ami=ami-d46734a3>`__
-  eu-central-1: `ami-7e494e63 <https://console.aws.amazon.com/ec2/home?region=eu-central-1#LaunchInstanceWizard:ami=ami-7e494e63>`__
-  ap-southeast-1: `ami-30343b62 <https://console.aws.amazon.com/ec2/home?region=ap-southeast-1#LaunchInstanceWizard:ami=ami-30343b62>`__
-  ap-southeast-2: `ami-53357669 <https://console.aws.amazon.com/ec2/home?region=ap-southeast-2#LaunchInstanceWizard:ami=ami-53357669>`__
-  ap-northeast-1: `ami-4253ea42 <https://console.aws.amazon.com/ec2/home?region=ap-northeast-1#LaunchInstanceWizard:ami=ami-4253ea42>`__
-  sa-east-1: `ami-b170f9ac <https://console.aws.amazon.com/ec2/home?region=sa-east-1#LaunchInstanceWizard:ami=ami-b170f9ac>`__

Now proceed to `"Setup" <#setup>`__.

Other
-----

Download the provision script and run it on your machine. Note that:

1. You need to run the script as root.
2. It was tested only on Ubuntu 12.04, Ubuntu 14.04 and Debian Wheezy.

Setup
=====

Once you created the instance with either the image or the script, you
should have a running re:dash instance with everything you need to get
started. You can now login to it with the user "admin" (password:
"admin"). But to make it useful, there are a few more steps that you
need to manually do to complete the setup:

First ssh to your instance and change directory to ``/opt/redash``. If
you're using the GCE image, switch to root (``sudo su``).

Users & Google Authentication setup
-----------------------------------

Most of the settings you need to edit are in the ``/opt/redash/.env``
file.

1. Update the cookie secret (important! otherwise anyone can sign new
   cookies and impersonate users): change "veryverysecret" in the line:
   ``export REDASH_COOKIE_SECRET=veryverysecret`` to something else (you
   can use ``pwgen 32 -1`` to generate random string).

2. By default we create an admin user with the password "admin". You
   need to change the password:

   -  ``cd /opt/redash/current``
   -  ``sudo -u redash bin/run ./manage.py users password admin {new password}``

3. If you want to use Google OAuth to authenticate users, you need to
   create a Google Developers project (see :doc:`instructions </misc/google_developers_project>`)
   and then add the needed configuration in the ``.env`` file:

.. code::

   export REDASH_GOOGLE_CLIENT_ID=""
   export REDASH_GOOGLE_CLIENT_SECRET=""
   export REDASH_GOOGLE_APPS_DOMAIN=""



``REDASH_GOOGLE_CLIENT_ID`` and ``REDASH_GOOGLE_CLIENT_SECRET`` are the values you get after registering with Google. ``READASH_GOOGLE_APPS_DOMAIN`` is used in case you want to limit access to single Google apps domain (*if you leave it empty anyone with a Google account can access your instance*).

4. Restart the web server to apply the configuration changes:
   ``sudo supervisorctl restart redash_server``.

5. Once you have Google OAuth enabled, you can login using your Google
   Apps account. If you want to grant admin permissions to some users,
   you can do it with the ``users grant_admin`` command:
   ``sudo -u redash bin/run ./manage.py users grant_admin {email}``.

6. If you don't use Google OAuth or just need username/password logins,
   you can create additional users using the CLI (see :doc:`documentation </usage/users>`).

Datasources
-----------

To make re:dash truly useful, you need to setup your data sources in it. Browse to ``/data_sources`` on your instance,
to create new data source connection.

See
:doc:`documentation </datasources>`
for the different options. Your instance comes ready with dependencies
needed to setup supported sources.

How to upgrade?
---------------

It's recommended to upgrade once in a while your re:dash instance to
benefit from bug fixes and new features. See :doc:`here </upgrade>` for full upgrade
instructions (including Fabric script).

Notes
=====

-  If this is a production setup, you should enforce HTTPS and make sure
   you set the cookie secret (see :doc:`instructions </misc/ssl>`).
