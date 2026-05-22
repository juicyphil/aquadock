package config

import (
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

type Config struct {
	Port      string
	DBPath    string
	JWTSecret string
	PhotoDir  string
}

func dirExists(path string) bool {
	fi, err := os.Stat(path)
	return err == nil && fi.IsDir()
}

func resolvePath(p string) string {
	if filepath.IsAbs(p) {
		return p
	}
	exe, err := os.Executable()
	if err == nil {
		resolved := filepath.Join(filepath.Dir(exe), p)
		if dirExists(filepath.Dir(resolved)) {
			return resolved
		}
	}
	wd, err := os.Getwd()
	if err == nil {
		return filepath.Join(wd, p)
	}
	return p
}

func Load() *Config {
	godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8001"
	}

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./data/aquadock.db"
	}
	dbPath = resolvePath(dbPath)

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}

	photoDir := os.Getenv("PHOTO_DIR")
	if photoDir == "" {
		photoDir = "./data/photos"
	}
	photoDir = resolvePath(photoDir)

	return &Config{
		Port:      port,
		DBPath:    dbPath,
		JWTSecret: jwtSecret,
		PhotoDir:  photoDir,
	}
}
