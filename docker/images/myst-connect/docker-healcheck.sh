#!/usr/bin/env bash
set -Eeo pipefail

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
  file_env 'VPN_INTERFACE_NAME' 'myst0'
  file_env 'MYST_API_BASE_ADDRESS' 'http://127.0.0.1:4050'
  file_env 'OUTGOING_IP_ADDRESS'
  file_env 'CONNECTED_LOCK_FILE' '/tmp/connected.lock'
}

check_total_interface_count() {
  declare -r RES=$(ip -o a show | cut -d ' ' -f 2 | wc -l)
  if [ -z "$RES" ] || [ $RES -eq 1 ]; then
    echo "[ERR] The interface count not valid (Can't found primary interface for execute)!"
    exit 1
  fi
}

compare_ip_address() {
  if [ -z $OUTGOING_IP_ADDRESS ]; then
    return 0
  fi

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
    echo "[ERR] Fail after execute get current ip!"
    exit 1
  fi

  local CURRENT_IP=$(echo "$CONTENT" | jq -r .ip)
  if [ $OUTGOING_IP_ADDRESS = $CURRENT_IP ]; then
    echo "[ERR] The outgoing provider ip (Ip: ${CURRENT_IP}) is equal with server ip! The vpn connection not establish."
    exit 1
  fi
}

_main() {
  docker_setup_env

  check_total_interface_count

  if [ -f "$CONNECTED_LOCK_FILE" ]; then
    compare_ip_address
  fi
}

_main "$@"
