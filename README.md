# AquaDock 🐠

Aquarium management and maintenance planner. Track tanks, schedule recurring tasks, log water parameters with a visual Nitrogen Cycle diagram and parameter status gauges, and document issues with photos.

## Quick Start

```sh
docker compose up -d
```

Open http://localhost:8002 and log in with the demo account, or register a new user.

**Demo account:** username `demo`, password `demo123` — comes with a pre-seeded 120L tank, inhabitants, recurring events, and water test history.

## Features

- **Dashboard** — overview of all tanks, today's pending tasks, overdue events, latest water test results with color-coded status badges
- **Planner** — day/week/month views for scheduled tasks. Recurring events show as virtual occurrences on each due date. Complete or skip individual occurrences
- **Tank Management** — add/edit/delete tanks with photos, track inhabitants (fish, snails, etc.)
- **Water Parameters** — log test results (ammonia, nitrite, nitrate, pH, temperature, GH, KH) with a **Nitrogen Cycle SVG diagram** showing the biological filtration process and **parameter status gauges** that visualize each value relative to its safe range
- **Parameter Trend Charts** — Recharts line charts for each tracked parameter over time
- **Events** — schedule one-time or recurring maintenance tasks (feed, water change, filter clean, test water, etc.)
- **Issues** — document problems like algae growth with title, description, date, and photo. Mark as resolved when fixed
- **Parameter Ranges** — 12 predefined safe range profiles per tank subtype (community, planted, reef, etc.), editable in settings
- **i18n** — English, German, Japanese, and Dutch interfaces
- **5 Themes** — Light, Dark, Ocean, Reef, and Pond color schemes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go 1.22, chi router, SQLite (WAL mode) |
| Frontend | React 18, TypeScript, Vite, Recharts |
| Auth | JWT (bcrypt passwords), 72h expiry |
| Hosting | Docker multi-stage, Caddy (reverse proxy) |

## Development

```sh
# Backend (hot reload on :8001)
make backend-dev

# Frontend (Vite dev server on :5174, proxies /api to backend)
make frontend-dev

# Full Docker rebuild
make rebuild

# Clear database volume + rebuild
make clean && make up

# SQLite shell into live database
make db-shell

# Lint + typecheck
make test
```

## Project Structure

```
aquadock/
├── backend/
│   ├── cmd/server/           # Entry point, route wiring
│   └── internal/
│       ├── config/           # Environment config loader
│       ├── database/         # SQLite CRUD per entity
│       ├── handlers/         # HTTP handlers + JWT middleware
│       ├── logic/            # Recurrence computation
│       └── models/           # Go structs
├── frontend/
│   └── src/
│       ├── api/              # HTTP client with JWT injection
│       ├── components/
│       │   ├── Auth/         # Login, register, auth context
│       │   ├── Charts/       # ParamChart (Recharts), WaterParamDiagram (SVG)
│       │   ├── Dashboard/    # Dashboard, TankDetailView
│       │   ├── Layout/       # Header with navigation
│       │   ├── Modals/       # AddTank, Settings, TankDetail
│       │   ├── Onboarding/   # First-run wizard
│       │   ├── Planner/      # Day/week/month planner
│       │   ├── Tanks/        # Tank grid list
│       │   └── UI/           # Toast notifications
│       ├── i18n/             # Translations (en, de, ja, nl)
│       └── types/            # TypeScript interfaces
├── Caddyfile                 # Production reverse proxy config
├── Dockerfile                # Multi-stage build (Go → Node → Caddy)
├── docker-compose.yml        # Single service with persistent volume
└── Makefile                  # Build/test/run targets
```

## Configuration

Set via environment variables or `.env` file in `backend/`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8001` | Backend HTTP port (internal, behind Caddy) |
| `DB_PATH` | `./data/aquadock.db` | SQLite database path |
| `JWT_SECRET` | *(required)* | Secret for JWT signing — server fails to start if unset |
| `PHOTO_DIR` | `./data/photos` | Directory for uploaded photos |

## API

All endpoints except `/api/auth/register`, `/api/auth/login`, and `/api/health` require JWT auth via `Authorization: Bearer <token>` header.

### Tanks
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tanks` | List all tanks |
| POST | `/api/tanks` | Create tank |
| GET | `/api/tanks/{id}` | Get tank |
| PUT | `/api/tanks/{id}` | Update tank |
| DELETE | `/api/tanks/{id}` | Delete tank |
| POST | `/api/tanks/{id}/photo` | Upload tank photo |

### Events
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tanks/{id}/events` | List events for tank |
| GET | `/api/tanks/{id}/events/upcoming` | Upcoming events |
| POST | `/api/tanks/{id}/events` | Create event |
| PUT | `/api/events/{id}` | Update event |
| PUT | `/api/events/{id}/complete` | Complete (with optional `{"date":"..."}` for recurring) |
| PUT | `/api/events/{id}/skip` | Skip one occurrence |
| PUT | `/api/events/{id}/reschedule` | Reschedule date/time |
| DELETE | `/api/events/{id}` | Delete entire series |

### Planner
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/planner?date=YYYY-MM-DD` | Events for a date |
| GET | `/api/planner/range?start=&end=` | Events in date range |
| GET | `/api/planner/overdue` | Overdue events |

### Issues
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tanks/{id}/issues` | List issues for tank |
| POST | `/api/tanks/{id}/issues` | Create issue |
| GET | `/api/issues/{id}` | Get issue |
| PUT | `/api/issues/{id}` | Update issue |
| DELETE | `/api/issues/{id}` | Delete issue |
| POST | `/api/issues/{id}/photo` | Upload issue photo |

### Water Parameters
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tanks/{id}/params` | List params (up to 30) |
| POST | `/api/tanks/{id}/params` | Log water test |
| GET | `/api/tanks/{id}/params/latest` | Latest reading |
| DELETE | `/api/params/{id}` | Delete param |

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register (username + password, email optional) |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/status` | Get current user |
| GET | `/api/health` | Healthcheck — `{"status":"ok"}` |
