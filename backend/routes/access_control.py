from functools import wraps

from flask import jsonify, request


def get_request_role():
    return (request.headers.get("X-Role") or "").strip().lower()


def require_roles(*allowed_roles):
    normalized_roles = {role.strip().lower() for role in allowed_roles if role}
    expected = ", ".join(sorted(normalized_roles))

    def decorator(fn):
        @wraps(fn)
        def wrapped(*args, **kwargs):
            role = get_request_role()
            if role not in normalized_roles:
                return jsonify({"error": f"Forbidden: {expected} role required"}), 403
            return fn(*args, **kwargs)

        return wrapped

    return decorator

