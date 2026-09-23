"""
Entry point ของ backend

รันบนเครื่องตัวเอง:
    venv\\Scripts\\uvicorn main:app --reload

รันบน host (Render จะใส่ค่า $PORT มาให้เอง ต้อง bind 0.0.0.0 ไม่ใช่ 127.0.0.1
ไม่งั้นจะรับได้เฉพาะ request จากใน container เดียวกัน):
    uvicorn main:app --host 0.0.0.0 --port $PORT

เปิด http://127.0.0.1:8000/docs เพื่อทดสอบ endpoint ผ่าน Swagger UI
"""
import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import text

from config import DEFAULT_CORS_ORIGINS, parse_cors_origins
from database import engine
from google_oauth import GOOGLE_ENABLED
from mailer import SMTP_ENABLED
from routes_auth import router as auth_router
from routes_children import router as children_router
from routes_growth import router as growth_router

load_dotenv()

logger = logging.getLogger("growth.startup")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ประกาศตอนสตาร์ทว่าฟีเจอร์ที่ขึ้นกับค่าตั้งเปิดอยู่หรือไม่
    # สองอย่างนี้ "ไม่ตั้งก็รันได้" จึงเงียบมากเวลาลืมตั้ง อาการที่ผู้ใช้เห็นคือ
    # "อีเมลไม่มา" กับ "กดปุ่ม Google แล้วไม่เข้า" โดยไม่มี error ให้ดูเลย
    # บรรทัดนี้คือที่แรกที่คนไล่ปัญหาจะเห็นว่าต้นเหตุอยู่ที่ค่าตั้ง
    #
    # ใช้ warning ไม่ใช่ info เพราะ uvicorn ตั้ง handler ให้เฉพาะ logger ของตัวเอง
    # ส่วน logger อื่นตกไปที่ lastResort ของ Python ซึ่งพิมพ์เฉพาะ WARNING ขึ้นไป
    # ถ้าใช้ info บรรทัดนี้จะไม่โผล่เลย (mailer.py ใช้ warning ด้วยเหตุผลเดียวกัน)
    logger.warning(
        "เข้าสู่ระบบด้วย Google: %s · ส่งอีเมลจริง: %s",
        "เปิด" if GOOGLE_ENABLED else "ปิด (ไม่ได้ตั้ง GOOGLE_CLIENT_IDS)",
        "เปิด" if SMTP_ENABLED else "ปิด (ไม่ได้ตั้ง SMTP_HOST — อีเมลจะพิมพ์ลง log แทน)",
    )
    yield
    # ปิด connection pool ให้เรียบร้อยตอนเซิร์ฟเวอร์หยุด
    await engine.dispose()


app = FastAPI(
    title="GrowTH API",
    description="ระบบติดตามการเจริญเติบโตและคัดกรองวัยเจริญพันธุ์สำหรับเด็ก",
    version="0.1.0",
    lifespan=lifespan,
)


@app.exception_handler(RequestValidationError)
async def validation_error_response(request, exc: RequestValidationError):
    # Pydantic includes rejected input (passwords/tokens included) by default.
    # Keep field-level feedback, but never echo raw input or exception context.
    return JSONResponse(
        status_code=422,
        content={"detail": [
            {key: error[key] for key in ("loc", "msg", "type")}
            for error in exc.errors()
        ]},
    )

# ตั้ง CORS_ORIGINS ใน environment ของ host เป็นโดเมนจริงของ frontend เช่น
#   CORS_ORIGINS=https://growth.vercel.app,https://www.growth.co.th
# ถ้าไม่ตั้งจะ fallback เป็น localhost ของเครื่อง dev เท่านั้น
CORS_ORIGINS = parse_cors_origins(os.environ.get("CORS_ORIGINS", "")) or DEFAULT_CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(children_router)
app.include_router(growth_router)


@app.get("/", tags=["health"])
async def root():
    return {"service": "GrowTH API", "version": "0.1.0", "docs": "/docs"}


@app.get("/health", tags=["health"])
async def health():
    """เช็คว่าต่อฐานข้อมูลได้จริง ไม่ใช่แค่เซิร์ฟเวอร์ยังไม่ตาย"""
    async with engine.connect() as conn:
        version = await conn.scalar(text("SHOW server_version"))
        tables = await conn.scalar(text(
            "SELECT count(*) FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
        ))
    return {"status": "ok", "postgres": version, "tables": tables}
