"""Real HTTP, PostgreSQL and refine9 check against an explicitly disposable database.

Run: venv/Scripts/python tests/refine9_smoke_test.py --image PATH_TO_RSNA_1386_PNG
API must be running at http://127.0.0.1:8019. Never use a production DATABASE_URL.
"""
import argparse
import asyncio
from io import BytesIO
import os
from pathlib import Path
import sys
import time
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import httpx
from PIL import Image
from sqlalchemy import text


async def seed():
    from database import engine
    from auth import hash_password
    assert engine.url.host in ('127.0.0.1', 'localhost') and engine.url.database.startswith('growth_refine9_test')
    password = 'Refine9LocalTest2026'
    digest = await hash_password(password)
    users = []
    async with engine.begin() as db:
        for index in range(2):
            user_id = uuid.uuid4()
            email = f'refine9-{index}-{user_id.hex[:8]}@example.com'
            await db.execute(text('''INSERT INTO usr_accounts
                (usr_id, email, password_hash, full_name, terms_accepted_at)
                VALUES (:id, :email, :password, 'Refine9 local test', now())'''),
                {'id': user_id, 'email': email, 'password': digest})
            users.append({'id': str(user_id), 'email': email, 'password': password})
    await engine.dispose()
    return users


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--image', type=Path, required=True, help='Original validation image 1386.png')
    parser.add_argument('--base-url', default='http://127.0.0.1:8019')
    args = parser.parse_args()
    assert args.base_url.startswith('http://127.0.0.1:')
    assert args.image.name == '1386.png'
    assert 'growth_refine9_test' in os.environ.get('DATABASE_URL', '')
    users = asyncio.run(seed())
    raw = args.image.read_bytes()
    with httpx.Client(base_url=args.base_url, timeout=60) as client:
        assert client.get('/ready').status_code == 200
        assert client.get('/api/bone-age/model').status_code == 401
        tokens = []
        for user in users:
            response = client.post('/api/auth/login', json={'email': user['email'], 'password': user['password']})
            assert response.status_code == 200, response.text
            tokens.append({'Authorization': 'Bearer ' + response.json()['access_token']})
        owner, outsider = tokens
        child_response = client.post('/api/children', headers=owner, json={
            'name': 'Refine9 website test', 'sex': 'female', 'date_of_birth': '2020-01-01'})
        assert child_response.status_code == 201, child_response.text
        child = child_response.json()['id']
        path = '/api/bone-age'
        assert client.get(path, params={'childId': child}, headers=outsider).status_code == 404
        assert client.post(path, headers=outsider, data={'childId': child}, files={'file': ('hand.png', raw, 'image/png')}).status_code == 404
        assert client.post(path, headers=owner, data={'childId': child}, files={'file': ('bad.png', b'not an image', 'image/png')}).status_code == 400
        assert client.post(path, headers=owner, data={'childId': child}, files={'file': ('bad.gif', b'GIF89a', 'image/gif')}).status_code == 400
        assert client.post(path, headers=owner, data={'childId': child}, files={'file': ('large.png', b'x' * (10 * 1024 * 1024 + 1), 'image/png')}).status_code == 413
        stream = BytesIO()
        Image.new('L', (4001, 4001)).save(stream, 'PNG')
        assert client.post(path, headers=owner, data={'childId': child}, files={'file': ('oversized.png', stream.getvalue(), 'image/png')}).status_code == 400
        started = time.perf_counter()
        result = client.post(path, headers=owner, data={'childId': child, 'sex': 'male'}, files={'file': ('hand.png', raw, 'image/png')})
        assert result.status_code == 201, result.text
        row = result.json()
        assert row['status'] == 'PENDING' and row['predictedAgeMonths'] is None
        prediction_id = row['id']
        for _ in range(120):
            history = client.get(path, headers=owner, params={'childId': child})
            assert history.status_code == 200, history.text
            row = history.json()[0]
            if row['status'] != 'PENDING':
                break
            time.sleep(0.5)
        assert row['status'] == 'COMPLETED', row
        # The client sent male, but the owned child profile is female.
        assert abs(row['predictedAgeMonths'] - 28.043977737426758) < 0.02, row
        assert row['maeMonths'] == 7.43 and row['modelVersion'] == 'effnetb5-refine9-tta-rsna'
        assert 'not a clinical diagnosis' in row['screeningNote']
        image_path = f'{path}/{prediction_id}/image'
        saved_image = client.get(image_path, headers=owner)
        assert saved_image.content == raw and saved_image.headers['cache-control'] == 'no-store'
        assert client.get(image_path, headers=outsider).status_code == 404
        assert client.delete(f'{path}/{prediction_id}', headers=outsider).status_code == 404
        assert client.delete(f'{path}/{prediction_id}', headers=owner).status_code == 204
        assert client.get(image_path, headers=owner).status_code == 404
        assert client.get(path, headers=owner, params={'childId': child}).json() == []
        print(f'PASS: HTTP prediction, guardian ownership, file limits, private image bytes, history and deletion. End-to-end {time.perf_counter() - started:.2f} s.')
        print('Browser fixture account:', users[0]['email'], '| password:', users[0]['password'])
        print('Child:', child)


if __name__ == '__main__':
    main()
