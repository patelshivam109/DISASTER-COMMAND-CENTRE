import logging
import os
from datetime import timedelta

from dotenv import load_dotenv
from flask_jwt_extended import JWTManager
from werkzeug.exceptions import HTTPException

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))
load_dotenv()

from flask import Flask, request
from flask_cors import CORS
from flask_migrate import Migrate

try:
    from db_config import get_database_url
    from models import db
    from routes.dashboard_routes import dashboard_bp
    from routes.disaster_routes import disaster_bp
    from routes.resource_route import resource_bp
    from routes.volunteers_routes import volunteer_bp
    from routes.auth_routes import auth_bp
except ModuleNotFoundError:
    from .db_config import get_database_url
    from .models import db
    from .routes.dashboard_routes import dashboard_bp
    from .routes.disaster_routes import disaster_bp
    from .routes.resource_route import resource_bp
    from .routes.volunteers_routes import volunteer_bp
    from .routes.auth_routes import auth_bp

def get_cors_origins():
    raw_value = (os.getenv("CORS_ORIGINS") or "*").strip()
    if raw_value == "*":
        return "*"
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


def configure_logging(flask_app):
    log_level_name = (os.getenv("LOG_LEVEL") or "INFO").upper()
    log_level = getattr(logging, log_level_name, logging.INFO)
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    flask_app.logger.setLevel(log_level)


def get_jwt_secret():
    jwt_secret = (os.getenv("JWT_SECRET_KEY") or "").strip()
    if not jwt_secret:
        raise RuntimeError("JWT_SECRET_KEY is not set. Configure it in the deployment environment.")
    return jwt_secret


app = Flask(__name__)
configure_logging(app)
CORS(app, resources={r"/api/*": {"origins": get_cors_origins()}})

database_url = get_database_url()
app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_pre_ping": True}
app.config["JWT_SECRET_KEY"] = get_jwt_secret()
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(seconds=3600)

db.init_app(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)

app.register_blueprint(disaster_bp, url_prefix="/api")
app.register_blueprint(resource_bp, url_prefix="/api")
app.register_blueprint(volunteer_bp, url_prefix="/api")
app.register_blueprint(dashboard_bp, url_prefix="/api")
app.register_blueprint(auth_bp, url_prefix="/api/auth")


@jwt.unauthorized_loader
def handle_missing_jwt(_reason):
    return {"error": "Unauthorized"}, 401


@jwt.invalid_token_loader
def handle_invalid_jwt(_reason):
    return {"error": "Unauthorized"}, 401


@jwt.expired_token_loader
def handle_expired_jwt(_jwt_header, _jwt_payload):
    return {"error": "Unauthorized"}, 401


@jwt.needs_fresh_token_loader
def handle_non_fresh_jwt(_jwt_header, _jwt_payload):
    return {"error": "Unauthorized"}, 401


@jwt.revoked_token_loader
def handle_revoked_jwt(_jwt_header, _jwt_payload):
    return {"error": "Unauthorized"}, 401


def log_registered_routes():
    routes = sorted(str(rule) for rule in app.url_map.iter_rules())
    app.logger.info("Registered routes: %s", ", ".join(routes))


@app.before_request
def log_request():
    app.logger.info("Request received: %s %s", request.method, request.path)

@app.route("/")
def home():
    return {"status": "Backend running successfully"}


@app.route("/api/test")
def api_test():
    app.logger.info("API test route hit successfully")
    return {"message": "Backend is working"}


@app.errorhandler(Exception)
def handle_unexpected_error(error):
    if isinstance(error, HTTPException):
        return error

    app.logger.exception("Unhandled application error: %s", error)
    return {"error": "Internal server error"}, 500

if __name__ == "__main__":
    log_registered_routes()
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=False)
else:
    log_registered_routes()
