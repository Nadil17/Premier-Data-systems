"""
Create product inventory lookup tables and products table if they do not exist.

This is useful for upgrading an existing database without running the full app.
"""

from app.core.database import engine
from app.models.product import Brand, ProductModel, Category, Product


def create_tables():
    tables = [
        Brand.__table__,
        ProductModel.__table__,
        Category.__table__,
        Product.__table__,
    ]

    with engine.begin() as connection:
        for table in tables:
            table.create(bind=connection, checkfirst=True)
            print(f"Verified table: {table.name}")


if __name__ == "__main__":
    create_tables()
