package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
)

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func getLang(r *http.Request) string {
	lang := r.Header.Get("Accept-Language")
	if strings.HasPrefix(lang, "de") {
		return "de"
	}
	return "en"
}
