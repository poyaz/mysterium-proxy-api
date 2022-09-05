#!/usr/bin/env bash
set -Eeo pipefail

trap "echo The script is terminated with SIGINT; exit" SIGINT
trap "echo The script is terminated with SIGKILL; exit" SIGKILL

file_env() {
  local var="$1"
  local fileVar="${var}_FILE"
  local def="${2:-}"
  if [ "${!var:-}" ] && [ "${!fileVar:-}" ]; then
    echo >&2 "error: both $var and $fileVar are set (but are exclusive)"
    exit 1
  fi
  local val="$def"
  if [ "${!var:-}" ]; then
    val="${!var}"
  elif [ "${!fileVar:-}" ]; then
    val="$(<"${!fileVar}")"
  fi
  export "$var"="$val"
  unset "$fileVar"
}

docker_setup_env() {
  file_env 'MYST_TEQUILAPI_API_HOST' '127.0.0.1'
  file_env 'MYST_TEQUILAPI_API_PORT' '4449'
  file_env 'MYST_TEQUILAPI_API_USERNAME' 'myst'
  file_env 'MYST_TEQUILAPI_API_PASSWORD' 'mystberry'
  file_env 'MYST_CONSUMER_ID'
  file_env 'MYST_PROVIDER_ID'
}

check_total_interface_count() {
  declare -r RES=$(ip -o a show | cut -d ' ' -f 2 | wc -l)
  if [ -z "$RES" ] || [ $RES -eq 1 ]; then
    echo "[ERR] The interface count not valid (Can't found primary interface for execute)!"
    exit 1
  fi
}

create_token() {
  declare -r RES=$(
    curl -s \
      -w "\n%{http_code}" \
      -X POST \
      -H 'content-type: application/json' \
      -d '{"username": "'$MYST_TEQUILAPI_API_USERNAME'", "password": "'$MYST_TEQUILAPI_API_PASSWORD'"}' \
      "http://$MYST_TEQUILAPI_API_HOST:$MYST_TEQUILAPI_API_PORT/tequilapi/auth/login"
  )
  declare -r HTTP_CODE=$(tail -n1 <<<"$RES")
  declare -r CONTENT=$(sed '$ d' <<<"$RES")

  if [ $HTTP_CODE -ne 200 ]; then
    echo "[ERR] Fail after execute authenticate!"
    exit 1
  fi

  echo $(echo "$CONTENT" | jq -r .token)
}

check_vpn_connected() {
  declare -r TOKEN=$1

  declare -r RES=$(
    curl -s \
      -w "\n%{http_code}" \
      -X GET \
      -H 'content-type: application/json' \
      -H 'authorization: Bearer '$TOKEN \
      "http://$MYST_TEQUILAPI_API_HOST:$MYST_TEQUILAPI_API_PORT/tequilapi/connection"
  )
  declare -r HTTP_CODE=$(tail -n1 <<<"$RES")
  declare -r CONTENT=$(sed '$ d' <<<"$RES")

  if [ $HTTP_CODE -ne 200 ]; then
    echo "[ERR] Fail after execute get connection info!"
    exit 1
  fi

  local STATUS=$(echo "$CONTENT" | jq -r .status)
  if [ $STATUS == 'Connected' ]; then
    echo 1
  else
    echo 0
  fi
}

connect_vpn() {
  declare -r TOKEN=$1

  local consumer_id=$MYST_CONSUMER_ID
  if [ -z $MYST_CONSUMER_ID ]; then
    declare -r RES_CONSUMER=$(
      curl -s \
        -w "\n%{http_code}" \
        -X GET \
        -H 'content-type: application/json' \
        -H 'authorization: Bearer '$TOKEN \
        "http://$MYST_TEQUILAPI_API_HOST:$MYST_TEQUILAPI_API_PORT/tequilapi/connection"
    )
    declare -r HTTP_CODE=$(tail -n1 <<<"$RES")
    declare -r CONTENT_CONSUMER=$(sed '$ d' <<<"$RES")

    if [ $HTTP_CODE -ne 200 ]; then
      echo "[ERR] Fail after execute get customer id from connection info!"
      exit 1
    fi

    consumer_id=$(echo "$CONTENT_CONSUMER" | jq -r .consumer_id)
  fi

  declare -r RES=$(
    curl -s \
      -w "\n%{http_code}" \
      -X PUT \
      -H 'content-type: application/json' \
      -H 'authorization: Bearer '$TOKEN \
      -d '{"consumer_id": "'$consumer_id'", "provider_id": "'$MYST_PROVIDER_ID'", "service_type": "wireguard"}' \
      "http://$MYST_TEQUILAPI_API_HOST:$MYST_TEQUILAPI_API_PORT/tequilapi/connection"
  )
  declare -r HTTP_CODE=$(tail -n1 <<<"$RES")

  if [ $HTTP_CODE -ne 201 ]; then
    echo "[ERR] Fail after execute connect to provider API!"
    exit 1
  fi

  echo "[INFO] The server now connect to provider $MYST_PROVIDER_ID"
}

run() {
  echo "[INFO] Run process service"

  while true; do
    sleep 1000
  done
}

_main() {
  if [ "$1" = 'myst' ]; then
    sleep 2

    docker_setup_env

    if [ -z $MYST_PROVIDER_ID ]; then
      echo "[ERR] Please fill variable \"MYST_PROVIDER_ID\"!"
      exit 1
    fi

    check_total_interface_count

    local TOKEN=$(create_token)

    local IS_CONNECTED=$(check_vpn_connected $TOKEN)

    if [ $IS_CONNECTED -eq 0 ]; then
      connect_vpn $TOKEN
    else
      echo "[INFO] Skipping connect to provider because it has already connected."
    fi

    run
  fi

  exec "$@"
}

_main "$@"
