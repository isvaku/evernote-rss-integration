#!/bin/sh

response=$(curl -sb -H "Accept: application/json" "http://webserver/rss/createNotesFromEntries")
echo "${response}"