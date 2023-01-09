FROM envoyproxy/envoy:v1.24.0

ENV WAIT4X_VERSION v2.6.0

RUN set -eux; \
    apt-get update; \
	  apt-get install -y --no-install-recommends ca-certificates wget iproute2; \
	  rm -rf /var/lib/apt/lists/*; \
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

COPY docker-entrypoint.sh docker-healcheck.sh /usr/local/bin/

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

CMD ["envoy"]

EXPOSE 10001/tcp

HEALTHCHECK --interval=3s --timeout=2s \
    CMD bash /usr/local/bin/docker-healcheck.sh
