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

    $ gcloud compute images add redash-063-b906 gs://redash-images/redash.0.6.3.b906.tar.gz

Next you need to launch an instance using this image (n1-standard-1
instance type is recommended). If you plan using re:dash with BigQuery,
you can use a dedicated image which comes with BigQuery preconfigured
(using instance permissions):

.. code:: bash

    $ gcloud compute images add redash-063-b906-bq gs://redash-images/redash.0.6.3.b906-bq.tar.gz

Note that you need to launch this instance with BigQuery access:

.. code:: bash

    $ gcloud compute instances create <your_instance_name> --image redash-060-b812-bq --scopes storage-ro bigquery

(the same can be done from the web interface, just make sure to enable
BigQuery access)

Now proceed to `"Setup" <#setup>`__.

AWS
---

Launch the instance with from the pre-baked AMI (for small deployments
t2.micro should be enough):

-  us-east-1:
   `ami-47b4612c <https://console.aws.amazon.com/ec2/home?region=us-east-1#LaunchInstanceWizard:ami=ami-47b4612c>`__
-  us-west-1:
   `ami-a72edde3 <https://console.aws.amazon.com/ec2/home?region=us-west-1#LaunchInstanceWizard:ami=ami-a72edde3>`__
-  us-west-2:
   `ami-f9d6d5c9 <https://console.aws.amazon.com/ec2/home?region=us-west-2#LaunchInstanceWizard:ami=ami-f9d6d5c9>`__
-  eu-central-1:
   `ami-72eed46f <https://console.aws.amazon.com/ec2/home?region=eu-central-1#LaunchInstanceWizard:ami=ami-72eed46f>`__
-  eu-west-1:
   `ami-5a135c2d <https://console.aws.amazon.com/ec2/home?region=eu-west-1#LaunchInstanceWizard:ami=ami-5a135c2d>`__
-  sa-east-1:
   `ami-2b78f436 <https://console.aws.amazon.com/ec2/home?region=sa-east-1#LaunchInstanceWizard:ami=ami-2b78f436>`__
-  ap-northeast-1:
   `ami-0a55fd0a <https://console.aws.amazon.com/ec2/home?region=ap-northeast-1#LaunchInstanceWizard:ami=ami-0a55fd0a>`__
-  ap-southeast-2:
   `ami-9f793ea5 <https://console.aws.amazon.com/ec2/home?region=ap-southeast-2#LaunchInstanceWizard:ami=ami-9f793ea5>`__
-  ap-southeast-1:
   `ami-12545740 <https://console.aws.amazon.com/ec2/home?region=ap-southeast-1#LaunchInstanceWizard:ami=ami-12545740>`__

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
started. You can even login to it with the user "admin" (password:
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

To make re:dash truly useful, you need to setup your data sources in it.
Currently all data sources management is done with the CLI.

See
:doc:`documentation </datasources>`
for the different options. Your instance comes ready with dependencies
needed to setup supported sources.

Follow issue
`#193 <https://github.com/EverythingMe/redash/issues/193>`__ to know
when UI was implemented to manage data sources.

How to upgrade?
---------------

It's recommended to upgrade once in a while your re:dash instance to
benefit from bug fixes and new features. See :doc:`here </upgrade>` for full upgrade
instructions (including Fabric script).

Notes
=====

-  If this is a production setup, you should enforce HTTPS and make sure
   you set the cookie secret (see :doc:`instructions </misc/ssl>`).
