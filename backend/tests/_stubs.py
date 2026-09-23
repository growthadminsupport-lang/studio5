"""
ตัวช่วยสำหรับเทสต์ในโฟลเดอร์นี้ — ไม่มีเทสต์อยู่ในไฟล์นี้

เทสต์ทั้งหมดในโฟลเดอร์นี้ "ไม่ต่อฐานข้อมูลจริง" ใช้ FakeSession แทน AsyncSession
แปลว่าทดสอบได้เฉพาะตรรกะฝั่ง Python (เลือกแถวไหน, interpolate ยังไง, กันค่าผิดยังไง)
ส่วนตัวคำสั่ง SQL ที่ส่งไป PostgreSQL จริง ๆ ยังไม่ได้ทดสอบ ต้องมี DB ถึงจะครอบได้
"""
import importlib.util
import os
import sys
import types


def add_project_root_to_path():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if root not in sys.path:
        sys.path.insert(0, root)


def stub_sqlalchemy_if_missing():
    """
    growth_calc import sqlalchemy ไว้สำหรับส่วนที่คุยกับ DB
    ถ้ายังไม่ได้ pip install ก็ใส่ stub ให้ import ผ่านไปก่อน จะได้รันเทสต์ได้
    ตั้งแต่ยังไม่ตั้ง environment ครบ — ถ้าติดตั้งจริงแล้วจะใช้ของจริงแทน
    """
    if importlib.util.find_spec("sqlalchemy") is not None:
        return False

    class _Chain:
        """เลียนแบบ select(...).where(...).order_by(...).limit(...) ที่ต่อกันได้เรื่อย ๆ"""

        def __getattr__(self, _name):
            return lambda *a, **k: self

    class _Column:
        """
        เลียนแบบคอลัมน์ของ ORM — โค้ดจริงเขียน GrowthReferenceLMS.age_months <= age
        แล้วส่งผลลัพธ์เข้า .where() ตรงนี้จึงต้องรับ ==, <=, >=, .desc(), .asc() ได้
        โดยคืนอะไรก็ได้ที่ FakeSession จะโยนทิ้งอยู่แล้ว
        """

        __hash__ = object.__hash__

        def __eq__(self, _other):
            return self

        def __le__(self, _other):
            return self

        def __ge__(self, _other):
            return self

        def __getattr__(self, _name):
            return lambda *a, **k: self

    sa = types.ModuleType("sqlalchemy")
    sa.select = lambda *a, **k: _Chain()
    sa.String = sa.Boolean = sa.DateTime = sa.ForeignKey = object
    sa.Integer = sa.Float = object
    sa.func = types.SimpleNamespace(now=lambda: None)

    sa_ext = types.ModuleType("sqlalchemy.ext")
    sa_asyncio = types.ModuleType("sqlalchemy.ext.asyncio")
    sa_asyncio.AsyncSession = object

    sys.modules["sqlalchemy"] = sa
    sys.modules["sqlalchemy.ext"] = sa_ext
    sys.modules["sqlalchemy.ext.asyncio"] = sa_asyncio

    class GrowthReferenceLMS:
        sex = _Column()
        age_months = _Column()
        metric_type = _Column()
        l_value = _Column()
        m_value = _Column()
        s_value = _Column()

    models = types.ModuleType("models")
    models.GrowthReferenceLMS = GrowthReferenceLMS
    sys.modules["models"] = models
    return True


class RefRow:
    """แถวหนึ่งใน ref_growth_lms"""

    def __init__(self, age_months, l_value, m_value, s_value):
        self.age_months = age_months
        self.l_value = l_value
        self.m_value = m_value
        self.s_value = s_value

    def __repr__(self):
        return f"RefRow(age={self.age_months}, L={self.l_value}, M={self.m_value}, S={self.s_value})"


class _FakeResult:
    def __init__(self, row):
        self._row = row

    def scalar_one_or_none(self):
        return self._row


class FakeSession:
    """
    แทน AsyncSession — เลียนแบบผลลัพธ์ที่ PostgreSQL จะคืนให้ get_lms_params

    get_lms_params ยิง query 2 ครั้งต่อ 1 metric เสมอ และเรียงลำดับแน่นอน:
    ครั้งแรกหาแถว age <= ที่ต้องการ (lower) ครั้งที่สองหาแถว age >= (upper)
    คลาสนี้จึงนับจำนวนครั้งที่ถูกเรียกแล้วคืนแถวที่ถูกต้องให้ตามนั้น

    evaluate_metric ถูกเรียกตามลำดับ height -> weight -> bmi ดังนั้นทุก ๆ 2 ครั้ง
    จะเลื่อนไป metric ถัดไปใน metric_order
    """

    def __init__(self, rows_by_metric, age_months, metric_order=("height", "weight", "bmi")):
        self.rows_by_metric = rows_by_metric
        self.age_months = age_months
        self.metric_order = list(metric_order)
        self.calls = 0

    async def execute(self, _query):
        pair_index = self.calls // 2
        wants_lower = self.calls % 2 == 0
        self.calls += 1

        if pair_index >= len(self.metric_order):
            raise AssertionError(f"ถูก query เกินจำนวน metric ที่เตรียมไว้ (ครั้งที่ {self.calls})")

        rows = self.rows_by_metric.get(self.metric_order[pair_index], [])
        if wants_lower:
            candidates = [r for r in rows if r.age_months <= self.age_months]
            row = max(candidates, key=lambda r: r.age_months) if candidates else None
        else:
            candidates = [r for r in rows if r.age_months >= self.age_months]
            row = min(candidates, key=lambda r: r.age_months) if candidates else None
        return _FakeResult(row)
