# AquaDock 🐠

Aquarium management and maintenance planner. Track tanks, schedule recurring tasks, log water parameters, and document issues with photos.

## Quick Start

```sh
docker compose up -d
```

Open http://localhost:8002, register a user, and start adding tanks.

## Features

- **Dashboard** — overview of all tanks, today's pending tasks, overdue events, latest water test results
- **Planner** — day/week/month views for scheduled tasks. Recurring events show as virtual occurrences on each due date
- **Tank Management** — add/edit/delete tanks with photos, track inhabitants, log water parameters with charts
- **Events** — schedule one-time or recurring maintenance tasks (feed, water change, filter clean, test water, etc.). Complete or skip individual occurrences without affecting the series
- **Issues** — document problems like algae growth with title, description, date, and photo. Mark as resolved when fixed
- **Parameter Ranges** — predefined safe ranges for each tank subtype with color-coded status indicators
- **i18n** — English and German interfaces

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go 1.22, chi router, SQLite (WAL mode) |
| Frontend | React 18, TypeScript, Vite |
| Auth | JWT (bcrypt passwords) |
| Hosting | Docker, Caddy (reverse proxy) |

## Development

```sh
# Backend (hot reload)
make backend-dev

# Frontend (Vite dev server)
make frontend-dev

# Full Docker rebuild
make rebuild

# Clear database + rebuild
make clean && make up

# SQLite shell
make db-shell
```

## Project Structure

```
aquadock/
├── backend/
│   ├── cmd/server/         # Entry point, route setup
│   └── internal/
│       ├── config/         # Environment config
│       ├── database/       # SQLite queries per entity
│       ├── handlers/       # HTTP handlers + middleware
│       ├── logic/          # Business logic (recurrence, planner)
│       └── models/         # Go structs
├── frontend/
│   └── src/
│       ├── api/            # API client
│       ├── components/     # React components
│       ├── i18n/           # Translations (en, de)
│       └── types/          # TypeScript interfaces
├── Caddyfile
├── Dockerfile
├── docker-compose.yml
└── Makefile
```

## Configuration

Set via environment variables or `.env` file in `backend/`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8001` | Backend HTTP port (internal, behind Caddy) |
| `DB_PATH` | `./data/aquadock.db` | SQLite database path |
| `JWT_SECRET` | `change-this-to-a-random-secret` | Secret for JWT signing |
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
| PUT | `/api/events/{id}/skip` | Skip one occurrence `{"date":"..."}` |
| PUT | `/api/events/{id}/reschedule` | Reschedule |
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
| GET | `/api/tanks/{id}/params` | List params |
| POST | `/api/tanks/{id}/params` | Log param |
| GET | `/api/tanks/{id}/params/latest` | Latest param |
| DELETE | `/api/params/{id}` | Delete param |

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register (username + password, email optional) |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/status` | Get current user |
| GET | `/api/health` | Healthcheck |
