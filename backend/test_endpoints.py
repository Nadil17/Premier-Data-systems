from app.models.customer import Customer
from app.models.parts import Part
from app.models.product import Brand, Category, Product, ProductModel
from app.models.user import UserRole


def test_products_brands_endpoint_returns_seeded_lookup_data(
    client, db_session, create_user, auth_headers
):
    user = create_user("admin_user", UserRole.ADMIN)
    db_session.add(Brand(name="HP"))
    db_session.commit()

    response = client.get("/api/v1/products/brands", headers=auth_headers(user))

    assert response.status_code == 200
    assert any(item["name"] == "HP" for item in response.json())


def test_products_endpoint_filters_by_lookup_ids_for_machine_model_dropdown(
    client, db_session, create_user, auth_headers
):
    user = create_user("frontdesk_product_user", UserRole.FRONT_DESK)
    brand = Brand(name="Brother")
    other_brand = Brand(name="Ricoh")
    model = ProductModel(name="HL")
    other_model = ProductModel(name="MP")
    category = Category(name="Laser Printer")
    other_category = Category(name="Photocopier")
    db_session.add_all([brand, other_brand, model, other_model, category, other_category])
    db_session.commit()
    db_session.refresh(brand)
    db_session.refresh(other_brand)
    db_session.refresh(model)
    db_session.refresh(other_model)
    db_session.refresh(category)
    db_session.refresh(other_category)

    matching_product = Product(
        name="Brother HL-L5100DN",
        brand_id=brand.id,
        model_id=model.id,
        category_id=category.id,
        unit_price=125000,
        quantity_in_stock=2,
    )
    non_matching_product = Product(
        name="Ricoh MP 2014",
        brand_id=other_brand.id,
        model_id=other_model.id,
        category_id=other_category.id,
        unit_price=210000,
        quantity_in_stock=1,
    )
    db_session.add_all([matching_product, non_matching_product])
    db_session.commit()

    response = client.get(
        f"/api/v1/products?brand_id={brand.id}&model_id={model.id}&category_id={category.id}",
        headers=auth_headers(user),
    )

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["name"] == "Brother HL-L5100DN"
    assert payload[0]["brand_id"] == brand.id
    assert payload[0]["model_id"] == model.id
    assert payload[0]["category_id"] == category.id


def test_create_job_with_product_lookup_ids_and_fetch_customer_history(
    client, db_session, create_user, auth_headers
):
    user = create_user("frontdesk_user", UserRole.FRONT_DESK)
    brand = Brand(name="Canon")
    model = ProductModel(name="iR 2206")
    category = Category(name="Printer")
    db_session.add_all([brand, model, category])
    db_session.commit()
    db_session.refresh(brand)
    db_session.refresh(model)
    db_session.refresh(category)

    customer_response = client.post(
        "/api/v1/customers",
        headers=auth_headers(user),
        json={
            "name": "Acme Customer",
            "phone_1": "+94112223344",
            "category": "company",
            "company_name": "Acme Ltd",
        },
    )
    assert customer_response.status_code == 201
    customer_id = customer_response.json()["id"]

    job_response = client.post(
        "/api/v1/jobs",
        headers=auth_headers(user),
        json={
            "customer_id": customer_id,
            "reported_by": "Acme Reception",
            "brand_id": brand.id,
            "model_id": model.id,
            "machine_category_id": category.id,
            "machine_model": "Canon iR 2206",
            "serial_number": "SER-001",
            "fault_description": "Paper jam",
            "job_type": "in_house",
            "job_category": "chargeable",
            "items": [],
        },
    )

    assert job_response.status_code == 201
    created_job = job_response.json()
    assert created_job["brand_id"] == brand.id
    assert created_job["model_id"] == model.id
    assert created_job["machine_category_id"] == category.id
    assert created_job["customer_name"] == "Acme Customer"
    assert created_job["customer_phone"] == "+94112223344"

    job_detail = client.get(
        f"/api/v1/jobs/{created_job['id']}",
        headers=auth_headers(user),
    )

    assert job_detail.status_code == 200
    job_payload = job_detail.json()
    assert job_payload["customer_name"] == "Acme Customer"
    assert job_payload["customer_phone"] == "+94112223344"

    customer_detail = client.get(
        f"/api/v1/customers/{customer_id}",
        headers=auth_headers(user),
    )

    assert customer_detail.status_code == 200
    payload = customer_detail.json()
    assert payload["total_jobs"] == 1
    assert len(payload["jobs"]) == 1
    assert payload["jobs"][0]["job_number"] == created_job["job_number"]


def test_jobs_endpoint_returns_paginated_payload(client, db_session, create_user, auth_headers):
    user = create_user("manager_user", UserRole.MANAGER)
    customer = Customer(
        customer_id="CUS-TEST-0001",
        name="List Customer",
        phone_1="+94110000000",
        category="individual",
    )
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)

    response = client.post(
        "/api/v1/jobs",
        headers=auth_headers(user),
        json={
            "customer_id": customer.id,
            "reported_by": "List Customer",
            "machine_model": "HP Laptop",
            "fault_description": "No power",
            "job_type": "in_house",
            "job_category": "chargeable",
            "items": [],
        },
    )
    assert response.status_code == 201

    jobs_response = client.get("/api/v1/jobs?status=unassigned", headers=auth_headers(user))

    assert jobs_response.status_code == 200
    payload = jobs_response.json()
    assert set(payload.keys()) == {"items", "total", "skip", "limit"}
    assert payload["total"] == 1
    assert len(payload["items"]) == 1


def test_parts_endpoints_use_shared_lookup_tables(client, db_session, create_user, auth_headers):
    user = create_user("storekeeper_user", UserRole.STOREKEEPER)
    brand = Brand(name="Epson")
    model = ProductModel(name="L3210")
    category = Category(name="Inkjet")
    db_session.add_all([brand, model, category])
    db_session.commit()
    db_session.refresh(brand)
    db_session.refresh(model)
    db_session.refresh(category)

    brands_response = client.get("/api/v1/parts/brands", headers=auth_headers(user))
    models_response = client.get("/api/v1/parts/models", headers=auth_headers(user))
    categories_response = client.get("/api/v1/parts/categories", headers=auth_headers(user))

    assert brands_response.status_code == 200
    assert models_response.status_code == 200
    assert categories_response.status_code == 200
    assert any(item["name"] == "Epson" for item in brands_response.json())
    assert any(item["name"] == "L3210" for item in models_response.json())
    assert any(item["name"] == "Inkjet" for item in categories_response.json())

    create_part_response = client.post(
        "/api/v1/parts/inventory",
        headers=auth_headers(user),
        json={
            "part_number": "EP-HEAD-001",
            "name": "Print Head",
            "description": "Shared lookup test part",
            "brand_id": brand.id,
            "model_id": model.id,
            "category_id": category.id,
            "quantity_in_stock": 4,
            "minimum_stock_level": 1,
            "unit_price": 55.0,
        },
    )

    assert create_part_response.status_code == 201
    created_part = create_part_response.json()
    assert created_part["brand_id"] == brand.id
    assert created_part["model_id"] == model.id
    assert created_part["category_id"] == category.id
    assert created_part["brand_name"] == "Epson"
    assert created_part["model_name"] == "L3210"
    assert created_part["category_name"] == "Inkjet"

    stored_part = db_session.query(Part).filter(Part.part_number == "EP-HEAD-001").first()
    assert stored_part is not None


def test_parts_inventory_accepts_large_limit_for_parts_request_modal(
    client, db_session, create_user, auth_headers
):
    user = create_user("storekeeper_limit_user", UserRole.STOREKEEPER)

    response = client.get(
        "/api/v1/parts/inventory?skip=0&limit=1000",
        headers=auth_headers(user),
    )

    assert response.status_code == 200
    assert isinstance(response.json(), list)
