package main

import (
	"fmt"
	"net/http"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Log Microsservice runing on Docker!")
	})

	fmt.Println("Server listening on port 8080...")
	http.ListenAndServe(":8080", nil)
}
