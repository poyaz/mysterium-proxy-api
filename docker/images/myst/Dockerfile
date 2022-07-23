FROM mysteriumnetwork/myst:latest

RUN set -eux; \
    apk add --no-cache curl jq; \
    mv /usr/local/bin/docker-entrypoint.sh /usr/local/bin/myst-entrypoint.sh

COPY docker-entrypoint.sh docker-healcheck.sh /usr/local/bin/

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

HEALTHCHECK --start-period=10s --interval=10s --timeout=9s \
    CMD bash /usr/local/bin/docker-healcheck.sh || exit 1
