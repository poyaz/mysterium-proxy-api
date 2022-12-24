#!/usr/bin/env bash

DIRNAME=$(realpath $0 | rev | cut -d'/' -f2- | rev)
readonly DIRNAME

DEFAULT_APP_ENV_FILE="${DIRNAME}/env/app/.env"
readonly DEFAULT_APP_ENV_FILE

DEFAULT_PG_ENV_FILE="${DIRNAME}/env/pg/.env"
readonly DEFAULT_PG_ENV_FILE

DEFAULT_PG_IP="10.110.0.4"
readonly DEFAULT_PG_IP

DEFAULT_PG_DATABASE="postgres"
readonly DEFAULT_PG_DATABASE

DEFAULT_PG_USERNAME="postgres"
readonly DEFAULT_PG_USERNAME

DEFAULT_REDIS_IP="10.110.0.5"
readonly DEFAULT_REDIS_IP

DEFAULT_DOCKER_PROXY_IP="10.110.0.6"
readonly DEFAULT_DOCKER_PROXY_IP

############
### function
############

function _version() {
  echo "0.1.0"
  echo ""
  exit
}

function _usage() {
  echo -e "Mysterium proxy\n"
  echo -e "Usage:"
  echo -e "  bash $0 [OPTIONS...]\n"
  echo -e "Options:"
  echo -e "      install\t\t\tInstall dependency"
  echo -e "      init\t\t\tInit service"
  echo -e "      upgrade\t\t\tUpgrade service"
  echo -e "      create-admin [username]\tCreate admin user with generated password"
  echo ""
  echo -e "  -v, --version\t\t\tShow version information and exit"
  echo -e "  -h, --help\t\t\tShow help"
  echo ""

  exit
}

_find_distro() {
  local distro=$(awk '/^ID=/' /etc/*-release | awk -F'=' '{ print tolower($2) }')

  echo $distro
}

_check_dependency() {
  local DISTRO=$(_find_distro)
  readonly DISTRO

  case ${DISTRO} in
  debian | ubuntu)
    dpkg -l docker >/dev/null 2>&1

    if ! [[ $? -eq 0 ]]; then
      echo -e "[ERR] Need install dependency\n"
      echo -e "Please use below command:"
      echo -e "  bash $0 install"
      echo ""

      exit 1
    fi

    dpkg -l jq >/dev/null 2>&1

    if ! [[ $? -eq 0 ]]; then
      echo -e "[ERR] Need install dependency\n"
      echo -e "Please use below command:"
      echo -e "  bash $0 install"
      echo ""

      exit 1
    fi

    dpkg -l lsof >/dev/null 2>&1

    if ! [[ $? -eq 0 ]]; then
      echo -e "[ERR] Need install dependency\n"
      echo -e "Please use below command:"
      echo -e "  bash $0 install"
      echo ""

      exit 1
    fi
    ;;

  centos)
    centos_check=$(rpm -qa docker-ce jq lsof | wc -l)

    if ! [[ ${centos_check} -eq 3 ]]; then
      echo -e "[ERR] Need install dependency\n"
      echo -e "Please use below command:"
      echo -e "  bash $0 install"
      echo ""

      exit 1
    fi
    ;;
  esac
}

_install() {
  echo "[INFO] Install dependency"

  local DISTRO=$(_find_distro)
  readonly DISTRO

  local EXEC_WITH_SUDO=0
  sudo >/dev/null 2>&1
  if [[ $? -eq 0 ]]; then
    EXEC_WITH_SUDO=1
  fi
  readonly EXEC_WITH_SUDO

  case ${DISTRO} in
  ubuntu)
    if [[ ${EXEC_WITH_SUDO} -eq 1 ]]; then
      sudo apt update

      sudo apt install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg-agent \
        software-properties-common \
        jq \
        lsof

      curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --yes --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

      echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

      sudo apt update

      sudo apt install -y docker-ce docker-ce-cli containerd.io
    else
      apt update

      apt install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg-agent \
        software-properties-common \
        jq \
        lsof

      curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor --yes -o /usr/share/keyrings/docker-archive-keyring.gpg

      echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list >/dev/null

      apt update

      apt install -y docker-ce docker-ce-cli containerd.io
    fi
    ;;
  debian)
    if [[ ${EXEC_WITH_SUDO} -eq 1 ]]; then
      sudo apt update

      sudo apt install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg-agent \
        software-properties-common \
        jq \
        lsof

      curl -fsSL https://download.docker.com/linux/debian/gpg | sudo apt-key add -

      sudo apt-key fingerprint 0EBFCD88

      sudo add-apt-repository -y \
        "deb [arch=amd64] https://download.docker.com/linux/debian \
                    $(lsb_release -cs) \
                    stable"

      sudo apt update

      sudo apt install -y docker-ce docker-ce-cli containerd.io
    else
      apt update

      apt install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg-agent \
        software-properties-common \
        jq \
        lsof

      curl -fsSL https://download.docker.com/linux/debian/gpg | apt-key add -

      apt-key fingerprint 0EBFCD88

      add-apt-repository -y \
        "deb [arch=amd64] https://download.docker.com/linux/debian \
                    $(lsb_release -cs) \
                    stable"

      apt update

      apt install -y docker-ce docker-ce-cli containerd.io
    fi
    ;;

  centos)
    yum install -y yum-utils epel-release lsof

    yum-config-manager \
      --add-repo \
      https://download.docker.com/linux/centos/docker-ce.repo

    yum install -y docker-ce docker-ce-cli containerd.io jq
    ;;
  esac

  curl -L https://github.com/docker/compose/releases/download/1.25.4/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose

  if [[ ${EXEC_WITH_SUDO} -eq 1 ]]; then
    sudo sed -e "s/--containerd=.\+\/containerd.sock//g" /lib/systemd/system/docker.service | sudo tee /etc/systemd/system/docker.service

    sudo systemctl daemon-reload

    sudo systemctl start docker

    sudo systemctl enable docker
  else
    sed -e "s/--containerd=.\+\/containerd.sock//g" /lib/systemd/system/docker.service >/etc/systemd/system/docker.service

    systemctl daemon-reload

    systemctl start docker

    systemctl enable docker
  fi

  exit
}

#############
### Arguments
#############

execute_mode=

POSITIONAL=()
while [[ $# -gt 0 ]]; do
  key="$1"

  case ${key} in
  install)
    _install
    shift
    ;;

  init)
    execute_mode="init"
    shift
    ;;

  upgrade)
    execute_mode="upgrade"
    shift
    ;;

  create-admin)
    execute_mode="create-admin"
    shift
    POSITIONAL="$@"
    ;;

  -v | --version)
    _version
    shift
    ;;

  -h | --help)
    _usage
    shift
    ;;

  *)
    # _usage
    shift
    ;;
  esac
done

set -- "${POSITIONAL[@]}"

############
### business
############

_check_dependency

print_stdout() {
  echo "$1" >/dev/tty
}

print_stderr() {
  echo "$1" >/dev/stderr
}

init_service() {
  if [[ -f $DEFAULT_APP_ENV_FILE ]] && [[ -f $DEFAULT_PG_ENV_FILE ]]; then
    echo "[WARN] The service is already initialized!"
    exit
  fi

  cp "${DEFAULT_APP_ENV_FILE}.example" $DEFAULT_APP_ENV_FILE
  cp "${DEFAULT_PG_ENV_FILE}.example" $DEFAULT_PG_ENV_FILE

  GENERATE_PG_PASSWORD=$(
    tr -dc A-Za-z0-9 </dev/urandom | head -c 13
    echo ''
  )
  GENERATE_JWT_TOKEN=$(
    tr -dc A-Za-z0-9 </dev/urandom | head -c 13
    echo ''
  )
  SED_DIRNAME_REPLACE=$(echo $DIRNAME | sed 's/\//\\\//g')

  echo "[INFO] Please wait for init service ..."

  if ! [[ -f /etc/timezone ]]; then
    echo $(timedatectl status | grep "zone" | sed -e 's/^[ ]*Time zone: \(.*\) (.*)$/\1/g') >>/etc/timezone
  fi

  TIMEZONE_DATA=$(cat /etc/timezone | sed 's/\//\\\//g')

  MYST_HELP=$(docker run --rm --network none mysteriumnetwork/myst:1.10.0-alpine --help)
  MYST_API_USERNAME=$(echo "$MYST_HELP" | grep "tequilapi.auth.username" | sed -nr 's/.+\(default:\s+"(.+)".*\)/\1/p')
  MYST_API_PASSWORD=$(echo "$MYST_HELP" | grep "tequilapi.auth.password" | sed -nr 's/.+\(default:\s+"(.+)".*\)/\1/p')

  sed -i \
    -e "s/TZ=/TZ=$TIMEZONE_DATA/g" \
    -e "s/NODE_ENV=/NODE_ENV=product/g" \
    -e "s/SERVER_HOST=/SERVER_HOST=0.0.0.0/g" \
    -e "s/DB_PG_HOST=/DB_PG_HOST=$DEFAULT_PG_IP/g" \
    -e "s/DB_PG_DATABASE=/DB_PG_DATABASE=$DEFAULT_PG_DATABASE/g" \
    -e "s/DB_PG_USERNAME=/DB_PG_USERNAME=$DEFAULT_PG_USERNAME/g" \
    -e "s/DB_PG_PASSWORD=/DB_PG_PASSWORD=$GENERATE_PG_PASSWORD/g" \
    -e "s/DB_REDIS_HOST=/DB_REDIS_HOST=$DEFAULT_REDIS_IP/g" \
    -e "s/JWT_SECRET_KEY=/JWT_SECRET_KEY=$GENERATE_JWT_TOKEN/g" \
    -e "s/DOCKER_CONTROLLER_HOST=/DOCKER_CONTROLLER_HOST=$DEFAULT_DOCKER_PROXY_IP/g" \
    -e "s/MYST_NODE_AUTH_USERNAME=/MYST_NODE_AUTH_USERNAME=$MYST_API_USERNAME/g" \
    -e "s/MYST_NODE_AUTH_PASSWORD=/MYST_NODE_AUTH_PASSWORD=$MYST_API_PASSWORD/g" \
    -e "s/PROXY_START_UPSTREAM_PORT=/PROXY_START_UPSTREAM_PORT=5000/g" \
    "$DEFAULT_APP_ENV_FILE"

  sed -i \
    -e "s/TZ=/TZ=$TIMEZONE_DATA/g" \
    -e "s/POSTGRES_PASSWORD=/POSTGRES_PASSWORD=$GENERATE_PG_PASSWORD/g" \
    "$DEFAULT_PG_ENV_FILE"

  docker-compose \
    -f docker-compose.yml \
    -f docker/docker-compose.env.yml \
    -f docker/docker-compose.log.yml \
    -f docker/docker-compose.product.yml \
    up -d --build

  sleep 1

  docker-compose exec -u node app sh -c "node dist/cli.js migration:run"

  docker-compose exec -u node app sh -c "node dist/cli.js swagger"

  docker-compose restart redoc
}

upgrade_service() {
  echo "[INFO] Please wait for upgrade service ..."

  docker-compose exec -u node app sh -c "node dist/cli.js migration:run"

  docker-compose exec -u node app sh -c "node dist/cli.js swagger"

  docker-compose restart redoc

  sleep 1

  docker-compose \
    -f docker-compose.yml \
    -f docker/docker-compose.env.yml \
    -f docker/docker-compose.log.yml \
    -f docker/docker-compose.product.yml \
    up -d --build
}

create_admin() {
  local username="$1"

  docker-compose exec -u node app sh -c "node dist/cli.js add:admin "'"'"$1"'"'""
}

case $execute_mode in
init)
  init_service
  ;;

upgrade)
  upgrade_service
  ;;

create-admin)
  create_admin "$POSITIONAL"
  ;;

*)
  echo "[ERR] Not valid option for execute"
  echo -e "Please use below command for more information:"
  echo -e "  bash $0 --help"
  echo ""

  exit 1
  ;;
esac
