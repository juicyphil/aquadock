package main

import (
	"log"
	"net/http"

	"aquadock/internal/config"
	"aquadock/internal/database"
	"aquadock/internal/handlers"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	cfg := config.Load()

	db, err := database.New(cfg.DBPath)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer db.Close()

	tankHandler := handlers.NewTankHandler(db)
	inhabitantHandler := handlers.NewInhabitantHandler(db)
	eventHandler := handlers.NewEventHandler(db)
	paramHandler := handlers.NewParamHandler(db)
	paramRangeHandler := handlers.NewParamRangeHandler(db)
	dashboardHandler := handlers.NewDashboardHandler(db)
	authHandler := handlers.NewAuthHandler(db, cfg.JWTSecret)
	photoHandler := handlers.NewPhotoHandler(db, cfg.PhotoDir)

	r := chi.NewRouter()
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	}))

	r.Route("/api", func(r chi.Router) {
		r.Get("/tanks/photos/{filename}", photoHandler.Serve)
		r.Post("/auth/register", authHandler.Register)
		r.Post("/auth/login", authHandler.Login)
		r.With(handlers.JWTAuth(cfg.JWTSecret)).Get("/auth/status", authHandler.Status)

		r.Group(func(r chi.Router) {
			r.Use(handlers.JWTAuth(cfg.JWTSecret))

			r.Route("/tanks", func(r chi.Router) {
				r.Get("/", tankHandler.List)
				r.Post("/", tankHandler.Create)
				r.Get("/{id}", tankHandler.Get)
				r.Put("/{id}", tankHandler.Update)
				r.Delete("/{id}", tankHandler.Delete)
				r.Post("/{id}/photo", photoHandler.Upload)

				r.Route("/{tankId}/inhabitants", func(r chi.Router) {
					r.Get("/", inhabitantHandler.List)
					r.Post("/", inhabitantHandler.Create)
				})

				r.Route("/{tankId}/events", func(r chi.Router) {
					r.Get("/", eventHandler.ListByTank)
					r.Post("/", eventHandler.Create)
				})

				r.Route("/{tankId}/params", func(r chi.Router) {
					r.Get("/", paramHandler.List)
					r.Post("/", paramHandler.Create)
					r.Get("/latest", paramHandler.Latest)
				})
			})

			r.Put("/inhabitants/{id}", inhabitantHandler.Update)
			r.Delete("/inhabitants/{id}", inhabitantHandler.Delete)

			r.Put("/events/{id}/complete", eventHandler.Complete)
			r.Put("/events/{id}/reschedule", eventHandler.Reschedule)
			r.Delete("/events/{id}", eventHandler.Delete)

			r.Delete("/params/{id}", paramHandler.Delete)

			r.Route("/param-ranges", func(r chi.Router) {
				r.Get("/", paramRangeHandler.List)
				r.Put("/", paramRangeHandler.Update)
			})

			r.Get("/dashboard", dashboardHandler.Get)
			r.Get("/planner", eventHandler.ListByDate)
			r.Get("/planner/range", eventHandler.ListRange)
			r.Get("/planner/overdue", eventHandler.ListOverdue)
		})
	})

	addr := ":" + cfg.Port
	log.Printf("AquaDock server starting on %s", addr)
	log.Fatal(http.ListenAndServe(addr, r))
}
