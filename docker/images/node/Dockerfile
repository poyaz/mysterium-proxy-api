FROM node:16.16.0-alpine3.16

RUN apk add --no-cache apache2-utils curl su-exec

COPY docker-entrypoint.sh /usr/local/bin/

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

CMD ["node"]
