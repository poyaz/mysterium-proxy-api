#!/usr/bin/env bash
set -Eeo pipefail

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
  file_env 'MYST_API_BASE_ADDRESS' 'http://127.0.0.1:4050'
  file_env 'ENABLE_WAIT_STARTUP'
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

_main() {
  if [ "$1" = 'envoy' ]; then
    local check_enable_wait_startup
    check_enable_wait_startup=$(convert_string_to_boolean "${ENABLE_WAIT_STARTUP}")

    if [ "${check_enable_wait_startup}" -eq 1 ]; then
      wait4x -i 5s -t 60s http "${MYST_API_BASE_ADDRESS}/connection" --expect-body-json proposal.provider_id -- envoy -c /etc/envoy/envoy.yaml
    else
      envoy -c /etc/envoy/envoy.yaml
    fi
  fi

  exec "$@"
}

_main "$@"
