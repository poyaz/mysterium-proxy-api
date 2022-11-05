#!/bin/sh

sed -E -i 's/default_type(.+)/#default_type\1/' /etc/nginx/nginx.conf
