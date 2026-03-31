import os
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

SUPABASE_DIRECT_HOST = "db.xjmiviwnajwarhflmpch.supabase.co"
SUPABASE_POOLER_HOST = "aws-1-ap-northeast-1.pooler.supabase.com"
SUPABASE_DIRECT_USER = "postgres"
SUPABASE_POOLER_USER = "postgres.xjmiviwnajwarhflmpch"


def normalize_database_url(database_url):
    value = (database_url or "").strip()
    if not value:
        raise RuntimeError("DATABASE_URL is not set. Add it to your .env file.")

    if value.startswith("postgres://"):
        value = value.replace("postgres://", "postgresql://", 1)

    parts = urlsplit(value)
    if parts.scheme.startswith("postgresql"):
        netloc = parts.netloc
        if parts.hostname == SUPABASE_DIRECT_HOST and parts.username == SUPABASE_DIRECT_USER:
            password = parts.password or ""
            auth = SUPABASE_POOLER_USER
            if password:
                auth = f"{auth}:{password}"
            if parts.port:
                netloc = f"{auth}@{SUPABASE_POOLER_HOST}:{parts.port}"
            else:
                netloc = f"{auth}@{SUPABASE_POOLER_HOST}"

        query = dict(parse_qsl(parts.query, keep_blank_values=True))
        query.setdefault("sslmode", "require")
        value = urlunsplit(
            (
                parts.scheme,
                netloc,
                parts.path,
                urlencode(query),
                parts.fragment,
            )
        )

    return value


def get_database_url(env_var="DATABASE_URL"):
    return normalize_database_url(os.getenv(env_var))
