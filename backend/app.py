from flask import Flask
from flask_cors import CORS
from sqlalchemy import inspect, text

from models import db
from routes.dashboard_routes import dashboard_bp
from routes.disaster_routes import disaster_bp
from routes.resource_route import resource_bp
from routes.volunteers_routes import volunteer_bp
from routes.auth_routes import auth_bp



app = Flask(__name__)
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///disaster.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

app.register_blueprint(disaster_bp, url_prefix="/api")
app.register_blueprint(resource_bp, url_prefix="/api")
app.register_blueprint(volunteer_bp, url_prefix="/api")
app.register_blueprint(dashboard_bp, url_prefix="/api")
app.register_blueprint(auth_bp, url_prefix="/api/auth")


def ensure_sqlite_columns():
    def add_column_if_missing(table_name, column_name, ddl):
        inspector = inspect(db.engine)
        existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
        if column_name not in existing_columns:
            db.session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl}"))

    add_column_if_missing("disaster", "priority", "VARCHAR(20) DEFAULT 'Moderate'")
    add_column_if_missing("disaster", "status", "VARCHAR(50) DEFAULT 'Created'")
    add_column_if_missing("disaster", "response_team", "VARCHAR(120)")
    add_column_if_missing("disaster", "affected_count", "INTEGER DEFAULT 0")
    add_column_if_missing("disaster", "affected_display", "VARCHAR(50) DEFAULT '0'")
    add_column_if_missing("disaster", "created_at", "DATETIME")
    add_column_if_missing("disaster", "closed_at", "DATETIME")
    add_column_if_missing("volunteer", "hours_logged", "INTEGER DEFAULT 0")
    add_column_if_missing("volunteer", "verification_status", "VARCHAR(30) DEFAULT 'Pending'")
    add_column_if_missing("volunteer", "user_id", "INTEGER")
    add_column_if_missing("volunteer", "email", "VARCHAR(120)")
    add_column_if_missing("resource", "category", "VARCHAR(100) DEFAULT 'General'")
    add_column_if_missing("resource", "warehouse_info", "VARCHAR(150)")
    add_column_if_missing("resource", "low_threshold", "INTEGER DEFAULT 50")
    add_column_if_missing("resource", "critical_threshold", "INTEGER DEFAULT 20")
    add_column_if_missing("user", "name", "VARCHAR(120)")
    add_column_if_missing("user", "email", "VARCHAR(120)")
    add_column_if_missing("user", "phone", "VARCHAR(20)")
    add_column_if_missing("user", "verified", "BOOLEAN DEFAULT 0")
    add_column_if_missing("user", "password_initialized", "BOOLEAN DEFAULT 1")
    db.session.execute(
        text(
            "UPDATE disaster "
            "SET created_at = CURRENT_TIMESTAMP "
            "WHERE created_at IS NULL"
        )
    )
    db.session.execute(
        text(
            "UPDATE disaster "
            "SET affected_display = CAST(COALESCE(affected_count, 0) AS TEXT) "
            "WHERE affected_display IS NULL OR TRIM(affected_display) = ''"
        )
    )
    db.session.execute(
        text(
            "UPDATE user "
            "SET name = username "
            "WHERE name IS NULL OR TRIM(name) = ''"
        )
    )
    db.session.execute(
        text(
            "UPDATE user "
            "SET verified = 0 "
            "WHERE verified IS NULL"
        )
    )
    db.session.execute(
        text(
            "UPDATE user "
            "SET password_initialized = 1 "
            "WHERE password_initialized IS NULL"
        )
    )
    db.session.execute(
        text(
            "UPDATE volunteer "
            "SET phone = 'N/A' "
            "WHERE phone IS NULL OR TRIM(phone) = ''"
        )
    )
    db.session.execute(
        text(
            "UPDATE volunteer "
            "SET user_id = ("
            "  SELECT u.id FROM user u "
            "  WHERE (volunteer.email IS NOT NULL AND TRIM(volunteer.email) != '' AND lower(u.email) = lower(volunteer.email)) "
            "     OR (volunteer.phone IS NOT NULL AND TRIM(volunteer.phone) != '' AND volunteer.phone != 'N/A' AND u.phone = volunteer.phone) "
            "  LIMIT 1"
            ") "
            "WHERE user_id IS NULL "
            "AND ("
            "  (email IS NOT NULL AND TRIM(email) != '') "
            "  OR (phone IS NOT NULL AND TRIM(phone) != '' AND phone != 'N/A')"
            ")"
        )
    )
    db.session.execute(
        text(
            "UPDATE volunteer_assignment "
            "SET volunteer_id = ("
            "  SELECT v.user_id FROM volunteer v WHERE v.id = volunteer_assignment.volunteer_id"
            ") "
            "WHERE EXISTS ("
            "  SELECT 1 FROM volunteer v "
            "  WHERE v.id = volunteer_assignment.volunteer_id "
            "    AND v.user_id IS NOT NULL "
            "    AND v.user_id != volunteer_assignment.volunteer_id"
            ")"
        )
    )
    db.session.commit()


with app.app_context():
    db.create_all()
    ensure_sqlite_columns()

@app.route("/")
def home():
    return {"status": "Backend running successfully"}

if __name__ == "__main__":
    app.run(debug=True)
