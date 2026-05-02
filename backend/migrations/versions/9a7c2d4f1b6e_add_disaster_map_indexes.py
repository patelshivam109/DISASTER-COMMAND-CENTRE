"""add disaster map indexes

Revision ID: 9a7c2d4f1b6e
Revises: 6f3a1f0d9c2e
Create Date: 2026-05-02 00:00:00.000000

"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "9a7c2d4f1b6e"
down_revision = "6f3a1f0d9c2e"
branch_labels = None
depends_on = None


def upgrade():
    op.create_index("ix_disaster_status", "disaster", ["status"])
    op.create_index("ix_disaster_severity", "disaster", ["severity"])
    op.create_index("ix_disaster_status_severity", "disaster", ["status", "severity"])
    op.create_index("ix_disaster_coordinates", "disaster", ["latitude", "longitude"])


def downgrade():
    op.drop_index("ix_disaster_coordinates", table_name="disaster")
    op.drop_index("ix_disaster_status_severity", table_name="disaster")
    op.drop_index("ix_disaster_severity", table_name="disaster")
    op.drop_index("ix_disaster_status", table_name="disaster")
