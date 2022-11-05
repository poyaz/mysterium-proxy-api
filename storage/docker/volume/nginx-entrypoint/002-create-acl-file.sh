#!/bin/sh

ACL_FILE_PATH=/etc/nginx/conf.d/001-proxy-acl.conf

if [ -f "$ACL_FILE_PATH" ]; then
    exit
fi

cat <<EOT > "$ACL_FILE_PATH"

map \$remote_user:\$http_x_node_proxy_port \$access_status {
    default 403;
}
EOT
