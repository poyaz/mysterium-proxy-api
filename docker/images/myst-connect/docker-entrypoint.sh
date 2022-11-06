#!/usr/bin/env bash
set -Eeo pipefail

trap "echo The script is terminated with SIGINT; exit" SIGINT
trap "echo The script is terminated with SIGKILL; exit" SIGKILL

print_stderr() {
  echo "$1" >/dev/stderr
}

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
  file_env 'MYST_API_BASE_ADDRESS' 'https://127.0.0.1:4050'
  file_env 'MYST_IDENTITY'
  file_env 'PROVIDER_IDENTITY'
  file_env 'API_PROVIDER_ID'
  file_env 'REDIS_HOST'
  file_env 'REDIS_PORT' '6379'
  file_env 'REDIS_DB'
  file_env 'REDIS_PROVIDER_INFO_KEY'
}

check_total_interface_count() {
  declare -r RES=$(ip -o a show | cut -d ' ' -f 2 | wc -l)
  if [ -z "$RES" ] || [ $RES -eq 1 ]; then
    print_stderr "[ERR] The interface count not valid (Can't found primary interface for execute)!"
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
    print_stderr "[ERR] Fail after execute authenticate!"
    exit 1
  fi

  echo $(echo "$CONTENT" | jq -r .token)
}

check_vpn_connected() {
  declare -r RES=$(
    curl -s \
      -w "\n%{http_code}" \
      -X GET \
      -H 'content-type: application/json' \
      "${MYST_API_BASE_ADDRESS}/connection"
  )
  declare -r HTTP_CODE=$(tail -n1 <<<"$RES")
  declare -r CONTENT=$(sed '$ d' <<<"$RES")

  if [ $HTTP_CODE -ne 200 ]; then
    print_stderr "[ERR] Fail after execute get connection info!"
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
  local consumer_id=$MYST_IDENTITY
  if [ -z $MYST_IDENTITY ]; then
    declare -r RES_CONSUMER=$(
      curl -s \
        -w "\n%{http_code}" \
        -X GET \
        -H 'content-type: application/json' \
        "${MYST_API_BASE_ADDRESS}/connection"
    )
    declare -r HTTP_CODE=$(tail -n1 <<<"$RES")
    declare -r CONTENT_CONSUMER=$(sed '$ d' <<<"$RES")

    if [ $HTTP_CODE -ne 200 ]; then
      print_stderr "[ERR] Fail after execute get customer id from connection info!"
      exit 1
    fi

    consumer_id=$(echo "$CONTENT_CONSUMER" | jq -r .consumer_id)
  fi

  declare -r RES=$(
    curl -s \
      -w "\n%{http_code}" \
      -X PUT \
      -H 'content-type: application/json' \
      -d '{"consumer_id": "'${consumer_id}'", "provider_id": "'${PROVIDER_IDENTITY}'", "service_type": "wireguard"}' \
      "${MYST_API_BASE_ADDRESS}/connection"
  )
  declare -r HTTP_CODE=$(tail -n1 <<<"$RES")

  if [ $HTTP_CODE -ne 201 ]; then
    print_stderr "[ERR] Fail after execute connect to provider API!"
    exit 1
  fi

  echo "[INFO] The server now connect to provider ${PROVIDER_IDENTITY}"
}

get_current_ip() {
  declare -r RES=$(
    curl -s \
      -w "\n%{http_code}" \
      -X GET \
      -H 'content-type: application/json' \
      "${MYST_API_BASE_ADDRESS}/connection/ip"
  )
  declare -r HTTP_CODE=$(tail -n1 <<<"$RES")
  declare -r CONTENT=$(sed '$ d' <<<"$RES")

  if [ $HTTP_CODE -ne 200 ]; then
    print_stderr "[ERR] Fail after execute get current ip!"
    exit 1
  fi

  echo $(echo "$CONTENT")
}

store_ip_in_redis() {
  declare -r DATA=$(echo "$1" | jq -S '. |= . + {"provider_identity": "'$PROVIDER_IDENTITY'"}')

  local execute_redis=(
    redis-cli
    -h "${REDIS_HOST}"
    -p $REDIS_PORT
  )

  if ! [ -z $REDIS_DB ]; then
    execute_redis+=(-n $REDIS_DB)
  fi

  execute_redis+=(HMSET "${REDIS_PROVIDER_INFO_KEY}" "${API_PROVIDER_ID}" "${DATA}")

  "${execute_redis[@]}" >/dev/null 2>&1
}

run() {
  echo "[INFO] Run process service"

  while true; do
    local DATA DATA_RC
    DATA=$(get_current_ip)
    DATA_RC=$?
    if [ $DATA_RC -ne 0 ]; then
      exit $DATA_RC
    fi

    store_ip_in_redis "$DATA"

    sleep 3000
  done
}

_main() {
  if [ "$1" = 'myst' ]; then
    sleep 2

    docker_setup_env

    if [ -z $PROVIDER_IDENTITY ]; then
      echo "[ERR] Please fill variable \"PROVIDER_IDENTITY\"!"
      exit 1
    fi

    if [ -z API_PROVIDER_ID ]; then
      echo "[ERR] Please fill variable \"API_PROVIDER_ID\"!"
      exit 1
    fi

    if [ -z $REDIS_HOST ]; then
      echo "[ERR] Please fill variable \"REDIS_HOST\"!"
      exit 1
    fi

    if [ -z $REDIS_PROVIDER_INFO_KEY ]; then
      echo "[ERR] Please fill variable \"REDIS_HOST\"!"
      exit 1
    fi

    check_total_interface_count

    local IS_CONNECTED IS_CONNECTED_RC
    IS_CONNECTED=$(check_vpn_connected)
    IS_CONNECTED_RC=$?
    if [ $IS_CONNECTED_RC -ne 0 ]; then
      exit $IS_CONNECTED_RC
    fi

    if [ $IS_CONNECTED -eq 0 ]; then
      connect_vpn
    else
      echo "[INFO] Skipping connect to provider because it has already connected."
    fi

    run
  fi

  exec "$@"
}

_main "$@"
