import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import MetaData, Table, create_engine, text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from db_config import normalize_database_url


TARGET_SCHEMA = "public"
TABLE_ORDER = [
    "disaster",
    "user",
    "resource",
    "volunteer",
    "volunteer_assignment",
    "disaster_progress_update",
    "activity_log",
    "resource_allocation",
]


def default_source_path():
    return Path(__file__).resolve().parents[1] / "instance" / "disaster.db"


def parse_args():
    parser = argparse.ArgumentParser(
        description="Copy the local SQLite data set into a PostgreSQL database."
    )
    parser.add_argument(
        "--source",
        default=str(default_source_path()),
        help="Path to the SQLite database file to migrate.",
    )
    parser.add_argument(
        "--database-url",
        default=None,
        help="Target PostgreSQL database URL. Defaults to DATABASE_URL from backend/.env.",
    )
    parser.add_argument(
        "--truncate",
        action="store_true",
        help="Clear the target tables before importing data.",
    )
    return parser.parse_args()


def quoted_table_list():
    return ", ".join(f'{TARGET_SCHEMA}."{table_name}"' for table_name in TABLE_ORDER)


def fetch_source_counts(connection):
    counts = {}
    for table_name in TABLE_ORDER:
        counts[table_name] = connection.execute(
            text(f'SELECT COUNT(*) FROM "{table_name}"')
        ).scalar_one()
    return counts


def fetch_target_counts(connection):
    counts = {}
    for table_name in TABLE_ORDER:
        counts[table_name] = connection.execute(
            text(f'SELECT COUNT(*) FROM {TARGET_SCHEMA}."{table_name}"')
        ).scalar_one()
    return counts


def reset_sequences(connection):
    for table_name in TABLE_ORDER:
        connection.execute(
            text(
                f"""
                SELECT setval(
                    pg_get_serial_sequence('{TARGET_SCHEMA}.{table_name}', 'id'),
                    COALESCE((SELECT MAX(id) FROM {TARGET_SCHEMA}."{table_name}"), 1),
                    COALESCE((SELECT MAX(id) FROM {TARGET_SCHEMA}."{table_name}"), 0) > 0
                )
                """
            )
        )


def main():
    project_root = Path(__file__).resolve().parents[1]
    load_dotenv(project_root / ".env")
    args = parse_args()

    source_path = Path(args.source).resolve()
    if not source_path.exists():
        raise FileNotFoundError(f"SQLite source database not found: {source_path}")

    database_url = normalize_database_url(args.database_url or os.getenv("DATABASE_URL"))
    source_engine = create_engine(f"sqlite:///{source_path}")
    target_engine = create_engine(database_url)

    target_metadata = MetaData()
    target_tables = {}
    for table_name in TABLE_ORDER:
        try:
            target_tables[table_name] = Table(
                table_name,
                target_metadata,
                schema=TARGET_SCHEMA,
                autoload_with=target_engine,
            )
        except Exception:
            target_tables[table_name] = None

    missing_tables = [table_name for table_name, table in target_tables.items() if table is None]
    if missing_tables:
        missing = ", ".join(missing_tables)
        raise RuntimeError(
            f"Target database is missing required tables: {missing}. "
            "Run `flask db upgrade` first."
        )

    with source_engine.connect() as source_connection:
        source_counts = fetch_source_counts(source_connection)
        print("Source row counts:")
        for table_name in TABLE_ORDER:
            print(f"  {table_name}: {source_counts[table_name]}")

        with target_engine.begin() as target_connection:
            target_counts = fetch_target_counts(target_connection)
            if args.truncate:
                target_connection.execute(
                    text(f"TRUNCATE TABLE {quoted_table_list()} RESTART IDENTITY CASCADE")
                )
            elif any(target_counts.values()):
                populated = ", ".join(
                    f"{table_name}={count}"
                    for table_name, count in target_counts.items()
                    if count
                )
                raise RuntimeError(
                    "Target database already contains data. "
                    f"Use --truncate to replace it. Current rows: {populated}"
                )

            for table_name in TABLE_ORDER:
                rows = list(
                    source_connection.execute(
                        text(f'SELECT * FROM "{table_name}" ORDER BY id')
                    ).mappings()
                )
                if not rows:
                    continue
                target_connection.execute(target_tables[table_name].insert(), rows)
                print(f"Imported {len(rows)} rows into {table_name}")

            reset_sequences(target_connection)
            final_counts = fetch_target_counts(target_connection)

    print("Target row counts:")
    for table_name in TABLE_ORDER:
        print(f"  {table_name}: {final_counts[table_name]}")

    mismatches = [
        table_name
        for table_name in TABLE_ORDER
        if source_counts[table_name] != final_counts[table_name]
    ]
    if mismatches:
        mismatch_text = ", ".join(mismatches)
        raise RuntimeError(f"Row-count mismatch detected for: {mismatch_text}")

    print("SQLite data copied successfully into PostgreSQL.")


if __name__ == "__main__":
    main()
