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
  file_env 'MYST_IDENTITY'
  file_env 'MYST_IDENTITY_PASS'
}

_main() {
  docker_setup_env

  if [ -z "$MYST_IDENTITY" ] && [ -z "$MYST_IDENTITY_PASS" ]; then
    /usr/local/bin/myst-entrypoint.sh "$@"
  else
    /usr/local/bin/myst-entrypoint.sh "$@" --identity "${MYST_IDENTITY}" --identity.passphrase "${MYST_IDENTITY_PASS}"
  fi
}

_main "$@"
