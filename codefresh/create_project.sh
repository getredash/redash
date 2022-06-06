#!/bin/bash

# creating a new project with the repository name
# if project exists it will throw exit 1, so no matter what we return true form this command
codefresh create project $CF_REPO_NAME | true

# This part will create and maintain new pipeline-spec
pipline_file_name=path.txt

touch $pipline_file_name

# We will extract all add new and modified files that containes the string "pipeline-spec"
cat $GITHUB_EVENT_PATH | jq '.commits[].added[]' | sed 's/"//g' | grep pipeline-spec | uniq  >> $pipline_file_name
cat $GITHUB_EVENT_PATH | jq '.commits[].modified[]' | sed 's/"//g' | grep pipeline-spec | uniq  >> $pipline_file_name

cat $pipline_file_name

# Because codefresh doesnt have create or replace command we will start with codefresh replace and if it failes we will try to create
while read line; do
echo "codefresh replace pipeline -f $PWD/$line"
codefresh replace pipeline -f $PWD/$line
RESULT=$?
if [ $RESULT -eq 0 ]; then
  echo "ALL Good, Exiting..."
else
  echo "codefresh create pipeline -f $PWD/$line"
  codefresh create pipeline -f $PWD/$line
fi
done < $pipline_file_name
