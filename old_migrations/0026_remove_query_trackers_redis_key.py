from redash import redis_connection

if __name__ == '__main__':
    redis_connection.delete('query_task_trackers')