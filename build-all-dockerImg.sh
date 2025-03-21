#!/bin/bash
bold=$(tput bold)
normal=$(tput sgr0)
underline=$(tput smul)
red=$(tput setaf 1)
blue=$(tput setaf 4)
white=$(tput setaf 7)

echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃ 🟡  Build and push Docker images in         ┃"
echo "┃     all Sacelway environement               ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"

DATE=$(date '+%Y.%m.%d-%H.%M.%S')
DOCKER_VERSION=$DATE

./build-push-dockerImg.sh preview    $DOCKER_VERSION
if ! [ $? -eq 0 ]; then exit 1; fi

./build-push-dockerImg.sh staging    $DOCKER_VERSION
if ! [ $? -eq 0 ]; then exit 1; fi

./build-push-dockerImg.sh production $DOCKER_VERSION
if ! [ $? -eq 0 ]; then exit 1; fi

echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃ 😀  Redash Docker images pushed  ┃"
echo "┠──────────────────────────────────┨"
echo "┃ ✅ ${blue}${bold}redash:$DOCKER_VERSION${normal}"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
