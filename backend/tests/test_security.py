import pytest
from starlette.responses import Response
from freezegun import freeze_time
import uuid
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

def test_generate_jwt_token(request_mock, user, db_session):
    token = generate_jwt_token(user.id, user.username, str(uuid.uuid4()), request_mock, Response(), False, db_session)

    assert token['access_token'] is not None
    assert token['refresh_token'] is not None

def test_decode_jwt_token(request_mock, user, db_session):
    token = generate_jwt_token(user.id, user.username, str(uuid.uuid4()), request_mock, Response(), False, db_session)

    decoded_token = decode_jwt_token(token['access_token'])

    assert decoded_token['sub'] == str(user.id)
    assert decoded_token['username'] == user.username
    assert decoded_token['iat'] is not None
    assert decoded_token['exp'] is not None

def test_decode_jwt_token_with_expired_token(request_mock, db_session):
    with freeze_time('2025-01-01 00:00:00'):
        token = generate_jwt_token(1, 'test_user', str(uuid.uuid4()), request_mock, Response(), False, db_session)

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

def test_get_user_success(request_mock, user, db_session):
    response = Response()
    session_id = str(uuid.uuid4())
    token_data = generate_jwt_token(user.id, user.username, session_id, request_mock, response, False, db_session)

    request_mock.cookies = {
        'access_token': token_data['access_token'],
        'refresh_token': token_data['refresh_token'],
        'session_id': session_id
    }

    user_data = get_user(request_mock, response, db_session)

    assert user_data is not False
    assert user_data['id'] == user.id
    assert user_data['username'] == user.username
    assert user_data['email'] == user.email

def test_get_user_with_no_registered_user(request_mock, db_session):
    session_id = str(uuid.uuid4())
    token = generate_jwt_token(1, 'test_user', session_id, request_mock, Response(), False, db_session)

    request_mock.cookies = {
        'access_token': token['access_token'],
        'refresh_token': token['refresh_token'],
        'session_id': session_id
    }

    user_data = get_user(request_mock, Response(), db_session)

    assert user_data is False
