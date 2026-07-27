# ResQlink (Disaster Command centre) 🛡️

### Unified Response | Secure Intelligence

A Real-Time Disaster Response Command Center — built for speed, clarity, and coordination during emergencies..

Unlike basic CRUD applications, ResQlink is a full-stack, modular web application designed for comprehensive crisis management. It serves as a command center that intricately links geographic disaster locations, physical resources (inventory), and human capital (volunteers), tied together with a strict auditing and tracking system.

---

## ✨ Features

1. **Interactive Geospatial Dashboard**: 
   - Renders live disasters on an interactive map.
   - Includes map filters and a side panel to view specific disaster details when a map marker is clicked.
2. **Disaster Lifecycle Management**:
   - Tracks disaster Type, Location (String & Lat/Lng), Severity, Priority, Status (e.g., Created, Closed), and Affected counts.
   - Allows users to post progress updates tied to a disaster.
3. **Advanced Resource & Inventory Management**:
   - Tracks items by category, quantity, and warehouse location.
   - **Dynamic Stock Calculation**: Automatically flags resources as `Normal`, `Low`, or `Critical` based on configurable thresholds.
   - **Resource Allocations**: Records exactly how many units of a resource were sent to a specific disaster, along with notes and the assigner's name.
4. **Volunteer Workforce Coordination**:
   - Manages volunteer profiles containing skills, availability, and verification status.
   - **Task Assignments**: Assigns a volunteer to a specific disaster, tracks the task details, logs hours worked, and updates status (Assigned → Completed).
5. **Role-Based Security & Auth**:
   - Users are registered and assigned roles.
   - Secures API access using JSON Web Tokens (JWT).
   - Tracks account verification and password initialization states.
6. **Immutable Audit Logging**:
   - Every major action records what happened, the details, and the actor. Logs are permanently tied to Disasters, Resources, or Volunteers.
7. **UI/UX Enhancements**:
   - Built-in Dark/Light theme toggling.
   - A Backend Status Banner that continuously checks to ensure the server is alive.

---

## ⚙️ How It Works (System Workflow)

1. **API & Database Layer**: The Flask backend exposes RESTful endpoints via modular Blueprints. It connects to a PostgreSQL database via SQLAlchemy. Alembic handles database schema migrations.
2. **Authentication Flow**: A user logs in and the backend returns a JWT. This token is attached as a Bearer token to all subsequent API calls. Flask-JWT-Extended intercepts these on the backend, rejecting unauthorized access.
3. **Data Relational Flow**: 
   - When a Disaster is created, its coordinates are sent to the frontend Map component. 
   - When a Resource is allocated, the backend creates a record, deducts the quantity, and checks if the new quantity breaches the critical threshold.
   - When a Volunteer is assigned a task, hours logged are tallied and added to the volunteer's global profile upon completion.
   - Every single one of these actions fires an insert into the `ActivityLog` table.
4. **Frontend Rendering**: React fetches JSON payloads from the backend. It uses React Router to swap between pages while maintaining a persistent Sidebar. Tailwind CSS rapidly styles the data grids and cards.

---

## 🛠️ Tech Stack

### Frontend
- **Core**: React 19 (`react`, `react-dom`)
- **Build Tool**: Vite (using Rolldown `rolldown-vite`)
- **Routing**: React Router DOM v7
- **Styling**: Tailwind CSS v4, PostCSS, Autoprefixer, Vanilla CSS
- **Mapping**: Leaflet v1.9, React-Leaflet v5, Leaflet MarkerCluster
- **Icons**: Lucide React
- **Linting**: ESLint v9

### Backend
- **Core Framework**: Python / Flask 3.1.2
- **Database ORM**: SQLAlchemy 2.0.43 & Flask-SQLAlchemy 3.1.1
- **Database Driver**: PostgreSQL (`psycopg2-binary 2.9.10`)
- **Migrations**: Flask-Migrate 4.1.0 (Alembic)
- **Authentication**: Flask-JWT-Extended 4.7.1
- **CORS Handling**: Flask-Cors 6.0.1
- **Environment Management**: `python-dotenv`
- **Production Server**: Gunicorn 23.0.0

---

## 🚀 Getting Started

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
pip install -r requirements.txt
python app.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
