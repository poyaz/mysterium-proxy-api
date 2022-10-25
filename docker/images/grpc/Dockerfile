FROM golang:1.19.2-alpine3.16 as builder

COPY . /ext-auth-poc
WORKDIR /ext-auth-poc
ENV GO111MODULE=on
RUN CGO_ENABLED=0 GOOOS=linux go build -o ext-auth-poc

FROM alpine:3.16
WORKDIR /root/
COPY --from=builder /ext-auth-poc .
CMD ["./ext-auth-poc"]
