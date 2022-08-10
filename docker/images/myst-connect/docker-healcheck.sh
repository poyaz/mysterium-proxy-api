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
}

check_total_interface_count() {
  declare -r RES=$(ip -o a show | cut -d ' ' -f 2 | wc -l)
  if [ -z "$RES" ] || [ $RES -eq 1 ]; then
    echo "[ERR] The interface count not valid (Can't found primary interface for execute)!"
    exit 1
  fi
}

_main() {
  docker_setup_env

  check_total_interface_count
}

_main "$@"
