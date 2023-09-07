V="1.6"

docker build --platform=linux/amd64 --build-arg skip_dev_deps=true -t "custom-redash:$V" .
docker tag custom-redash:$V danikenan/custom-redash:$V
docker push danikenan/custom-redash:$V