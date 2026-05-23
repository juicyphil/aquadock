package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"aquadock/internal/models"

	"github.com/go-chi/chi/v5"
)

type PhotoHandler struct {
	db interface {
		GetTank(int64) (*models.Tank, error)
		UpdateTankPhoto(int64, string) error
		GetInhabitant(int64) (*models.Inhabitant, error)
		UpdateInhabitantPhoto(int64, string) error
	}
	photoDir string
}

func NewPhotoHandler(db interface {
	GetTank(int64) (*models.Tank, error)
	UpdateTankPhoto(int64, string) error
	GetInhabitant(int64) (*models.Inhabitant, error)
	UpdateInhabitantPhoto(int64, string) error
}, photoDir string) *PhotoHandler {
	return &PhotoHandler{db: db, photoDir: photoDir}
}

func (h *PhotoHandler) Upload(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, 400, "invalid id")
		return
	}

	tank, err := h.db.GetTank(id)
	if err != nil || tank == nil {
		writeError(w, 404, "tank not found")
		return
	}

	r.ParseMultipartForm(5 << 20)
	file, header, err := r.FormFile("photo")
	if err != nil {
		writeError(w, 400, "no photo file provided")
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" && ext != ".gif" {
		writeError(w, 400, "only .jpg, .png, .webp and .gif files allowed")
		return
	}

	if err := os.MkdirAll(h.photoDir, 0755); err != nil {
		writeError(w, 500, "error creating photo directory")
		return
	}
	filename := fmt.Sprintf("tank_%d%s", id, ext)
	destPath := filepath.Join(h.photoDir, filename)

	dst, err := os.Create(destPath)
	if err != nil {
		writeError(w, 500, "error saving photo")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		dst.Close()
		os.Remove(destPath)
		writeError(w, 500, "error saving photo")
		return
	}

	photoURL := "/api/tanks/photos/" + filename
	if err := h.db.UpdateTankPhoto(id, photoURL); err != nil {
		writeError(w, 500, "error updating photo")
		return
	}

	writeJSON(w, 200, map[string]string{"photo_url": photoURL})
}

func (h *PhotoHandler) Serve(w http.ResponseWriter, r *http.Request) {
	filename := strings.TrimPrefix(r.URL.Path, "/api/tanks/photos/")
	if strings.Contains(filename, "..") {
		writeError(w, 400, "invalid filename")
		return
	}
	filePath := filepath.Join(h.photoDir, filename)
	if !strings.HasPrefix(filepath.Clean(filePath), h.photoDir) {
		writeError(w, 400, "invalid filename")
		return
	}

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		writeError(w, 404, "photo not found")
		return
	}

	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".jpg", ".jpeg":
		w.Header().Set("Content-Type", "image/jpeg")
	case ".png":
		w.Header().Set("Content-Type", "image/png")
	case ".webp":
		w.Header().Set("Content-Type", "image/webp")
	case ".gif":
		w.Header().Set("Content-Type", "image/gif")
	}

	http.ServeFile(w, r, filePath)
}

func (h *PhotoHandler) UploadInhabitantPhoto(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, 400, "invalid id")
		return
	}

	_, err = h.db.GetInhabitant(id)
	if err != nil {
		writeError(w, 404, "inhabitant not found")
		return
	}

	r.ParseMultipartForm(5 << 20)
	file, header, err := r.FormFile("photo")
	if err != nil {
		writeError(w, 400, "no photo file provided")
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" && ext != ".gif" {
		writeError(w, 400, "only .jpg, .png, .webp and .gif files allowed")
		return
	}

	if err := os.MkdirAll(h.photoDir, 0755); err != nil {
		writeError(w, 500, "error creating photo directory")
		return
	}
	filename := fmt.Sprintf("inhabitant_%d%s", id, ext)
	destPath := filepath.Join(h.photoDir, filename)

	dst, err := os.Create(destPath)
	if err != nil {
		writeError(w, 500, "error saving photo")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		dst.Close()
		os.Remove(destPath)
		writeError(w, 500, "error saving photo")
		return
	}

	photoURL := "/api/inhabitants/photos/" + filename
	if err := h.db.UpdateInhabitantPhoto(id, photoURL); err != nil {
		writeError(w, 500, "error updating photo")
		return
	}

	writeJSON(w, 200, map[string]string{"photo_url": photoURL})
}

func (h *PhotoHandler) ServeInhabitantPhoto(w http.ResponseWriter, r *http.Request) {
	filename := strings.TrimPrefix(r.URL.Path, "/api/inhabitants/photos/")
	if strings.Contains(filename, "..") {
		writeError(w, 400, "invalid filename")
		return
	}
	filePath := filepath.Join(h.photoDir, filename)
	if !strings.HasPrefix(filepath.Clean(filePath), h.photoDir) {
		writeError(w, 400, "invalid filename")
		return
	}

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		writeError(w, 404, "photo not found")
		return
	}

	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".jpg", ".jpeg":
		w.Header().Set("Content-Type", "image/jpeg")
	case ".png":
		w.Header().Set("Content-Type", "image/png")
	case ".webp":
		w.Header().Set("Content-Type", "image/webp")
	case ".gif":
		w.Header().Set("Content-Type", "image/gif")
	}

	http.ServeFile(w, r, filePath)
}
