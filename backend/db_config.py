import os
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


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

    return value


def get_database_url(env_var="DATABASE_URL"):
    return normalize_database_url(os.getenv(env_var))
