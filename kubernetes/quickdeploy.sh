#!/bin/bash
set -x
echo "arg is"$1
if test $1 = 'undeploy'; then
  i=`ls *service.yaml`;for j in $i; do kubectl delete -f $j;done
  i=`ls *deployment.yaml`;for j in $i; do kubectl delete -f $j;done
elif test $1 = 'deploy'; then
  i=`ls *deployment.yaml`;for j in $i; do kubectl create -f $j;done
  i=`ls *service.yaml`;for j in $i; do kubectl create -f $j;done
elif test $1 = 'rmserv'; then
  i=`ls *service.yaml`;for j in $i; do kubectl delete -f $j;done
elif test $1 = 'crserv'; then
  i=`ls *service.yaml`;for j in $i; do kubectl create -f $j;done
fi
