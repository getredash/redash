#!/bin/bash
# ------ Needs to be run from redash.txt folder context! ------
[ "$UID" -eq 0 ] || exec sudo bash "$0" "$@" # Eleveta to root

echo "Decoding text file..."
base64 -d < redash.txt > redash.txt.tar.gz
apt install pv > /dev/null
if hash pv ; then ext_cmd=pv ; else ext_cmd=cat ; fi
echo "Extract tar.gz file..." && $ext_cmd redash.txt.tar.gz | tar xzf - -C .
echo "Extracting Artifact..." && $ext_cmd .redash/.offline/artifact.tar | tar xkf - -C ./redash