from flask import Blueprint, request, jsonify
from sqlalchemy import func, or_
from werkzeug.security import generate_password_hash, check_password_hash

from models import User, db
from services.workflow_service import ensure_volunteer_profile_for_user


auth_bp = Blueprint("auth_bp", __name__)
ADMIN_AUTH_CODE = "ADIO123"


def normalize_email(value):
    return (value or "").strip().lower()


def normalize_phone(value):
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def first_non_empty(*values):
    for value in values:
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def ensure_unique_username(base_value):
    base = "".join(ch for ch in (base_value or "").lower() if ch.isalnum() or ch in "._-")
    if not base:
        base = "volunteer"

    candidate = base
    suffix = 1
    while User.query.filter_by(username=candidate).first():
        candidate = f"{base}{suffix}"
        suffix += 1
    return candidate


def find_user_by_login(login_value):
    email = normalize_email(login_value)
    phone = normalize_phone(login_value)

    filters = []
    if email:
        filters.append(func.lower(User.email) == email)
    if phone:
        filters.append(User.phone == phone)

    if not filters:
        return None
    return User.query.filter(or_(*filters)).first()


def find_user_by_email(email_value):
    email = normalize_email(email_value)
    if not email:
        return None
    return User.query.filter(func.lower(User.email) == email).first()


def find_user_by_phone(phone_value):
    phone = normalize_phone(phone_value)
    if not phone:
        return None
    return User.query.filter(User.phone == phone).first()


def find_user_by_identifier(identifier):
    value = (identifier or "").strip()
    if not value:
        return None

    email = normalize_email(value)
    phone = normalize_phone(value)
    username = value.lower()

    return User.query.filter(
        or_(
            func.lower(User.email) == email,
            User.phone == phone,
            func.lower(User.username) == username,
        )
    ).first()


@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}

    name = data.get("name", "").strip()
    email = normalize_email(data.get("email"))
    phone = normalize_phone(data.get("phone"))
    password = data.get("password", "").strip()
    skills = (data.get("skills") or "").strip() or None
    requested_role = (data.get("role") or "volunteer").strip().lower()
    admin_code = (data.get("admin_code") or "").strip()

    if requested_role not in {"volunteer", "admin"}:
        return jsonify({"error": "Invalid role selection"}), 400

    if requested_role == "admin":
        if not name or not email or not password:
            return jsonify({"error": "Name, email, and password are required for admin signup"}), 400
        if admin_code != ADMIN_AUTH_CODE:
            return jsonify({"error": "Invalid Admin Authorization Code"}), 403
    else:
        if not name or not email or not phone or not password:
            return jsonify({"error": "Name, email, phone number, and password are required"}), 400

    email_owner = find_user_by_email(email)
    phone_owner = find_user_by_phone(phone)
    if email_owner and phone_owner and email_owner.id != phone_owner.id:
        return jsonify({"error": "Email and phone belong to different accounts"}), 409

    existing = email_owner or phone_owner

    if existing and existing.password_initialized:
        return jsonify({"error": "Account already exists"}), 409

    if existing and not existing.password_initialized:
        existing.name = name
        existing.email = email
        existing.phone = phone or existing.phone
        existing.password_hash = generate_password_hash(password)
        existing.password_initialized = True
        existing.role = requested_role
        existing.verified = requested_role == "admin"
        user = existing
    else:
        username_seed = first_non_empty(email.split("@")[0] if email else "", phone, name.replace(" ", "").lower())
        user = User(
            username=ensure_unique_username(username_seed),
            name=name,
            email=email,
            phone=phone or None,
            password_hash=generate_password_hash(password),
            role=requested_role,
            verified=requested_role == "admin",
            password_initialized=True,
        )
        db.session.add(user)

    db.session.commit()

    if requested_role == "volunteer":
        profile = ensure_volunteer_profile_for_user(user)
        if profile:
            profile.name = name
            profile.email = email
            profile.phone = phone
            if skills:
                profile.skills = skills
            profile.verification_status = "Pending"
        db.session.commit()
        return jsonify({"message": "Volunteer registered successfully", "user": user.to_dict()}), 201

    return jsonify({"message": "Admin account created successfully", "user": user.to_dict()}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}

    login_input = first_non_empty(data.get("login"), data.get("email"), data.get("phone"))
    password = data.get("password", "").strip()
    admin_code = (data.get("admin_code") or "").strip()

    if not login_input or not password:
        return jsonify({"error": "Email/phone and password are required"}), 400

    user = find_user_by_login(login_input)
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid credentials"}), 401

    if not user.password_initialized:
        return jsonify({"error": "Account setup pending. Complete signup first."}), 403

    if (user.role or "").lower() == "admin":
        if normalize_email(login_input) != normalize_email(user.email):
            return jsonify({"error": "Admin login requires email"}), 400
        if admin_code != ADMIN_AUTH_CODE:
            return jsonify({"error": "Invalid Admin Authorization Code"}), 403
    else:
        ensure_volunteer_profile_for_user(user)

    return jsonify({"user": user.to_dict()}), 200


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json() or {}
    identifier = (data.get("identifier") or "").strip()

    if not identifier:
        return jsonify({"error": "Email, phone, or username is required"}), 400

    user = find_user_by_identifier(identifier)
    if user:
        return (
            jsonify(
                {
                    "message": (
                        "If an account exists, password reset instructions have been queued. "
                        "Please contact your administrator to complete reset."
                    )
                }
            ),
            200,
        )

    return (
        jsonify(
            {
                "message": (
                    "If an account exists, password reset instructions have been queued. "
                    "Please contact your administrator to complete reset."
                )
            }
        ),
        200,
    )
