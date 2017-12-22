

## Intro

With Google, Amazon, IBM and others offering kubernetes to run dockerized services 

### Install

Assuming kubectl is configured properly, run the quickdeploy script with 

`./quickdeploy.sh deploy`

After deployment redash tables are not yet created, so the admin user is missing, too. To fix that run

`kubectl get pods`

to get a list of pods including the pod for the redash server. Now start a shell 'inside' the container and run

`kubectl exec <redash-513715675-4l5gp> -ti bash`

with `<redash-513715675-4l5gp>` replaced by correct name of the pod.

Run

    ./bin/run python manage.py database create_tables
    ./bin/run python manage.py users create --admin --password admin "Admin" "admin"

to create tables and the admin users

### Usage

The nodePort property specified for the redash services should forward port 5000 to a port chosen by kubernetes. To find out the correct external port, use

`kubectl describe service redash`

Alternatively make use of port forwarding with

`kubectl port-forward <redash-513715675-4l5gp> 5000:5000`

and use localhost:5000 in your browser.


### ToDos

  * Obviously database and admin user should be created automatically.
  * nodePort should be replaced with a loadbalancer/ingress controller setup. However nodePort is a free tier configuration on many kubernetes offerings while ingress controller is not.
