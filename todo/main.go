package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
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

func (h httpServiceConfig) createProduct(payload any) Result[string] {
	url := "http://localhost:3000/products"

	var response Result[string]
	response.URL = url
	httpClient := &http.Client{
		Timeout: 10 * time.Second,
	}

	payloadData, _ := json.Marshal(payload)
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(payloadData))
	if err != nil {
		log.Printf("error fetching URL %s: %v\n", url, err)
		response.Error = err
		return response
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		log.Printf("Error fetching URL %s: %v\n", url, err)
		response.Error = err
		return response
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading response from URL %s: %v\n", url, err)
		response.Error = err
		return response
	}

	// log.Println(string(body))

	response.Response = string(body)
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

type Product struct {
	Name        string  `json:"name"`
	Price       float64 `json:"price"`
	Description string  `json:"description"`
	Image       string  `json:"image"`
}

func create() chan Result[string] {
	maxConcurrent := 100
	fakeProducts := []Product{}
	for i := 1; i <= 5000; i++ {
		fakeProduct := Product{
			Name:        fmt.Sprintf("Product %d", i),
			Price:       math.Round((float64(i)+0.5)*100) / 100,
			Description: "This is a fake product",
			Image:       "https://via.placeholder.com/150",
		}
		fakeProducts = append(fakeProducts, fakeProduct)
	}

	var wg sync.WaitGroup
	semaphore := make(chan struct{}, maxConcurrent)         // Semaphore to limit concurrent requests
	results := make(chan Result[string], len(fakeProducts)) // Create a buffered channel to hold the results

	httpService := NewHttpService(3, 2)

	// wg.Add(len(fakeProducts))
	for index, p := range fakeProducts {
		wg.Add(1)
		fmt.Println("Processing product", index)
		semaphore <- struct{}{} // Acquire semaphore
		go func(f Product) {
			defer wg.Done()
			defer func() { <-semaphore }() // Release semaphore
			result := httpService.createProduct(f)
			results <- result
		}(p)
	}
	wg.Wait()
	close(results)
	return results
}

func GetData() chan Result[string] {
	maxConcurrent := 100
	// mu := sync.Mutex{}
	urls := []string{}
	for i := 0; i < 1000; i++ {
		urls = append(urls, "http://localhost:3000/healthz")
		urls = append(urls, "http://localhost:8080/healthz")
	}

	var wg sync.WaitGroup
	semaphore := make(chan struct{}, maxConcurrent) // Semaphore to limit concurrent requests
	results := make(chan Result[string], len(urls)) // Create a buffered channel to hold the results

	httpService := NewHttpService(3, 2)

	for _, url := range urls {
		wg.Add(1)
		semaphore <- struct{}{} // Acquire semaphore
		go func(url string) {
			defer wg.Done()
			defer func() { <-semaphore }() // Release semaphore
			result := httpService.fetchData(url)
			// mu.Lock()
			results <- result
			// mu.Unlock()
		}(url)
	}
	wg.Wait()
	close(results)

	return results
}

func main() {
	start := time.Now()

	results := create()

	// Collect results
	successCount := 0
	failureCount := 0

	log.Println("Results:", len(results))
	// Collect and print the results
	for result := range results {
		if result.Error != nil {
			log.Printf("Error fetching URL %s: %v\n", result.URL, result.Error)
			failureCount += 1
		} else {
			// fmt.Printf("Response from %s: %s\n", result.URL, result.Response)
			successCount += 1
		}
	}
	elapsed := time.Since(start)
	fmt.Printf("Total successful calls: %d\n", successCount)
	fmt.Printf("Total failed calls: %d\n", failureCount)
	log.Printf("\nprogram took %s. \n", elapsed)
}
