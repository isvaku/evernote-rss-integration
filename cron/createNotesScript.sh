#!/bin/sh

response=$(curl -sb -H "Accept: application/json" "http://webserver/createNotesFromEntries")
echo "${response}"