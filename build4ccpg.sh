#!/bin/sh

echo "Redash cmdline for ccpg "
echo "you can use -B/b for webpacking , -R/r for restarting , -D/d for restart in node-debugging mode, -S/s to stop the redash"

killall()
{
  ps aux|grep redash|awk '{print $2}'|xargs kill -9
  ps aux|grep celery|awk '{print $2}'|xargs kill -9
}
cpCCPGprj()
{
   if [ -d "ccpgPj" ]; then
      echo "cp pj.."
      cp -rf ccpgPj/*.html client/dist
      if [ ! -d "client/dist/static" ]; then
         mkdir "client/dist/static"
         echo ""
      fi
      cp -rf ccpgPj/*.js  client/dist/static
   fi
}
envExp()
{
   export SQLALCHEMY_MAX_OVERFLOW=200
   export SQLALCHEMY_POOL_SIZE=100
}

startWorker()
{
   nohup ./bin/run  celery worker --app=redash.worker --beat -Qscheduled_queries,queries,celery -c2 2>&1 | tee redash_worker.log >/dev/null &
}
startServer()
{
   echo $1
   echo $2
   echo $3 
   nohup ./bin/run ./manage.py runserver --with-threads -h 0.0.0.0 -p 8080 $1 $2 $3 2>&1 | tee redash_server.log >/dev/null & 
}

case $1 in
-s | -S)
      echo "ShutDown redash ...  "
      killall
      ;;
-P | -p)
      echo "Patch ...  "
      cpCCPGprj
      ;;
-b | -B)
    echo "Packing... " 
    if [ ! -d "node_modules" ];then
       echo "node_modules not exist, return"
       exit 1
    fi  
    npm run build | tee npm_run_build.log 
    cpCCPGprj
    ps aux|grep node|awk '{print $2}'|xargs kill -9
    ;;
-R | -r)
    echo "Run ..."
    echo "to kill the redash related processes..." 
    killall
    echo "@ to run the celery and server"
    envExp
    startServer 
    startWorker
    ;;
-D | -d)
     echo "to kill the redash related process..."
     killall
     envExp 
     echo "Debug Mode.. you may modify the webpack related files first : webpack.config.js and package.json "
     echo "to run server"
     startServer --debugger --reload 
     startWorker
     ;;
*)
    echo "illegal command!"  
    ;;
esac

