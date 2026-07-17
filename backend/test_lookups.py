from app.api.v1.products import ensure_product_tables_and_lookups
from app.models.product import Brand, Category, ProductModel


def test_ensure_product_tables_and_lookups_keeps_shared_lookup_tables_available(db_session):
    ensure_product_tables_and_lookups(db_session)

    brand = Brand(name="Brother")
    model = ProductModel(name="HL-L2350DW")
    category = Category(name="Printer")
    db_session.add_all([brand, model, category])
    db_session.commit()

    assert db_session.query(Brand).count() == 1
    assert db_session.query(ProductModel).count() == 1
    assert db_session.query(Category).count() == 1
    assert db_session.query(Brand).first().name == "Brother"
