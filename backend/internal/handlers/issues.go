package handlers

import (
	"encoding/json"
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

type IssueHandler struct {
	db interface {
		CreateIssue(*models.IssueCreate) (*models.Issue, error)
		GetIssue(int64) (*models.Issue, error)
		ListIssuesByTank(int64) ([]models.Issue, error)
		UpdateIssue(int64, *models.IssueUpdate) (*models.Issue, error)
		UpdateIssuePhoto(int64, string) error
		DeleteIssue(int64) error
	}
	photoDir string
}

func NewIssueHandler(db interface {
	CreateIssue(*models.IssueCreate) (*models.Issue, error)
	GetIssue(int64) (*models.Issue, error)
	ListIssuesByTank(int64) ([]models.Issue, error)
	UpdateIssue(int64, *models.IssueUpdate) (*models.Issue, error)
	UpdateIssuePhoto(int64, string) error
	DeleteIssue(int64) error
}, photoDir string) *IssueHandler {
	return &IssueHandler{db: db, photoDir: photoDir}
}

func (h *IssueHandler) List(w http.ResponseWriter, r *http.Request) {
	tankID, _ := strconv.ParseInt(chi.URLParam(r, "tankId"), 10, 64)
	issues, err := h.db.ListIssuesByTank(tankID)
	if err != nil {
		writeError(w, 500, "failed to list issues")
		return
	}
	if issues == nil {
		issues = []models.Issue{}
	}
	writeJSON(w, 200, issues)
}

func (h *IssueHandler) Create(w http.ResponseWriter, r *http.Request) {
	tankID, _ := strconv.ParseInt(chi.URLParam(r, "tankId"), 10, 64)
	var req models.IssueCreate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request")
		return
	}
	req.TankID = tankID
	if req.Title == "" {
		writeError(w, 400, "title is required")
		return
	}
	issue, err := h.db.CreateIssue(&req)
	if err != nil {
		writeError(w, 500, "failed to create issue")
		return
	}
	writeJSON(w, 201, issue)
}

func (h *IssueHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	issue, err := h.db.GetIssue(id)
	if err != nil {
		writeError(w, 404, "issue not found")
		return
	}
	writeJSON(w, 200, issue)
}

func (h *IssueHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req models.IssueUpdate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request")
		return
	}
	issue, err := h.db.UpdateIssue(id, &req)
	if err != nil {
		writeError(w, 500, "failed to update issue")
		return
	}
	writeJSON(w, 200, issue)
}

func (h *IssueHandler) UploadPhoto(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	issue, err := h.db.GetIssue(id)
	if err != nil || issue == nil {
		writeError(w, 404, "issue not found")
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

	os.MkdirAll(h.photoDir, 0755)
	filename := fmt.Sprintf("issue_%d%s", id, ext)
	destPath := filepath.Join(h.photoDir, filename)

	dst, err := os.Create(destPath)
	if err != nil {
		writeError(w, 500, "error saving photo")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		writeError(w, 500, "error saving photo")
		return
	}

	photoURL := "/api/issues/photos/" + filename
	if err := h.db.UpdateIssuePhoto(id, photoURL); err != nil {
		writeError(w, 500, "error updating photo")
		return
	}

	writeJSON(w, 200, map[string]string{"photo_url": photoURL})
}

func (h *IssueHandler) ServePhoto(w http.ResponseWriter, r *http.Request) {
	filename := strings.TrimPrefix(r.URL.Path, "/api/issues/photos/")
	filePath := filepath.Join(h.photoDir, filename)

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

func (h *IssueHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		writeError(w, 400, "invalid issue id")
		return
	}

	issue, err := h.db.GetIssue(id)
	if err != nil || issue == nil {
		writeError(w, 404, "issue not found")
		return
	}

	if issue.PhotoURL != nil {
		filename := strings.TrimPrefix(*issue.PhotoURL, "/api/issues/photos/")
		os.Remove(filepath.Join(h.photoDir, filename))
	}

	if err := h.db.DeleteIssue(id); err != nil {
		writeError(w, 500, "failed to delete issue")
		return
	}
	w.WriteHeader(204)
}
