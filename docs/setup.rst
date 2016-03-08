Setting up re:dash instance
###########################

The `provisioning
script <https://raw.githubusercontent.com/getredash/redash/master/setup/ubuntu/bootstrap.sh>`__
works on Ubuntu 12.04, Ubuntu 14.04 and Debian Wheezy. This script
installs all needed dependencies and creates basic setup.

To ease the process, there are also images for AWS and Google Compute
Cloud. These images created with the same provision script using Packer.

Create an instance
==================

AWS
---

Launch the instance with from the pre-baked AMI (for small deployments
t2.micro should be enough):

-  us-east-1: `ami-a7ddfbcd <https://console.aws.amazon.com/ec2/home?region=us-east-1#LaunchInstanceWizard:ami=ami-a7ddfbcd>`__
-  us-west-1: `ami-269feb46 <https://console.aws.amazon.com/ec2/home?region=us-west-1#LaunchInstanceWizard:ami=ami-269feb46>`__
-  us-west-2: `ami-435fba23 <https://console.aws.amazon.com/ec2/home?region=us-west-2#LaunchInstanceWizard:ami=ami-435fba23>`__
-  eu-west-1: `ami-b4c277c7 <https://console.aws.amazon.com/ec2/home?region=eu-west-1#LaunchInstanceWizard:ami=ami-b4c277c7>`__
-  eu-central-1: `ami-07ced76b <https://console.aws.amazon.com/ec2/home?region=eu-central-1#LaunchInstanceWizard:ami=ami-07ced76b>`__
-  sa-east-1: `ami-6e2eaf02 <https://console.aws.amazon.com/ec2/home?region=sa-east-1#LaunchInstanceWizard:ami=ami-6e2eaf02>`__
-  ap-northeast-1: `ami-aa5a64c4 <https://console.aws.amazon.com/ec2/home?region=ap-northeast-1#LaunchInstanceWizard:ami=ami-aa5a64c4>`__
-  ap-southeast-1: `ami-1c45897f <https://console.aws.amazon.com/ec2/home?region=ap-southeast-1#LaunchInstanceWizard:ami=ami-1c45897f>`__
-  ap-southeast-2: `ami-42b79221 <https://console.aws.amazon.com/ec2/home?region=ap-southeast-2#LaunchInstanceWizard:ami=ami-42b79221>`__

(the above AMIs are of version: 0.9.1)

When launching the instance make sure to use a security group, that **only** allows incoming traffic on: port 22 (SSH), 80 (HTTP) and 443 (HTTPS).

Now proceed to `"Setup" <#setup>`__.

Google Compute Engine
---------------------

First, you need to add the images to your account:

.. code:: bash

    $ gcloud compute images create "redash-091-b1377" --source-uri gs://redash-images/redash.0.9.1.b1377.tar.gz

Next you need to launch an instance using this image (n1-standard-1
instance type is recommended). If you plan using re:dash with BigQuery,
you can use a dedicated image which comes with BigQuery preconfigured
(using instance permissions):

.. code:: bash

    $ gcloud compute images create "redash-091-b1377-bq" --source-uri gs://redash-images/redash.0.9.1.b1377-bq.tar.gz

Note that you need to launch this instance with BigQuery access:

.. code:: bash

    $ gcloud compute instances create <your_instance_name> --image redash-091-b1377-bq --scopes storage-ro,bigquery

(the same can be done from the web interface, just make sure to enable
BigQuery access)

Now proceed to `"Setup" <#setup>`__.


Other
-----

Download the provision script and run it on your machine. Note that:

1. You need to run the script as root.
2. It was tested only on Ubuntu 12.04, Ubuntu 14.04 and Debian Wheezy.
3. It's designed to run on a "clean" machine. If you're running this script on a machine that is used for other purposes, you might want to tweak it to your needs (like removing the ``apt-get dist-upgrade`` call at the beginning of it).

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
   can run the command ``pwgen 32 -1`` to generate a random string).

2. By default we create an admin user with the password "admin". You
   can change this password opening the: ``/users/me#password`` page after
   logging in as admin.

3. If you want to use Google OAuth to authenticate users, you need to
   create a Google Developers project (see :doc:`instructions </misc/google_developers_project>`)
   and then add the needed configuration in the ``.env`` file:

.. code::

   export REDASH_GOOGLE_CLIENT_ID=""
   export REDASH_GOOGLE_CLIENT_SECRET=""


4. Configure the domain(s) you want to allow to use with Google Apps, by running the command:

.. code::

   cd /opt/redash/current
   sudo -u redash bin/run ./manage.py org set_google_apps_domains {{domains}}


If you're passing multiple domains, separate them with commas.


5. Restart the web server to apply the configuration changes:
   ``sudo supervisorctl restart redash_server``.

6. Once you have Google OAuth enabled, you can login using your Google
   Apps account. If you want to grant admin permissions to some users,
   you can do this by adding them to the admin group (from ``/groups`` page).

7. If you don't use Google OAuth or just need username/password logins,
   you can create additional users by opening the ``/users/new`` page.

Datasources
-----------

To make re:dash truly useful, you need to setup your data sources in it. Browse to ``/data_sources`` on your instance,
to create new data source connection.

See :doc:`documentation </datasources>` for the different options.
Your instance comes ready with dependencies needed to setup supported sources.

Mail Configuration
------------------

For the system to be able to send emails (for example when alerts trigger), you need to set the mail server to use and the
host name of your re:dash server. If you're using one of our images, you can do this by editing the `.env` file:

.. code::

   # Note that not all values are required, as they have default values.

   export REDASH_MAIL_SERVER="" # default: localhost
   export REDASH_MAIL_PORT="" # default: 25
   export REDASH_MAIL_USE_TLS="" # default: False
   export REDASH_MAIL_USE_SSL="" # default: False
   export REDASH_MAIL_USERNAME="" # default: None
   export REDASH_MAIL_PASSWORD="" # default: None
   export REDASH_MAIL_DEFAULT_SENDER="" # Email address to send from

   export REDASH_HOST="" # base address of your re:dash instance, for example: "https://demo.redash.io"

- Note that not all values are required, as there are default values.
- It's recommended to use some mail service, like `Amazon SES <https://aws.amazon.com/ses/>`__, `Mailgun <http://www.mailgun.com/>`__
  or `Mandrill <http://mandrillapp.com>`__ to send emails to ensure deliverability.

To test email configuration, you can run `bin/run ./manage.py send_test_mail` (from `/opt/redash/current`).

How to upgrade?
---------------

It's recommended to upgrade once in a while your re:dash instance to
benefit from bug fixes and new features. See :doc:`here </upgrade>` for full upgrade
instructions (including Fabric script).

Notes
=====

-  If this is a production setup, you should enforce HTTPS and make sure
   you set the cookie secret (see :doc:`instructions </misc/ssl>`).
