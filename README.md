# ResQlink (Disaster Command centre)🛡️
### Unified Response | Secure Intelligence

A Real-Time Disaster Response Command Center — built for speed, clarity, and coordination during emergencies.

Most beginner projects stop at basic CRUD. ResQlink is built closer to a real-world system used during active crisis events — bringing incidents, resources, and volunteers into a single, unified workspace.

---

## Key Features

- **Disaster lifecycle tracking** — Created → Active → Recovering → Closed
- **Role-based access** — Separate Admin & Volunteer workflows with JWT auth
- **Volunteer assignment & response system** — Field task coordination in real time
- **Resource management** — Inventory tracking with low-stock alerts and allocation history
- **Analytics dashboard** — Incident status, resource usage, volunteer hours at a glance
- **Activity / Audit logs** — Full traceability for every action
- **PDF report generation** — Post-incident summaries for review and record-keeping

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), Vanilla CSS |
| Backend | Flask (SQLAlchemy, Blueprints) |
| Database | PostgreSQL (migrated from SQLite) |
| Auth | JWT-based role access with secure password hashing |

---

## Getting Started

### Backend
```bash
cd backend
pip install -r requirements.txt
py app.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
disaster-relief-portal/
├── backend/          # Flask API (routes, models, auth)
├── frontend/         # React app (pages, components, assets)
│   └── src/
│       ├── assets/   # resqlink-logo.png and static assets
│       ├── components/
│       ├── pages/
│       └── ...
└── README.md
```
