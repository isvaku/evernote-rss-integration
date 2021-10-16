#!/bin/sh

response=$(curl -sb -H "Accept: application/json" "http://webserver/rss/insertEntriesFromFeed")
echo "${response}"