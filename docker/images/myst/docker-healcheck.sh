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
  file_env 'SERVER_REAL_IP_ADDRESS'
  file_env 'VPN_INTERFACE_NAME' 'myst0'
}

check_vpn_interface_exist() {
  declare -r RES=$(ip -o a show | cut -d ' ' -f 2 | grep "$VPN_INTERFACE_NAME")
  if [ -z "$RES" ]; then
    echo "[ERR] The interface \"$VPN_INTERFACE_NAME\" not found!"
    exit 1
  fi
}

check_vpn_connected() {
  declare -r RES=$(myst connection info | cut -d ' ' -f2-)
  if [ -z "$RES" ]; then
    echo "[ERR] Can't fetch connection info"
    exit 1
  fi

  declare -r STATUS=$(echo "$RES" | grep 'Connected')
  if [ -z "$STATUS" ]; then
    echo "[ERR] The VPN connection is not connected!"
    exit 1
  fi

  declare -r IP=$(echo "$RES" | grep "$SERVER_REAL_IP_ADDRESS")
  if ! [ -z "$IP" ]; then
    echo "[ERR] The output of ip address is equal with server ip (That means VPN not connected)!"
    exit 1
  fi
}

_main() {
  docker_setup_env

  check_vpn_interface_exist

  check_vpn_connected
}

_main "$@"
