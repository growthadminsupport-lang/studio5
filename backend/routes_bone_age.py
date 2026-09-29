"""Authenticated uploads and persisted prediction history. Images stay private in PostgreSQL."""
import asyncio
from datetime import date, datetime, timezone
import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, Response, UploadFile
from sqlalchemy import func, select, text, update
from sqlalchemy.orm import undefer

from bone_age_ai.inference import MODEL_MAE_MONTHS, MODEL_VERSION, SCREENING_NOTE, model_status, predict_bone_age, validate_image
from database import async_session_maker
from models import BoneAgePrediction, Child
from routes_children import CurrentUser, Db, get_owned_child

router = APIRouter(prefix='/api/bone-age', tags=['bone-age'])
logger = logging.getLogger('growth.bone-age')
# ponytail: in-process jobs, single uvicorn worker; interrupted jobs fail on restart.
_worker = asyncio.Semaphore(1)


def reply(row):
    return {'id': str(row.id), 'childId': str(row.child_id), 'status': row.status,
            'predictedAgeMonths': row.predicted_months, 'modelVersion': row.model_version,
            'maeMonths': row.margin_error, 'screeningNote': SCREENING_NOTE,
            'failureReason': row.failure_reason, 'createdAt': row.created_at,
            'completedAt': row.completed_at}


async def complete_prediction(prediction_id, raw, is_male):
    async with _worker:
        try:
            months = await asyncio.to_thread(predict_bone_age, raw, is_male)
            values = {'status': 'COMPLETED', 'predicted_months': months, 'failure_reason': None}
        except Exception:
            logger.exception('Bone age inference failed for %s', prediction_id)
            values = {'status': 'FAILED', 'failure_reason': 'Analysis failed. Try a readable hand X-ray or contact support.'}
        async with async_session_maker() as db:
            await db.execute(update(BoneAgePrediction).where(
                BoneAgePrediction.id == prediction_id, BoneAgePrediction.status == 'PENDING'
            ).values(**values, completed_at=datetime.now(timezone.utc)))
            await db.commit()


async def recover_interrupted():
    async with async_session_maker() as db:
        await db.execute(update(BoneAgePrediction).where(
            BoneAgePrediction.status == 'PENDING', BoneAgePrediction.model_version == MODEL_VERSION
        ).values(status='FAILED', failure_reason='Analysis was interrupted. Please upload the image again.',
                 completed_at=datetime.now(timezone.utc)))
        await db.commit()


@router.get('/model')
async def status(user: CurrentUser):
    return model_status()


@router.post('', status_code=201)
async def upload(user: CurrentUser, db: Db, background: BackgroundTasks,
                 childId: uuid.UUID = Form(...), file: UploadFile = File(...)):
    child = await get_owned_child(db, user, childId)
    if not model_status()['ready']:
        raise HTTPException(503, 'Bone age analysis is unavailable. Try again later.')
    # Row lock serializes admission across concurrent uploads, keeping the queue bounded.
    await db.execute(select(Child.id).where(Child.id == childId).with_for_update())
    await db.execute(text('SELECT pg_advisory_xact_lock(20260929)'))
    total_pending = await db.scalar(select(func.count()).select_from(BoneAgePrediction).where(
        BoneAgePrediction.status == 'PENDING'))
    if total_pending >= 4:
        raise HTTPException(429, 'Analysis queue is full. Try again shortly.')
    pending = await db.scalar(select(func.count()).select_from(BoneAgePrediction).where(
        BoneAgePrediction.status == 'PENDING', BoneAgePrediction.child_id == childId))
    if pending >= 1:
        raise HTTPException(429, 'Wait for this child\'s current analysis to finish.')
    if file.content_type not in ('image/jpeg', 'image/png'):
        raise HTTPException(400, 'Use a JPEG or PNG image')
    try:
        raw = await file.read(10 * 1024 * 1024 + 1)
    finally:
        await file.close()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(413, 'Maximum image size is 10 MB')
    try:
        image_type = await asyncio.to_thread(validate_image, raw)
    except ValueError as error:
        raise HTTPException(400, str(error)) from error
    prediction_id = uuid.uuid4()
    row = BoneAgePrediction(id=prediction_id, child_id=child.id, prediction_date=date.today(),
                            image_path=f'database:{prediction_id}', image_data=raw, image_type=image_type,
                            status='PENDING', model_version=MODEL_VERSION, margin_error=MODEL_MAE_MONTHS)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    result = reply(row)
    background.add_task(complete_prediction, row.id, raw, child.sex == 'male')
    return result


@router.get('')
async def history(childId: uuid.UUID, user: CurrentUser, db: Db):
    await get_owned_child(db, user, childId)
    rows = (await db.execute(select(BoneAgePrediction).where(
        BoneAgePrediction.child_id == childId).order_by(BoneAgePrediction.created_at.desc()))).scalars()
    return [reply(row) for row in rows]


async def get_owned_prediction(prediction_id, user, db, with_image=False):
    query = select(BoneAgePrediction).join(Child).where(
        BoneAgePrediction.id == prediction_id, Child.user_id == user.id)
    if with_image:
        query = query.options(undefer(BoneAgePrediction.image_data))
    row = (await db.execute(query)).scalar_one_or_none()
    if row is None:
        raise HTTPException(404, 'Prediction not found')
    return row


@router.get('/{prediction_id}/image')
async def image(prediction_id: uuid.UUID, user: CurrentUser, db: Db):
    row = await get_owned_prediction(prediction_id, user, db, with_image=True)
    if row.image_data is None:
        raise HTTPException(404, 'Image is unavailable for this older prediction')
    return Response(row.image_data, media_type=row.image_type,
                    headers={'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'})


@router.delete('/{prediction_id}', status_code=204)
async def delete(prediction_id: uuid.UUID, user: CurrentUser, db: Db):
    row = await get_owned_prediction(prediction_id, user, db)
    await db.delete(row)
    await db.commit()
