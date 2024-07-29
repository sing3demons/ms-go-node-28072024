package main

import (
	"context"
	"os"
	"runtime"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/sing3demons/auth-service/logger"
	"github.com/sing3demons/auth-service/mlog"
	"github.com/sing3demons/auth-service/redis"
	"github.com/sing3demons/auth-service/router"
	"github.com/sing3demons/auth-service/store"
	"github.com/sing3demons/auth-service/users"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

func init() {
	if os.Getenv("ENV_MODE") != "production" {
		if err := godotenv.Load(".env.dev"); err != nil {
			panic(err)
		}
	}

	if runtime.GOOS != "windows" {
		temp := "/tmp/live"
		_, err := os.Create(temp)
		if err != nil {
			os.Exit(1)
		}
		defer os.Remove(temp)
	}
}

func main() {
	port := os.Getenv("PORT")

	logger := logger.New()
	logger.Info("Starting the application...")

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	db := store.NewStore(ctx)
	defer db.Disconnect(ctx)

	redisClient := redis.New()
	defer redisClient.Close()

	r := router.New()
	r.Use(mlog.Middleware(logger))
	r.GET("/healthz", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 20*time.Second)
		defer cancel()
		l := mlog.L(ctx)
		if err := db.Ping(ctx, readpref.Primary()); err != nil {
			l.Error(err.Error())

			c.Status(500)
			return
		}

		_, err := redisClient.Ping(ctx)
		if err != nil {
			l.Error(err.Error())
			c.Status(500)
			return
		}
		l.Info("Health check success", "status", "OK")
		c.JSON(200, "OK")
	})

	users.Register(r, db, redisClient, logger)

	r.StartHTTP(port)
}
