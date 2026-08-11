"""Product inventory endpoints."""

from typing import List, Optional

import io
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, status, File, UploadFile
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.product import Brand, Category, Product
from app.models.user import User, UserRole
from app.schemas.product import (
    ProductCreate,
    ProductLookupCreate,
    ProductLookupBulkCreate,
    ProductLookupResponse,
    ProductResponse,
    ProductUpdate,
)

router = APIRouter()


def ensure_product_tables_and_lookups(db: Session) -> None:
    """Ensure product and shared lookup tables exist."""
    bind = db.get_bind()
    for table in (Brand.__table__, Category.__table__, Product.__table__):
        table.create(bind=bind, checkfirst=True)


def build_product_response(product: Product) -> dict:
    """Build product response with resolved lookup names."""
    return {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "brand_id": product.brand_id,
        "brand_name": product.brand_ref.name if product.brand_ref else None,
        "category_id": product.category_id,
        "category_name": product.category_ref.name if product.category_ref else None,
        "unit_price": float(product.unit_price),
        "quantity_in_stock": product.quantity_in_stock,
        "created_at": product.created_at,
    }


def validate_lookup_ids(
    db: Session,
    brand_id: Optional[int],
    category_id: Optional[int],
) -> None:
    """Validate referenced lookup rows before saving products."""
    if brand_id is not None and not db.query(Brand).filter(Brand.id == brand_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
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


@router.post("/brands/bulk", response_model=dict, status_code=status.HTTP_201_CREATED)
async def bulk_create_brands(
    data: ProductLookupBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.FRONT_DESK])),
):
    ensure_product_tables_and_lookups(db)
    added = 0
    for name in data.names:
        clean_name = name.strip()
        if not clean_name:
            continue
        existing = db.query(Brand).filter(Brand.name == clean_name).first()
        if not existing:
            brand = Brand(name=clean_name)
            db.add(brand)
            added += 1
    db.commit()
    return {"message": f"Successfully added {added} brands"}


@router.delete("/brands/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brand(
    brand_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    ensure_product_tables_and_lookups(db)
    existing = db.query(Brand).filter(Brand.id == brand_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    if existing.products or existing.parts:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete brand because it is used by existing products or parts."
        )
        
    db.delete(existing)
    db.commit()
    return None



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


@router.post("/categories/bulk", response_model=dict, status_code=status.HTTP_201_CREATED)
async def bulk_create_categories(
    data: ProductLookupBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.FRONT_DESK])),
):
    ensure_product_tables_and_lookups(db)
    added = 0
    for name in data.names:
        clean_name = name.strip()
        if not clean_name:
            continue
        existing = db.query(Category).filter(Category.name == clean_name).first()
        if not existing:
            category = Category(name=clean_name)
            db.add(category)
            added += 1
    db.commit()
    return {"message": f"Successfully added {added} categories"}


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    ensure_product_tables_and_lookups(db)
    existing = db.query(Category).filter(Category.id == category_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if existing.products or existing.parts:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete category because it is used by existing products or parts."
        )
        
    db.delete(existing)
    db.commit()
    return None


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    ensure_product_tables_and_lookups(db)
    validate_lookup_ids(db, product_data.brand_id, product_data.category_id)

    new_product = Product(**product_data.model_dump())
    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    product = db.query(Product).options(
        joinedload(Product.brand_ref),
        joinedload(Product.category_ref),
    ).filter(Product.id == new_product.id).first()

    return build_product_response(product)


@router.get("", response_model=List[ProductResponse])
async def list_products(
    brand_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    category: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=10000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_product_tables_and_lookups(db)
    query = db.query(Product).options(
        joinedload(Product.brand_ref),
        joinedload(Product.category_ref),
    )

    effective_category_id = category_id if category_id is not None else category

    if brand_id is not None:
        query = query.filter(Product.brand_id == brand_id)
    if effective_category_id is not None:
        query = query.filter(Product.category_id == effective_category_id)

    products = query.order_by(Product.created_at.desc()).offset(skip).limit(limit).all()
    return [build_product_response(product) for product in products]


@router.post("/bulk-upload", status_code=status.HTTP_200_OK)
async def bulk_upload_products(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.STOREKEEPER])),
):
    ensure_product_tables_and_lookups(db)
    
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload an Excel or CSV file.")
    
    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
            
        # Clean up dataframe
        df = df.fillna('')
        
        # Expected columns mapping
        # Name | Description | Brand | Category | Unit Price | Stock
        col_mapping = {
            'name': 'name',
            'description': 'description',
            'brand': 'brand',
            'category': 'category',
            'unit price': 'unit_price',
            'stock': 'quantity_in_stock'
        }
        
        # Lowercase column names to make mapping easier
        df.columns = [str(c).strip().lower() for c in df.columns]
        
        success_count = 0
        
        for _, row in df.iterrows():
            name = str(row.get('name', '')).strip()
            if not name:
                continue
                
            brand_name = str(row.get('brand', '')).strip()
            category_name = str(row.get('category', '')).strip()
            
            # Resolve or create brand
            brand_id = None
            if brand_name:
                brand = db.query(Brand).filter(Brand.name.ilike(brand_name)).first()
                if not brand:
                    brand = Brand(name=brand_name)
                    db.add(brand)
                    db.commit()
                    db.refresh(brand)
                brand_id = brand.id
                
            # Resolve or create category
            category_id = None
            if category_name:
                category = db.query(Category).filter(Category.name.ilike(category_name)).first()
                if not category:
                    category = Category(name=category_name)
                    db.add(category)
                    db.commit()
                    db.refresh(category)
                category_id = category.id
                
            try:
                unit_price = float(row.get('unit_price', 0) or 0)
            except ValueError:
                unit_price = 0.0
                
            try:
                stock = int(row.get('quantity_in_stock', 0) or 0)
            except ValueError:
                stock = 0
                
            description = str(row.get('description', '')).strip()
            
            # Check if product exists
            existing_product = db.query(Product).filter(Product.name.ilike(name)).first()
            if existing_product:
                # Update existing
                existing_product.quantity_in_stock += stock
                existing_product.unit_price = unit_price
                existing_product.description = description or existing_product.description
                if brand_id: existing_product.brand_id = brand_id
                if category_id: existing_product.category_id = category_id
            else:
                # Create new
                product = Product(
                    name=name,
                    description=description,
                    brand_id=brand_id,
                    category_id=category_id,
                    unit_price=unit_price,
                )
                db.add(product)
                
            db.commit()
            success_count += 1
            
        return {"message": f"Successfully processed {success_count} products."}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_product_tables_and_lookups(db)
    product = db.query(Product).options(
        joinedload(Product.brand_ref),
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

