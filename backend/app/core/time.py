"""Time helpers used across the application."""

from datetime import UTC, date, datetime


def utc_now() -> datetime:
    """Return a naive UTC datetime for database fields."""
    return datetime.now(UTC).replace(tzinfo=None)


def utc_now_aware() -> datetime:
    """Return a timezone-aware UTC datetime."""
    return datetime.now(UTC)


def utc_today() -> date:
    """Return today's date in UTC."""
    return datetime.now(UTC).date()
