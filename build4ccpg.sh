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
      case $1 in
      -p | -P)
           echo "product env.. use ip "
           sed -i 's/192.168.5.241/10.11.3.146/' ccpgPj/*.html
           sed -i 's/var queryId = 22/var queryId = 1/' ccpgPj/*.html
           sed -i 's/86azADZ3umXfbWvW3qnABGVC4EkNxiMVALbFYATj/HStbC9PzjutsRnFpq3Ntx7tmbMBjvxsMNtA6cUb5/' ccpgPj/*.html

           ;;
      -T | -t)
           echo "test env .. use ip."
           sed -i 's/10.11.3.146/192.168.5.241/' ccpgPj/*.html
           sed -i 's/var queryId = 1/var queryId = 22/' ccpgPj/*.html
           sed -i 's/HStbC9PzjutsRnFpq3Ntx7tmbMBjvxsMNtA6cUb5/86azADZ3umXfbWvW3qnABGVC4EkNxiMVALbFYATj/' ccpgPj/*.html
           ;;
      *)
          ;;
      esac
      cp -rf ccpgPj/*.html client/dist
      if [ ! -d "client/dist/static" ]; then
         mkdir "client/dist/static"
         echo ""
      fi
      cp -rf ccpgPj/*.js  client/dist/static
      cp -rf ccpgPj/*.js  client/dist 
      cp -rf ccpgPj/*.png client/dist/static
      cp -rf ccpgPj/*.png client/dist
      cp -rf ccpgPj/*.gif client/dist/static
      cp -rf ccpgPj/*.gif client/dist

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
      cpCCPGprj $2
      ;;
-b | -B)
    echo "Packing... " 
    if [ ! -d "node_modules" ];then
       echo "node_modules not exist, return"
       exit 1
    fi  
    npm run build | tee npm_run_build.log 
    cpCCPGprj $2
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

