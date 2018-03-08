#!/bin/sh

echo "Redash cmdline for ccpg "
echo "you can use -B/b for webpacking , -R/r for restarting , -D/d for restart in node-debugging mode, -S/s to stop the redash"
case $1 in
-s | -S)
      echo "ShutDown redash ...  "
      ps aux|grep redash|awk '{print $2}'|xargs kill -9
      ps aux|grep celery|awk '{print $2}'|xargs kill -9
      ;;

-b | -B)
    echo "Packing... " 
    if [ ! -d "node_modules" ];then
       echo "node_modules not exist, return"
       exit 1
    fi  
    ps aux|grep redash|awk '{print $2}'|xargs kill -9
    ps aux|grep celery|awk '{print $2}'|xargs kill -9

    npm run build | tee npm_run_build.log 
    ps aux|grep node|awk '{print $2}'|xargs kill -9
    ;;
-R | -r)
    echo "Run ..."
    echo "to kill the redash related processes..." 
    ps aux|grep redash|awk '{print $2}'|xargs kill -9
    ps aux|grep celery|awk '{print $2}'|xargs kill -9

    echo "@ to run the celery and server"
    export SQLALCHEMY_MAX_OVERFLOW=200
    export SQLALCHEMY_POOL_SIZE=100
    nohup ./bin/run  celery worker --app=redash.worker --beat -Qscheduled_queries,queries,celery -c2 2>&1| tee redash_worker.log >/dev/null & nohup ./bin/run ./manage.py runserver --with-threads -h 0.0.0.0 -p 8080 2>&1 | tee redash_server.log >/dev/null &
    ;;
-D | -d)
     echo "to kill the redash related process..."
     ps aux|grep redash|awk '{print $2}'|xargs kill -9
     ps aux|grep celery|awk '{print $2}'|xargs kill -9
     export SQLALCHEMY_MAX_OVERFLOW=200
     export SQLALCHEMY_POOL_SIZE=100
   
   #  ps aux|grep node|awk '{print $2}'|xargs kill -9&
     
     echo "Debug Mode.. you may modify the webpack related files first : webpack.config.js and package.json "
#     unset $REDASH_BACKEND
     echo "to run server"
     nohup ./bin/run ./manage.py runserver --debugger --reload --with-threads  2>&1| tee redash_server.log >/dev/null & nohup ./bin/run celery worker --app=redash.worker --beat -Qscheduled_queries,queries,celery -c2 2>&1| tee redash_worker.log >/dev/null& nohup npm run start 2>&1| tee npm_run.log >/dev/null&
      ;;
*)
    echo "illegal command!"  
    ;;
esac

