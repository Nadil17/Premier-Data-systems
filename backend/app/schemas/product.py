"""Product inventory schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ProductLookupBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class ProductLookupCreate(ProductLookupBase):
    pass


class ProductLookupBulkCreate(BaseModel):
    names: list[str] = Field(..., min_length=1)


class ProductLookupResponse(ProductLookupBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    brand_id: Optional[int] = None
    category_id: Optional[int] = None
    unit_price: float = Field(0.0, ge=0)
    quantity_in_stock: int = Field(0, ge=0)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    brand_id: Optional[int] = None
    category_id: Optional[int] = None
    unit_price: Optional[float] = Field(None, ge=0)
    quantity_in_stock: Optional[int] = Field(None, ge=0)


class ProductResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    brand_id: Optional[int] = None
    brand_name: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    unit_price: float
    quantity_in_stock: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
