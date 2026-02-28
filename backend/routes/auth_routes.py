from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

from models import db, User


auth_bp = Blueprint("auth_bp", __name__)


@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}

    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    role = data.get("role", "volunteer")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    if role not in ("admin", "volunteer"):
        role = "volunteer"

    existing = User.query.filter_by(username=username).first()
    if existing:
        return jsonify({"error": "Username already exists"}), 409

    user = User(
        username=username,
        password_hash=generate_password_hash(password),
        role=role,
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User created successfully", "user": user.to_dict()}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}

    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid credentials"}), 401

    return jsonify({"user": user.to_dict()}), 200
