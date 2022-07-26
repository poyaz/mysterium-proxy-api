FROM mysteriumnetwork/myst:latest

RUN set -eux; \
    apk add --no-cache curl bash jq

COPY docker-entrypoint.sh docker-healcheck.sh /usr/local/bin/

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

CMD ["myst"]

HEALTHCHECK --start-period=3s --interval=5s --timeout=3s \
    CMD bash /usr/local/bin/docker-healcheck.sh || pkill -SIGILL -f 1
