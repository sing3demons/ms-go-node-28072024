package router

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
)

type MyRouter interface {
	GET(relativePath string, handlers ...gin.HandlerFunc)
	POST(relativePath string, handlers ...gin.HandlerFunc)
	PUT(relativePath string, handlers ...gin.HandlerFunc)
	DELETE(relativePath string, handlers ...gin.HandlerFunc)
	PATCH(relativePath string, handlers ...gin.HandlerFunc)
	Use(middleware ...gin.HandlerFunc) gin.IRoutes
	Group(relativePath string, handlers ...gin.HandlerFunc) *gin.RouterGroup
	StartHTTP(port string)
}

type myRouter struct {
	*gin.Engine
}

func New() MyRouter {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()

	r.Use(gin.Recovery())
	return &myRouter{r}
}

func (m *myRouter) GET(relativePath string, handlers ...gin.HandlerFunc) {
	m.Engine.GET(relativePath, handlers...)
}

func (m *myRouter) POST(relativePath string, handlers ...gin.HandlerFunc) {
	m.Engine.POST(relativePath, handlers...)
}

func (m *myRouter) PUT(relativePath string, handlers ...gin.HandlerFunc) {
	m.Engine.PUT(relativePath, handlers...)
}

func (m *myRouter) DELETE(relativePath string, handlers ...gin.HandlerFunc) {
	m.Engine.DELETE(relativePath, handlers...)
}

func (m *myRouter) PATCH(relativePath string, handlers ...gin.HandlerFunc) {
	m.Engine.PATCH(relativePath, handlers...)
}

func (m *myRouter) Use(middleware ...gin.HandlerFunc) gin.IRoutes {
	return m.Engine.Use(middleware...)
}

func (m *myRouter) Group(relativePath string, handlers ...gin.HandlerFunc) *gin.RouterGroup {
	return m.Engine.Group(relativePath, handlers...)
}

func (m *myRouter) StartHTTP(port string) {
	s := &http.Server{
		Addr:         ":" + port,
		Handler:      m,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	log.Printf("Allocated memory: %v MB\n", memStats.Alloc/1024/1024)
	log.Printf("Total allocated memory: %v MB\n", memStats.TotalAlloc/1024/1024)
	log.Printf("System memory: %v MB\n", memStats.Sys/1024/1024)
	log.Printf("Number of garbage collections: %v\n", memStats.NumGC)

	log.Printf("Number of CPUs: %d\n", runtime.NumCPU())

	host := m.getLocalIP().String()

	log.Printf("starting server at %s", fmt.Sprintf("http://%s:%s", host, port))

	go func() {
		err := s.ListenAndServe()
		if err != nil && err != http.ErrServerClosed {
			log.Fatal("unexpected shutdown the server", err)

		}
		log.Println("gracefully shutdown the server")
	}()
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	gCtx := context.Background()
	ctx, cancel := context.WithTimeout(gCtx, 10*time.Second)
	defer cancel()

	if err := s.Shutdown(ctx); err != nil {
		log.Fatal("unexpected shutdown the server", err)
	}
	log.Println("server shutdown")
}

func (m *myRouter) getLocalIP() net.IP {
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		log.Fatal(err)
	}
	defer conn.Close()

	localAddress := conn.LocalAddr().(*net.UDPAddr)

	return localAddress.IP
}
