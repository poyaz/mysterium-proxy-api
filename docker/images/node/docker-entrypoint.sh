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

_main() {
  chown -R node:node /data/storage

  if [ "$(id -u)" = '0' ]; then
    exec su-exec node "$BASH_SOURCE" "$@"
  fi

  exec "$@"
}

_main "$@"
