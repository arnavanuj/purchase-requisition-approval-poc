import os

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5432/purchase_requisition_db",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_database_schema():
    inspector = inspect(engine)
    if "purchase_requisitions" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("purchase_requisitions")}
    with engine.begin() as connection:
        if "supplier_name" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE purchase_requisitions "
                    "ADD COLUMN supplier_name VARCHAR(255) NOT NULL DEFAULT 'Unknown Supplier'"
                )
            )
        connection.execute(
            text(
                "UPDATE purchase_requisitions SET supplier_name = 'Unknown Supplier' "
                "WHERE supplier_name IS NULL OR TRIM(supplier_name) = ''"
            )
        )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
