FROM mysteriumnetwork/myst:1.10.0-alpine

RUN set -eux; \
    apk add --no-cache curl jq; \
    mv /usr/local/bin/docker-entrypoint.sh /usr/local/bin/myst-entrypoint.sh

COPY docker-entrypoint.sh docker-healcheck.sh /usr/local/bin/

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

HEALTHCHECK --interval=20s --timeout=9s \
    CMD bash /usr/local/bin/docker-healcheck.sh || pkill -SIGILL -f 1
