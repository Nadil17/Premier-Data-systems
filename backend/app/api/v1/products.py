"""Product inventory endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.product import Brand, Category, Product, ProductModel
from app.models.user import User, UserRole
from app.schemas.product import (
    ProductCreate,
    ProductLookupCreate,
    ProductLookupResponse,
    ProductResponse,
    ProductUpdate,
)

router = APIRouter()


def ensure_product_tables_and_lookups(db: Session) -> None:
    """Ensure product and shared lookup tables exist."""
    bind = db.get_bind()
    for table in (Brand.__table__, ProductModel.__table__, Category.__table__, Product.__table__):
        table.create(bind=bind, checkfirst=True)


def build_product_response(product: Product) -> dict:
    """Build product response with resolved lookup names."""
    return {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "brand_id": product.brand_id,
        "brand_name": product.brand_ref.name if product.brand_ref else None,
        "model_id": product.model_id,
        "model_name": product.model_ref.name if product.model_ref else None,
        "category_id": product.category_id,
        "category_name": product.category_ref.name if product.category_ref else None,
        "unit_price": float(product.unit_price),
        "quantity_in_stock": product.quantity_in_stock,
        "created_at": product.created_at,
    }


def validate_lookup_ids(
    db: Session,
    brand_id: Optional[int],
    model_id: Optional[int],
    category_id: Optional[int],
) -> None:
    """Validate referenced lookup rows before saving products."""
    if brand_id is not None and not db.query(Brand).filter(Brand.id == brand_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    if model_id is not None and not db.query(ProductModel).filter(ProductModel.id == model_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    if category_id is not None and not db.query(Category).filter(Category.id == category_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")


@router.get("/brands", response_model=List[ProductLookupResponse])
async def list_brands(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_product_tables_and_lookups(db)
    return db.query(Brand).order_by(Brand.name).all()


@router.post("/brands", response_model=ProductLookupResponse, status_code=status.HTTP_201_CREATED)
async def create_brand(
    data: ProductLookupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.FRONT_DESK])),
):
    ensure_product_tables_and_lookups(db)
    existing = db.query(Brand).filter(Brand.name == data.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Brand already exists")

    brand = Brand(name=data.name.strip())
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand


@router.get("/models", response_model=List[ProductLookupResponse])
async def list_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_product_tables_and_lookups(db)
    return db.query(ProductModel).order_by(ProductModel.name).all()


@router.post("/models", response_model=ProductLookupResponse, status_code=status.HTTP_201_CREATED)
async def create_model(
    data: ProductLookupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.FRONT_DESK])),
):
    ensure_product_tables_and_lookups(db)
    existing = db.query(ProductModel).filter(ProductModel.name == data.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Model already exists")

    model = ProductModel(name=data.name.strip())
    db.add(model)
    db.commit()
    db.refresh(model)
    return model


@router.get("/categories", response_model=List[ProductLookupResponse])
async def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_product_tables_and_lookups(db)
    return db.query(Category).order_by(Category.name).all()


@router.post("/categories", response_model=ProductLookupResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: ProductLookupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.FRONT_DESK])),
):
    ensure_product_tables_and_lookups(db)
    existing = db.query(Category).filter(Category.name == data.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category already exists")

    category = Category(name=data.name.strip())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    ensure_product_tables_and_lookups(db)
    validate_lookup_ids(db, product_data.brand_id, product_data.model_id, product_data.category_id)

    new_product = Product(**product_data.model_dump())
    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    product = db.query(Product).options(
        joinedload(Product.brand_ref),
        joinedload(Product.model_ref),
        joinedload(Product.category_ref),
    ).filter(Product.id == new_product.id).first()

    return build_product_response(product)


@router.get("", response_model=List[ProductResponse])
async def list_products(
    brand_id: Optional[int] = Query(None),
    model_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    category: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_product_tables_and_lookups(db)
    query = db.query(Product).options(
        joinedload(Product.brand_ref),
        joinedload(Product.model_ref),
        joinedload(Product.category_ref),
    )

    effective_category_id = category_id if category_id is not None else category

    if brand_id is not None:
        query = query.filter(Product.brand_id == brand_id)
    if model_id is not None:
        query = query.filter(Product.model_id == model_id)
    if effective_category_id is not None:
        query = query.filter(Product.category_id == effective_category_id)

    products = query.order_by(Product.created_at.desc()).offset(skip).limit(limit).all()
    return [build_product_response(product) for product in products]


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_product_tables_and_lookups(db)
    product = db.query(Product).options(
        joinedload(Product.brand_ref),
        joinedload(Product.model_ref),
        joinedload(Product.category_ref),
    ).filter(Product.id == product_id).first()

    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    return build_product_response(product)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    ensure_product_tables_and_lookups(db)
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    update_data = product_data.model_dump(exclude_unset=True)
    validate_lookup_ids(
        db,
        update_data.get("brand_id"),
        update_data.get("model_id"),
        update_data.get("category_id"),
    )

    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()

    product = db.query(Product).options(
        joinedload(Product.brand_ref),
        joinedload(Product.model_ref),
        joinedload(Product.category_ref),
    ).filter(Product.id == product_id).first()

    return build_product_response(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    ensure_product_tables_and_lookups(db)
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    db.delete(product)
    db.commit()
    return None
