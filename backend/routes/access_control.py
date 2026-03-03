from functools import wraps

from flask import g, jsonify, request

from models import User


def get_request_role():
    return (request.headers.get("X-Role") or "").strip().lower()


def get_request_user_id():
    raw = (request.headers.get("X-User-Id") or "").strip()
    if not raw:
        return None
    try:
        return int(raw)
    except ValueError:
        return None


def get_current_user():
    user_id = get_request_user_id()
    role = get_request_role()
    if not user_id or not role:
        return None
    user = User.query.get(user_id)
    if not user:
        return None
    if (user.role or "").lower() != role:
        return None
    return user


def require_auth(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Authentication required"}), 401
        g.current_user = user
        return fn(*args, **kwargs)

    return wrapped


def require_roles(*allowed_roles):
    normalized_roles = {role.strip().lower() for role in allowed_roles if role}
    expected = ", ".join(sorted(normalized_roles))

    def decorator(fn):
        @wraps(fn)
        def wrapped(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({"error": "Authentication required"}), 401
            role = (user.role or "").lower()
            if role not in normalized_roles:
                return jsonify({"error": f"Forbidden: {expected} role required"}), 403
            g.current_user = user
            return fn(*args, **kwargs)

        return wrapped

    return decorator
