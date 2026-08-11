"""Product inventory models for finished goods sales."""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Brand(Base):
    """Generic product brand lookup table."""

    __tablename__ = "brands"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    products = relationship("Product", back_populates="brand_ref")
    parts = relationship("Part", back_populates="brand_ref")

    def __repr__(self):
        return f"<Brand {self.name}>"
class Category(Base):
    """Generic product category lookup table."""

    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    products = relationship("Product", back_populates="category_ref")
    parts = relationship("Part", back_populates="category_ref")

    def __repr__(self):
        return f"<Category {self.name}>"


class Product(Base):
    """Finished goods inventory table for products sold by the business."""

    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    brand_id = Column(Integer, ForeignKey("brands.id", ondelete="RESTRICT"), index=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="RESTRICT"), index=True)
    unit_price = Column(Numeric(10, 2), nullable=False, default=0.00)
    quantity_in_stock = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    brand_ref = relationship("Brand", back_populates="products")
    category_ref = relationship("Category", back_populates="products")

    def __repr__(self):
        return f"<Product {self.name}>"
