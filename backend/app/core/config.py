from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:123456@localhost:5432/style_safety"
    MIMO_API_KEY: str = ""
    MIMO_BASE_URL: str = "https://api.xiaomimimo.com/v1"
    MIMO_MODEL: str = "mimo-v2.5-pro-ultraspeed"
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    class Config:
        env_file = ".env"


settings = Settings()
