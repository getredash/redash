#!/bin/bash
# Script to capture stack traces from hanging tests in Docker container
#
# Usage: ./debug_docker_test.sh

CONTAINER_NAME="tests"

echo "Looking for tests container..."
CONTAINER_ID=$(docker ps --filter name=$CONTAINER_NAME --format "{{.ID}}")

if [ -z "$CONTAINER_ID" ]; then
    echo "No running container found with name: $CONTAINER_NAME"
    exit 1
fi

echo "Found container: $CONTAINER_ID"
echo ""

echo "Sending SIGUSR1 signal to trigger stack dump..."
docker exec $CONTAINER_NAME python3 -c "import os, signal; os.kill(1, signal.SIGUSR1); print('SIGUSR1 sent')"

echo ""
echo "Waiting 2 seconds for stack trace..."
sleep 2

echo ""
echo "=== Last 100 lines of container logs ==="
docker logs --tail 100 $CONTAINER_NAME 2>&1

echo ""
echo "=== Database Lock Information ==="
docker exec redash-postgres-1 psql -U postgres -d tests -c "
SELECT pid, state, wait_event_type, wait_event, 
       substring(query, 1, 100) as query_preview
FROM pg_stat_activity 
WHERE datname = 'tests' AND state != 'idle' 
ORDER BY query_start;
"

echo ""
echo "=== Blocked Locks ==="
docker exec redash-postgres-1 psql -U postgres -d tests -c "
SELECT locktype, relation::regclass, mode, granted, pid 
FROM pg_locks 
WHERE NOT granted 
ORDER BY pid;
"

echo ""
echo "To stop the hanging test: docker stop $CONTAINER_NAME"
