"""
Database initialization script
Run this to create initial admin user and sample data
"""

import app.models  # Ensure all models are registered before create_all
from app.core.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.customer import Customer, CustomerCategory
from app.models.parts import Part
from app.models.product import Brand, Category
from app.core.security import get_password_hash
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_or_create_lookup(db, model, name: str):
    lookup = db.query(model).filter(model.name == name).first()
    if lookup:
        return lookup

    lookup = model(name=name)
    db.add(lookup)
    db.flush()
    return lookup


def init_db():
    """Initialize database with tables and initial data"""
    
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")
    
    db = SessionLocal()
    
    try:
        # Check if admin user already exists
        admin_exists = db.query(User).filter(User.username == "admin").first()
        
        if not admin_exists:
            logger.info("Creating initial users...")
            
            # Create admin user
            admin = User(
                username="admin",
                email="admin@repaircenter.com",
                hashed_password=get_password_hash("admin123"),
                full_name="System Administrator",
                phone="+1234567890",
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            
            # Create manager user
            manager = User(
                username="manager",
                email="manager@repaircenter.com",
                hashed_password=get_password_hash("manager123"),
                full_name="Repair Manager",
                phone="+1234567891",
                role=UserRole.MANAGER,
                is_active=True
            )
            db.add(manager)
            
            # Create front desk user
            frontdesk = User(
                username="frontdesk",
                email="frontdesk@repaircenter.com",
                hashed_password=get_password_hash("frontdesk123"),
                full_name="Front Desk Staff",
                phone="+1234567892",
                role=UserRole.FRONT_DESK,
                is_active=True
            )
            db.add(frontdesk)
            
            # Create engineer user
            engineer = User(
                username="engineer1",
                email="engineer1@repaircenter.com",
                hashed_password=get_password_hash("engineer123"),
                full_name="John Engineer",
                phone="+1234567893",
                role=UserRole.ENGINEER,
                is_active=True
            )
            db.add(engineer)
            
            # Create storekeeper user
            storekeeper = User(
                username="storekeeper",
                email="storekeeper@repaircenter.com",
                hashed_password=get_password_hash("store123"),
                full_name="Store Keeper",
                phone="+1234567894",
                role=UserRole.STOREKEEPER,
                is_active=True
            )
            db.add(storekeeper)
            
            # Create accountant user
            accountant = User(
                username="accountant",
                email="accountant@repaircenter.com",
                hashed_password=get_password_hash("account123"),
                full_name="Account Manager",
                phone="+1234567895",
                role=UserRole.ACCOUNTANT,
                is_active=True
            )
            db.add(accountant)
            
            db.commit()
            logger.info("Initial users created successfully")
            
            # Create sample parts and lookup data
            logger.info("Creating sample lookups and parts...")

            generic_brand = get_or_create_lookup(db, Brand, "Generic")
            hp_brand = get_or_create_lookup(db, Brand, "HP")
            hardware_category = get_or_create_lookup(db, Category, "Hardware")
            consumable_category = get_or_create_lookup(db, Category, "Consumable")
            accessory_category = get_or_create_lookup(db, Category, "Accessory")

            sample_parts = [
                {
                    "part_number": "HD-SSD-256",
                    "name": "256GB SSD",
                    "description": "SATA 2.5-inch SSD 256GB",
                    "brand_id": generic_brand.id,
                    "category_id": hardware_category.id,
                    "quantity_in_stock": 10,
                    "minimum_stock_level": 5,
                    "unit_price": 45.00,
                },
                {
                    "part_number": "RAM-DDR4-8GB",
                    "name": "8GB DDR4 RAM",
                    "description": "8GB DDR4 2666MHz RAM",
                    "brand_id": generic_brand.id,
                    "category_id": hardware_category.id,
                    "quantity_in_stock": 15,
                    "minimum_stock_level": 8,
                    "unit_price": 35.00,
                },
                {
                    "part_number": "TONER-HP-85A",
                    "name": "HP 85A Toner Cartridge",
                    "description": "Original Black Toner Cartridge for HP LaserJet",
                    "brand_id": hp_brand.id,
                    "category_id": consumable_category.id,
                    "quantity_in_stock": 20,
                    "minimum_stock_level": 10,
                    "unit_price": 25.00,
                },
                {
                    "part_number": "LCD-15.6-FHD",
                    "name": "15.6\" FHD LCD Screen",
                    "description": "Replacement battery for HP EliteBook 840 G5",
                    "brand_id": hp_brand.id,
                    "category_id": hardware_category.id,
                    "quantity_in_stock": 5,
                    "minimum_stock_level": 3,
                    "unit_price": 85.00,
                },
                {
                    "part_number": "PWR-ADAPTER-65W",
                    "name": "65W Power Adapter",
                    "description": "Universal laptop charger",
                    "brand_id": generic_brand.id,
                    "category_id": accessory_category.id,
                    "quantity_in_stock": 12,
                    "minimum_stock_level": 6,
                    "unit_price": 20.00,
                },
            ]

            for part_data in sample_parts:
                exists = db.query(Part).filter(Part.part_number == part_data["part_number"]).first()
                if not exists:
                    db.add(Part(**part_data))

            db.commit()
            logger.info("Sample parts created successfully")
            
        else:
            logger.info("Database already initialized with users")
        
        logger.info("\n" + "="*50)
        logger.info("DATABASE INITIALIZATION COMPLETE")
        logger.info("="*50)
        logger.info("\nDefault user credentials:")
        logger.info("-" * 50)
        logger.info("Admin      - username: admin       password: admin123")
        logger.info("Manager    - username: manager     password: manager123")
        logger.info("Front Desk - username: frontdesk   password: frontdesk123")
        logger.info("Engineer   - username: engineer1   password: engineer123")
        logger.info("Storekeeper- username: storekeeper password: store123")
        logger.info("Accountant - username: accountant  password: account123")
        logger.info("-" * 50)
        logger.info("\nAPI Documentation available at: http://localhost:8000/api/docs")
        logger.info("="*50 + "\n")
        
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
