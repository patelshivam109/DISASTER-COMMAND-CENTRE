from functools import wraps

from flask import g, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request

try:
    from models import User
except ModuleNotFoundError:
    from ..models import User


def get_current_user_id():
    raw = get_jwt_identity()
    if not raw:
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def load_current_user():
    verify_jwt_in_request()

    user_id = get_current_user_id()
    claims = get_jwt()
    token_role = (claims.get("role") or "").strip().lower()
    if not user_id or not token_role:
        return None

    user = User.query.get(user_id)
    if not user:
        return None

    database_role = (user.role or "").strip().lower()
    if database_role != token_role:
        return None

    g.current_user = user
    g.current_user_id = user.id
    g.current_user_role = database_role
    g.jwt_claims = claims
    return user


def require_auth(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        user = load_current_user()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        return fn(*args, **kwargs)

    return wrapped


def require_role(role):
    return require_roles(role)


def require_roles(*allowed_roles):
    normalized_roles = {role.strip().lower() for role in allowed_roles if role}

    def decorator(fn):
        @wraps(fn)
        def wrapped(*args, **kwargs):
            user = load_current_user()
            if not user:
                return jsonify({"error": "Unauthorized"}), 401
            if g.current_user_role not in normalized_roles:
                return jsonify({"error": "Forbidden"}), 403
            return fn(*args, **kwargs)

        return wrapped

    return decorator
