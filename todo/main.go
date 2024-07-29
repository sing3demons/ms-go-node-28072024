package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"runtime"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
)

// Result struct to hold URL and its response data
type Result[T any] struct {
	URL      string
	Response T
	Error    error
}

type httpServiceConfig struct {
	retries int
	delay   time.Duration
}

func NewHttpService(retries, delay int) httpServiceConfig {
	if retries < 0 {
		retries = 3
	}

	if delay < 0 {
		delay = 2
	}

	return httpServiceConfig{
		retries: retries,
		delay:   time.Duration(delay) * time.Second,
	}
}

// Function to fetch data from a URL and send the result to a channel
func (h httpServiceConfig) fetchData(url string) Result[string] {
	var response Result[string]
	response.URL = url
	for i := 0; i <= h.retries; i++ {
		httpClient := &http.Client{
			Timeout: 10 * time.Second,
		}
		req, err := http.NewRequest(http.MethodGet, url, nil)
		if err != nil {
			log.Printf("Error fetching URL %s: %v (Attempt %d/%d)\n", url, err, i+1, h.retries+1)
			time.Sleep(h.delay)
			continue
		}

		req.Header.Set("Content-Type", "application/json")

		resp, err := httpClient.Do(req)
		if err != nil {
			log.Printf("Error fetching URL %s: %v (Attempt %d/%d)\n", url, err, i+1, h.retries+1)
			time.Sleep(h.delay)
			continue
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Printf("Error reading response from URL %s: %v (Attempt %d/%d)\n", url, err, i+1, h.retries+1)
			time.Sleep(h.delay)
			continue
		}

		response.Response = string(body)

		return response
	}

	response.Error = fmt.Errorf("failed to fetch URL %s after %d attempts", url, h.retries+1)

	return response
}

func init() {
	logrus.SetFormatter(&logrus.JSONFormatter{
		FieldMap: logrus.FieldMap{
			logrus.FieldKeyTime: "@timestamp",
			logrus.FieldKeyMsg:  "message",
		},
	})
	logrus.SetLevel(logrus.TraceLevel)
	log.SetOutput(logrus.StandardLogger().Writer())

	cpuUsed := 1
	runtime.GOMAXPROCS(cpuUsed)
}

func main() {
	start := time.Now()

	maxConcurrent := 100
	mu := sync.Mutex{}

	urls := []string{}
	for i := 0; i < 5000; i++ {
		urls = append(urls, "http://localhost:3000/healthz")
		urls = append(urls, "http://localhost:8080/healthz")
	}

	var wg sync.WaitGroup
	semaphore := make(chan struct{}, maxConcurrent) // Semaphore to limit concurrent requests
	results := make(chan Result[string], len(urls)) // Create a buffered channel to hold the results

	httpService := NewHttpService(3, 2)

	// Launch a goroutine for each URL
	for _, url := range urls {
		wg.Add(1)
		semaphore <- struct{}{} // Acquire semaphore
		go func(url string) {
			defer wg.Done()
			defer func() { <-semaphore }() // Release semaphore
			result := httpService.fetchData(url)
			mu.Lock()
			results <- result
			mu.Unlock()
		}(url)
	}

	// Wait for all goroutines to complete
	wg.Wait()
	close(results) // Close the results channel

	log.Println("Results:", len(results))
	// Collect and print the results
	for result := range results {
		if result.Error != nil {
			log.Printf("Error fetching URL %s: %v\n", result.URL, result.Error)
		} else {
			fmt.Printf("Response from %s: %s\n", result.URL, result.Response)
		}
	}
	elapsed := time.Since(start)
	log.Printf("\nprogram took %s. \n", elapsed)
}
