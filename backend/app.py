from dotenv import load_dotenv

load_dotenv()

from flask import Flask
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



app = Flask(__name__)
CORS(app)

database_url = get_database_url()
app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_pre_ping": True}

db.init_app(app)
migrate = Migrate(app, db)

app.register_blueprint(disaster_bp, url_prefix="/api")
app.register_blueprint(resource_bp, url_prefix="/api")
app.register_blueprint(volunteer_bp, url_prefix="/api")
app.register_blueprint(dashboard_bp, url_prefix="/api")
app.register_blueprint(auth_bp, url_prefix="/api/auth")

@app.route("/")
def home():
    return {"status": "Backend running successfully"}

if __name__ == "__main__":
    app.run(debug=True)
