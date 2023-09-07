V=$1


if [ "x$V" = "x" ] ; then echo "Error: Version must be specified as argument" && exit 1; fi

echo "Version: $V";

docker build --platform=linux/amd64 --build-arg skip_dev_deps=true -t "custom-redash:$V" .
docker tag custom-redash:$V danikenan/custom-redash:$V
docker push danikenan/custom-redash:$V