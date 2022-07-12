FROM mysteriumnetwork/myst:latest

RUN set -eux; \
    mv /usr/local/bin/docker-entrypoint.sh /usr/local/bin/myst-entrypoint.sh

COPY docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
