#!/bin/sh

response=$(curl -sb -H "Accept: application/json" "http://webserver/insertEntriesFromFeed")
echo "${response}"