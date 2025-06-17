import pytest
from starlette.requests import Request
from freezegun import freeze_time
from src.security import generate_password_hash, verify_password, generate_jwt_token, decode_jwt_token, get_user

def test_generate_password_hash():
    password = 'password123'
    hashed_password = generate_password_hash(password)

    assert hashed_password is not None
    assert hashed_password != password

def test_verify_hashed_password():
    password = 'password123'
    hashed_password = generate_password_hash(password)

    assert verify_password(password, hashed_password)

def test_verify_password_with_invalid_password():
    password = 'password123'
    hashed_password = generate_password_hash(password)

    assert not verify_password('invalid_password', hashed_password)

def test_generate_jwt_token():
    token = generate_jwt_token(1, 'test_user')

    assert token['access_token'] is not None
    assert token['token_type'] == 'Bearer'

def test_decode_jwt_token():
    user_id = 1
    username = 'test_user'
    token = generate_jwt_token(user_id, username)

    decoded_token = decode_jwt_token(token['access_token'])

    assert decoded_token['sub'] == str(user_id)
    assert decoded_token['username'] == username
    assert decoded_token['iat'] is not None
    assert decoded_token['exp'] is not None

def test_decode_jwt_token_with_expired_token():
    with freeze_time('2025-01-01 00:00:00'):
        token = generate_jwt_token(1, 'test_user')

    with freeze_time('2025-01-02 00:00:01'):
        with pytest.raises(Exception) as e:
            decode_jwt_token(token['access_token'])

    assert e.value.status_code == 401
    assert e.value.detail == 'Token expired'

def test_decode_jwt_token_with_invalid_token():
    token = 'invalid_token'

    with pytest.raises(Exception) as e:
        decode_jwt_token(token)

    assert e.value.status_code == 401
    assert e.value.detail == 'Invalid token'

def test_get_user_success(user, db_session):
    token = generate_jwt_token(user.id, user.username)
    request = Request(scope={'type': 'http', 'headers': [(b'authorization', f'Bearer {token["access_token"]}'.encode('utf-8'))]}, receive=None)
    user_data = get_user(request, db_session)

    assert user_data is not None
    assert user_data['id'] == user.id
    assert user_data['username'] == user.username
    assert user_data['email'] == user.email

def test_get_user_with_no_registered_user(db_session):
    token = generate_jwt_token(1, 'test_user')
    request = Request(scope={'type': 'http', 'headers': [(b'authorization', f'Bearer {token["access_token"]}'.encode('utf-8'))]}, receive=None)
    user_data = get_user(request, db_session)

    assert user_data is None
