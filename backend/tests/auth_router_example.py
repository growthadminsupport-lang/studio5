# ตัวอย่างการต่อเข้ากับ main app ที่มีอยู่ — เอาแค่ 2 บรรทัดที่ import/include ไปแปะในไฟล์ main จริง

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes_auth import router as auth_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

# ตัวอย่างการใช้ป้องกัน endpoint อื่น เช่นตอนสร้าง child profile:
#
# from auth import get_current_user
#
# @app.post("/api/children")
# async def create_child(data: ChildCreate, user: User = Depends(get_current_user)):
#     ...  # user.id ตรงนี้คือ parent ที่ login อยู่ ใช้เป็น user_id ของ child ได้เลย
