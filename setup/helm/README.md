## Redash's Helm chart


To run the chart in a Kubernetes cluster with Helm installed : 

```
git clone https://github.com/getredash/redash.git
cd redash/setup/helm
# Edit values.yaml
helm install -n redash.domain.tld --namespace my-redash  . 
```

```
$- kubectl -n my-redash get pod

NAME                                READY     STATUS    RESTARTS   AGE
redash-77857b9745-5kk9l             1/1       Running   0          3h
redash-db-5dcdf449b6-dfvs9          1/1       Running   0          5h
redash-redis-794d777dd9-8pq62       1/1       Running   0          5h
redash-scheduler-5f947996f7-mmgmc   1/1       Running   0          5h
```

