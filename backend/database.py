import os

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from config import normalize_database_url

load_dotenv()   # อ่านค่าจากไฟล์ .env ถ้ามี (ไม่ทับ environment variable ที่ตั้งไว้แล้ว)

# ตั้งใน .env ตอน dev หรือใน dashboard ของ host ตอน deploy เช่น:
#   DATABASE_URL=postgresql+asyncpg://postgres@localhost:5432/growth_db      (เครื่องตัวเอง)
#   DATABASE_URL=postgresql://user:pw@ep-x.ap-southeast-1.aws.neon.tech/db?sslmode=require
# รูปแบบที่ Neon/Supabase/Render ให้มาใช้ได้เลย normalize_database_url() จัดการต่อให้
try:
    _RAW_DATABASE_URL = os.environ["DATABASE_URL"]
except KeyError:
    raise RuntimeError(
        "ไม่พบ DATABASE_URL — สร้างไฟล์ .env ที่รากโปรเจกต์ แล้วใส่บรรทัด\n"
        "  DATABASE_URL=postgresql+asyncpg://postgres@localhost:5432/growth_db\n"
        "ดูตัวอย่างเต็มได้ที่ .env.example"
    ) from None

DATABASE_URL, CONNECT_ARGS = normalize_database_url(_RAW_DATABASE_URL)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args=CONNECT_ARGS,
    # ฐานข้อมูลแบบ managed (Neon, Supabase) ตัด connection ที่ไม่ได้ใช้ทิ้งเงียบ ๆ
    # pool_pre_ping ยิงเช็คก่อนหยิบมาใช้ทุกครั้ง กัน error "connection was closed"
    # ที่จะเกิดกับ request แรกหลังเซิร์ฟเวอร์ว่างมานาน
    pool_pre_ping=True,
    pool_recycle=1800,
    # แผนฟรีของผู้ให้บริการส่วนใหญ่จำกัดจำนวน connection ไว้ต่ำ ตั้งเผื่อไว้ให้ปรับได้
    pool_size=int(os.environ.get("DB_POOL_SIZE", "5")),
    max_overflow=int(os.environ.get("DB_MAX_OVERFLOW", "5")),
)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)


async def get_db():
    """FastAPI dependency — เปิด session ให้ทีละ request แล้วปิดให้อัตโนมัติ"""
    async with async_session_maker() as session:
        yield session
