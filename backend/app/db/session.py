from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


# ==========================================================
# DATABASE URL
# ==========================================================

DATABASE_URL = URL.create(
    drivername="mysql+pymysql",
    username=settings.DB_USER,
    password=settings.DB_PASSWORD,
    host=settings.DB_HOST,
    port=settings.DB_PORT,
    database=settings.DB_NAME,
    query={
        "charset": "utf8mb4",
    },
)


# ==========================================================
# ENGINE
# ==========================================================

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)


# ==========================================================
# SESSION
# ==========================================================

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)


# ==========================================================
# DEPENDENCY
# ==========================================================

def get_db():
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()