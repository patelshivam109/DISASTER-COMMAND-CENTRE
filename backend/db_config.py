import os
import socket
import warnings
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


def _truthy(value):
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def _default_sqlite_url():
    base_dir = os.path.abspath(os.path.dirname(__file__))
    db_path = os.path.join(base_dir, "instance", "disaster.db")
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    normalized = db_path.replace("\\", "/")
    return f"sqlite:///{normalized}"


def _can_resolve_hostname(hostname):
    if not hostname:
        return False
    try:
        socket.getaddrinfo(hostname, None)
        return True
    except socket.gaierror:
        return False


def _allow_sqlite_fallback():
    # Enabled by default for local/dev runs; disabled by default in production.
    explicit = os.getenv("ALLOW_SQLITE_FALLBACK")
    if explicit is not None:
        return _truthy(explicit)
    return (os.getenv("FLASK_ENV") or "").strip().lower() != "production"


def normalize_database_url(database_url):
    value = (database_url or "").strip()
    if not value:
        raise RuntimeError("DATABASE_URL is not set. Add it to your .env file.")

    if value.startswith("postgres://"):
        value = value.replace("postgres://", "postgresql://", 1)

    parts = urlsplit(value)
    if parts.scheme.startswith("postgresql"):
        query = dict(parse_qsl(parts.query, keep_blank_values=True))
        query.setdefault("sslmode", "require")
        value = urlunsplit(
            (
                parts.scheme,
                parts.netloc,
                parts.path,
                urlencode(query),
                parts.fragment,
            )
        )

    if value.startswith("sqlite:///"):
        raw_path = value[len("sqlite:///") :]
        if not os.path.isabs(raw_path):
            raw_path = os.path.abspath(os.path.join(os.path.dirname(__file__), raw_path))
        os.makedirs(os.path.dirname(raw_path), exist_ok=True)
        normalized = raw_path.replace("\\", "/")
        value = f"sqlite:///{normalized}"

    return value


def get_database_url(env_var="DATABASE_URL"):
    raw_value = os.getenv(env_var)
    if not raw_value:
        if _allow_sqlite_fallback():
            fallback = os.getenv("SQLITE_DATABASE_URL") or _default_sqlite_url()
            warnings.warn(
                "DATABASE_URL is not set; using local sqlite fallback for development.",
                RuntimeWarning,
                stacklevel=2,
            )
            return fallback
        raise RuntimeError("DATABASE_URL is not set. Add it to your .env file.")

    primary_url = normalize_database_url(raw_value)
    parts = urlsplit(primary_url)

    if parts.scheme.startswith("postgresql") and not _can_resolve_hostname(parts.hostname):
        if _allow_sqlite_fallback():
            return os.getenv("SQLITE_DATABASE_URL") or _default_sqlite_url()
        warnings.warn(
            "DATABASE_URL host DNS pre-check failed. Continuing with configured PostgreSQL URL. "
            "If runtime queries fail, replace DATABASE_URL with Supabase session pooler URL.",
            RuntimeWarning,
            stacklevel=2,
        )

    return primary_url
