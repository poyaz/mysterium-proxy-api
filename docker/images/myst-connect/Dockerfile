FROM alpine:3.15.5

RUN set -eux; \
    apk add --no-cache curl bash jq

COPY docker-entrypoint.sh docker-healcheck.sh /usr/local/bin/

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

CMD ["myst"]

HEALTHCHECK --interval=20s --timeout=3s \
    CMD bash /usr/local/bin/docker-healcheck.sh || pkill -SIGILL -f
