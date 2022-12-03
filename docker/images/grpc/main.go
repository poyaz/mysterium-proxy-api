package main

/*
  This is close variation of jbarratt@ repo here
  https://github.com/jbarratt/envoy_ratelimit_example/blob/master/extauth/main.go
*/
import (
	"flag"
	"fmt"
	"log"
	"net"
	"os"

	"golang.org/x/net/context"
	"google.golang.org/grpc"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/health"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/status"

	rpcstatus "google.golang.org/genproto/googleapis/rpc/status"

	core "github.com/envoyproxy/go-control-plane/envoy/config/core/v3"

	auth "github.com/envoyproxy/go-control-plane/envoy/service/auth/v3"
	envoy_type "github.com/envoyproxy/go-control-plane/envoy/type/v3"
	"github.com/gogo/googleapis/google/rpc"
)

var (
	grpclistener = flag.String("grpclistener", "0.0.0.0:4000", "grpclistener")
	conn     *grpc.ClientConn
	hs       *health.Server
)

const (
	address string = "0.0.0.0:4000"
)

type healthServer struct{}

func (s *healthServer) Check(ctx context.Context, in *healthpb.HealthCheckRequest) (*healthpb.HealthCheckResponse, error) {
	return &healthpb.HealthCheckResponse{Status: healthpb.HealthCheckResponse_SERVING}, nil
}

func (s *healthServer) Watch(in *healthpb.HealthCheckRequest, srv healthpb.Health_WatchServer) error {
	return status.Error(codes.Unimplemented, "Watch is not implemented")
}

type AuthorizationServer struct{}

func (a *AuthorizationServer) Check(ctx context.Context, req *auth.CheckRequest) (*auth.CheckResponse, error) {
    md, ok := metadata.FromIncomingContext(ctx)

    if ok {
        switch md["x-access-status"][0] {
            case "200":
                return &auth.CheckResponse{
                    Status: &rpcstatus.Status{
                        Code: int32(rpc.OK),
                    },
                    HttpResponse: &auth.CheckResponse_OkResponse{
                        OkResponse: &auth.OkHttpResponse{
                            Headers: []*core.HeaderValueOption{
                                {
                                    Header: &core.HeaderValue{
                                        Key: "x-verify-authz",
                                        Value: "true",
                                    },
                                },
                            },
                        },
                    },
                }, nil
            case "401":
                return &auth.CheckResponse{
                    Status: &rpcstatus.Status{
                        Code: int32(rpc.UNAUTHENTICATED),
                    },
                    HttpResponse: &auth.CheckResponse_DeniedResponse{
                        DeniedResponse: &auth.DeniedHttpResponse{
                            Status: &envoy_type.HttpStatus{
                                Code: envoy_type.StatusCode_ProxyAuthenticationRequired,
                            },
                            Headers: []*core.HeaderValueOption{
                                {
                                    Header: &core.HeaderValue{
                                        Key: "Proxy-Authenticate",
                                        Value: "Basic realm=\"Proxy authorization Header is not provided or corrected\"",
                                    },
                                },
                            },
                            Body: "Proxy authorization Header is not provided or corrected",
                        },
                    },
                }, nil
            case "403":
                return &auth.CheckResponse{
                    Status: &rpcstatus.Status{
                        Code: int32(rpc.PERMISSION_DENIED),
                    },
                    HttpResponse: &auth.CheckResponse_DeniedResponse{
                        DeniedResponse: &auth.DeniedHttpResponse{
                            Status: &envoy_type.HttpStatus{
                                Code: envoy_type.StatusCode_ProxyAuthenticationRequired,
                            },
                            Headers: []*core.HeaderValueOption{
                                {
                                    Header: &core.HeaderValue{
                                        Key: "Proxy-Authenticate",
                                        Value: "Basic realm=\"Proxy authorization permission denied\"",
                                    },
                                },
                            },
                            Body: "Proxy authorization permission denied",
                        },
                    },
                }, nil
        }
    }

    return &auth.CheckResponse{
        Status: &rpcstatus.Status{
            Code: int32(rpc.UNKNOWN),
        },
        HttpResponse: &auth.CheckResponse_DeniedResponse{
            DeniedResponse: &auth.DeniedHttpResponse{
                Status: &envoy_type.HttpStatus{
                    Code: envoy_type.StatusCode_BadRequest,
                },
                Body: "UNKNOWN_ERROR",
            },
        },
    }, nil
}

func main() {

	flag.Parse()

	if *grpclistener == "" {
		fmt.Fprintln(os.Stderr, "missing -grpclistener flag (0.0.0.0:4000)")
		flag.Usage()
		os.Exit(2)
	}

	lis, err := net.Listen("tcp", *grpclistener)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	opts := []grpc.ServerOption{grpc.MaxConcurrentStreams(10)}
	opts = append(opts)

	s := grpc.NewServer(opts...)

	auth.RegisterAuthorizationServer(s, &AuthorizationServer{})
	healthpb.RegisterHealthServer(s, &healthServer{})

	log.Printf("Starting gRPC Server at %s", *grpclistener)
	s.Serve(lis)

}
