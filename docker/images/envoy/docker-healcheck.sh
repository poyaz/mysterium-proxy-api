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
  file_env 'ENABLE_HEALTHCHECK'
}

convert_string_to_boolean() {
  local data="${1,,}"

  if [ -z "$data" ]; then
    echo 0
    return 0
  fi

  if [ "$data" = 'true' ] || [ "$data" = 't' ] || [ "$data" = 'yes' ] || [ "$data" = 'y' ] || [ "$data" = '1' ]; then
    echo 1
    return 0
  fi

  echo 0
}

check_total_interface_count() {
  declare -r RES=$(ip -o a show | cut -d ' ' -f 2 | wc -l)
  if [ -z "$RES" ] || [ $RES -eq 1 ]; then
    echo "[ERR] The interface count not valid (Can't found primary interface for execute)!"
    exit 1
  fi
}

check_vpn_interface_exist() {
  declare -r IS_MAIN_PROCESS_START=$(ps aux | grep -v wait4x | grep envoy | grep -v grep | wc -l)
  if [ $IS_MAIN_PROCESS_START -eq 0 ]; then
    return
  fi

  declare -r RES=$(ip -o a show | cut -d ' ' -f 2 | grep "$VPN_INTERFACE_NAME")
  if [ -z "$RES" ]; then
    echo "[ERR] The interface \"$VPN_INTERFACE_NAME\" not found!"
    exit 1
  fi
}

_main() {
  docker_setup_env

  local check_enable_wait_startup
  check_enable_wait_startup=$(convert_string_to_boolean "${ENABLE_HEALTHCHECK}")

  if [ "${check_enable_wait_startup}" -eq 0 ]; then
    exit
  fi

  check_total_interface_count

  check_vpn_interface_exist
}

_main "$@"
