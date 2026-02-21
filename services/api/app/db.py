import os
import psycopg
from psycopg.rows import dict_row

def get_db_url() -> str:
    # IMPORTANT: psycopg requires postgresql:// (NOT postgresql+psycopg://)
    url = os.getenv("DATABASE_URL", "")
    if not url.startswith("postgresql://"):
        raise RuntimeError("DATABASE_URL must start with postgresql://")
    return url

def conn():
    return psycopg.connect(get_db_url(), row_factory=dict_row)
