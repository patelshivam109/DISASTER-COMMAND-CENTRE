from flask import Flask
from flask_cors import CORS
from sqlalchemy import inspect, text

from models import db
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
app.register_blueprint(auth_bp, url_prefix="/api/auth")


def ensure_sqlite_columns():
    inspector = inspect(db.engine)

    def add_column_if_missing(table_name, column_name, ddl):
        existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
        if column_name not in existing_columns:
            db.session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl}"))

    add_column_if_missing("disaster", "priority", "VARCHAR(20) DEFAULT 'Moderate'")
    add_column_if_missing("disaster", "status", "VARCHAR(50) DEFAULT 'Active'")
    add_column_if_missing("disaster", "response_team", "VARCHAR(120)")
    add_column_if_missing("volunteer", "hours_logged", "INTEGER DEFAULT 0")
    db.session.commit()


with app.app_context():
    db.create_all()
    ensure_sqlite_columns()

@app.route("/")
def home():
    return {"status": "Backend running successfully"}

if __name__ == "__main__":
    app.run(debug=True)
