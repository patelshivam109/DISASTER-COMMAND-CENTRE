"""add disaster coordinates

Revision ID: 6f3a1f0d9c2e
Revises: e41111bb8eb8
Create Date: 2026-03-31 12:05:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "6f3a1f0d9c2e"
down_revision = "e41111bb8eb8"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("disaster", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("disaster", sa.Column("longitude", sa.Float(), nullable=True))


def downgrade():
    op.drop_column("disaster", "longitude")
    op.drop_column("disaster", "latitude")
