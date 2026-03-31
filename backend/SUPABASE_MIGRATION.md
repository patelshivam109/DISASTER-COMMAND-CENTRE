# PostgreSQL Migration

This backend now runs against `DATABASE_URL` only. Keep `DATABASE_URL` in `backend/.env` set to your Supabase PostgreSQL connection string with `sslmode=require`.

The old SQLite file is no longer used by the running app. It is only a one-time source for copying your existing data into PostgreSQL.

## One-time setup

From `backend/`:

```powershell
.\venv\Scripts\python.exe -m pip install -r Requirements.txt
.\venv\Scripts\python.exe -m flask db upgrade
```

That creates the PostgreSQL schema from the Alembic migration in `backend/migrations/versions/`. After this point, the app should run on PostgreSQL, not SQLite.

## Copy the existing SQLite data

The old local SQLite data lives in `backend/instance/disaster.db`.

From `backend/`:

```powershell
.\venv\Scripts\python.exe scripts\migrate_sqlite_to_postgres.py --truncate
```

The script:

- reads from `backend/instance/disaster.db`
- inserts rows into the PostgreSQL tables in dependency order
- preserves existing primary keys
- resets PostgreSQL sequences after the import
- compares source and target row counts before finishing

## If Supabase does not connect

If the direct Supabase host only resolves to IPv6 on your network, use the Supabase session pooler connection string instead of the direct database host. Keep that value in `backend/.env` as `DATABASE_URL`.

## Current local snapshot

The SQLite database currently contains:

- `user`: 10
- `volunteer`: 5
- `disaster`: 3
- `resource`: 1
- `resource_allocation`: 1
- `volunteer_assignment`: 2
- `disaster_progress_update`: 0
- `activity_log`: 15

The legacy `relief_request` table exists in SQLite but is not part of the active SQLAlchemy models, so it is intentionally not included in the PostgreSQL migration script.
