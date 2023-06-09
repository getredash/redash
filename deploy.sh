#!/bin/sh

remote_address="ec2-3-67-41-59.eu-central-1.compute.amazonaws.com"
image_name="kevinand11/redash:latest"

docker build --platform linux/amd64 -t $image_name .
docker push $image_name

ssh -i deploy-keys.pem -T ubuntu@$remote_address <<'EOL'
	cd /opt/redash
	sudo docker image pull kevinand11/redash:latest
	sudo docker-compose down
	sudo docker-compose up -d
EOL