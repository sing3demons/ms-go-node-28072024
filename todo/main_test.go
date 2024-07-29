package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestFetchDataSuccess(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("test response"))
	}))
	defer ts.Close()

	httpService := NewHttpService(3, 2)
	result := httpService.fetchData(ts.URL)

	assert.Nil(t, result.Error)
	assert.Equal(t, "test response", result.Response)
}

func TestFetchDataFailure(t *testing.T) {
	ts := httptest.NewServer(http.NotFoundHandler())
	defer ts.Close()

	httpService := NewHttpService(3, 2)
	result := httpService.fetchData(ts.URL)

	if result.Error == nil {
		t.Fatalf("Expected an error but got none")
	}
	if !contains(result.Error.Error(), "failed to fetch URL") {
		t.Fatalf("Expected error message to contain 'failed to fetch URL' but got %v", result.Error)
	}
}

// Helper function to check if a string contains a substring
func contains(s, substr string) bool {
	return strings.Contains(s, substr)
}

func TestFetchDataRetry(t *testing.T) {
	attempts := 0
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < 3 {
			http.Error(w, "temporary error", http.StatusInternalServerError)
		} else {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("test response after retries"))
		}
	}))
	defer ts.Close()

	httpService := NewHttpService(5, 1) // Increase retries and decrease delay for testing
	result := httpService.fetchData(ts.URL)

	// Check if the expected response is retrieved
	if result.Error != nil {
		t.Fatalf("Expected no error but got: %v", result.Error)
	}
}



func TestHttpServiceConfig(t *testing.T) {
	config := NewHttpService(-1, -1)
	assert.Equal(t, 3, config.retries)
	assert.Equal(t, 2*time.Second, config.delay)

	config = NewHttpService(5, 10)
	assert.Equal(t, 5, config.retries)
	assert.Equal(t, 10*time.Second, config.delay)
}
