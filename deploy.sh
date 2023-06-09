#!/bin/sh

remote_address="ec2-3-66-216-60.eu-central-1.compute.amazonaws.com"
image_name="kevinand11/redash"
version=$(docker images | awk '($1 == "kevinand11/redash") {print $2 += .01; exit}')

docker build --platform=linux/amd64 -t "$image_name:$version" .
docker tag $image_name:"$version" $image_name:latest

docker push $image_name:"$version"
docker push $image_name:latest

ssh -i deploy-keys.pem -T ubuntu@$remote_address <<'EOL'
	cd /opt/redash
	sudo docker image pull kevinand11/redash:latest
	sudo docker-compose down
	sudo docker-compose up -d
EOL