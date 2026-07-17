from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore",
    )

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Premier Data Systems"
    
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = ""
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: str = "3306"
    MYSQL_DATABASE: str = "premier_data"

    # Email configuration
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""

    # Security
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # Other App Settings
    DEBUG: bool = False
    APP_NAME: str = "Repair Center Management System"
    APP_VERSION: str = "1.0.0"
    OTP_EXPIRY_MINUTES: int = 10
    SMTP_USE_TLS: bool = True
    SMTP_FROM_NAME: str = "Premier Data Systems"

    DATABASE_URL: str = "sqlite:///./repair_center.db"

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return self.DATABASE_URL
        
    ULTRAMSG_INSTANCE_ID: str = ""
    ULTRAMSG_TOKEN: str = ""

    # WhatsApp Bridge configuration
    WHATSAPP_BRIDGE_URL: str = "http://localhost:3000"
    WHATSAPP_BRIDGE_API_KEY: str = ""
    WHATSAPP_ENABLED: bool = False

    # CORS
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"]

    @field_validator("DEBUG", "SMTP_USE_TLS", "WHATSAPP_ENABLED", mode="before")
    @classmethod
    def parse_boolean_environment_values(cls, value):
        """Accept common deployment values such as `release` without crashing startup."""
        if isinstance(value, bool):
            return value
        return str(value).strip().lower() in {"1", "true", "t", "yes", "y", "on", "debug", "development"}

settings = Settings()
