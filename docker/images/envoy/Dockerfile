FROM envoyproxy/envoy-alpine:v1.20.0

ENV WAIT4X_VERSION v2.6.0

RUN set -eux; \
    apk add --no-cache bash; \
    \
    wget -O /tmp/wait4x-linux.tar.gz "https://github.com/atkrad/wait4x/releases/download/$WAIT4X_VERSION/wait4x-linux-amd64.tar.gz"; \
    mkdir -p /usr/src/wait4x-linux; \
    tar \
        --extract \
        --file /tmp/wait4x-linux.tar.gz \
        --directory /usr/src/wait4x-linux \
    ; \
    cp /usr/src/wait4x-linux/wait4x /usr/local/bin/wait4x; \
    rm -rf /tmp/wait4x-linux.tar.gz /usr/src/wait4x-linux; \
    \
    ln -s /usr/local/bin/wait4x /usr/bin/

CMD ["wait4x", "-i", "5s", "-t", "60s", "http", "http://127.0.0.1:4050/connection", "--expect-body-json", "proposal.provider_id", "--", "envoy", "-c", "/etc/envoy/envoy.yaml"]

COPY docker-healcheck.sh /usr/local/bin/

HEALTHCHECK --interval=3s --timeout=2s \
    CMD bash /usr/local/bin/docker-healcheck.sh || kill -SIGILL 1