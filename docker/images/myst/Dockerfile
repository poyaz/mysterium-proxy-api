FROM mysteriumnetwork/myst:1.10.0-alpine

RUN set -eux; \
    apk add --no-cache curl jq; \
    mv /usr/local/bin/docker-entrypoint.sh /usr/local/bin/myst-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
