# rq info command returns monitoring status of redash workers and other status checks
# Sample Output
# redash@redash-adhocworker-778fc5dbb6-jpscq:/app$ rq info --url $REDASH_REDIS_URL -R
# queries      | 0
# default      | 2
# periodic     |██████████████████ 748
# emails       | 0
# schemas      | 0
# 5 queues, 750 jobs total

# queries:  1a6d953d53984424ab775d3647427e7b (idle), 29dbf1ec1f774bacbd91ca36ccef6e43 (idle)
# default:  –
# periodic: –
# emails:   –
# schemas:  –
# 2 workers, 5 queues

WORKERS_COUNT=${WORKERS_COUNT}
echo "Checking active workers count against $WORKERS_COUNT..."
ACTIVE_WORKERS_COUNT=`echo $(rq info --url $REDASH_REDIS_URL -R | grep workers | grep -oP ^[0-9]+)`
if [ "$ACTIVE_WORKERS_COUNT" < "$WORKERS_COUNT"  ]; then
  echo "$ACTIVE_WORKERS_COUNT workers are active, Exiting"
  exit 1
else
  echo "$ACTIVE_WORKERS_COUNT workers are active"
  exit 0
fi