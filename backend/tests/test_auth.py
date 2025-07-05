from src.db.models import RefreshToken, User

def test_login_non_existent_user(client):
    response = client.post('/api/auth/login', json={'email': 'email@test.com', 'password': 'test_password'})

    assert response.status_code == 401
    assert response.json()['detail'] == 'E-mail ou senha estão inválidos. Por favor, tente novamente.'
    assert 'access_token' not in response.json()

def test_login_invalid_password(client, user):
    response = client.post('/api/auth/login', json={'email': user.email, 'password': 'wrong_password'})

    assert response.status_code == 401
    assert response.json()['detail'] == 'E-mail ou senha estão inválidos. Por favor, tente novamente.'
    assert 'access_token' not in response.json()

def test_login_validator_email_invalid(client):
    response = client.post('/api/auth/login', json={'email': 'wrong@e.a', 'password': 'test_password'})

    assert response.status_code == 422
    assert response.json()['detail'][0]['msg'] == 'Value error, O e-mail inserido não é válido. Verifique se o e-mail está correto e tente novamente.'

def test_login_success(client, user, request_mock):
    response = client.post('/api/auth/login', json={'email': user.email, 'password': user.clean_password}, headers=request_mock.headers)

    assert response.status_code == 200
    assert 'access_token' in response.json()
    assert 'refresh_token' in response.json()

def test_register_with_password_mismatch(client):
    response = client.post('/api/auth/register', json={
        'username': 'user',
        'email': 'user@test.com',
        'password': 'test_password1',
        'confirm_password': 'another_password1'
    })

    assert response.status_code == 400
    assert response.json()['detail'] == 'As senhas não coincidem. Verifique se as senhas estão iguais.'
    assert 'access_token' not in response.json()

def test_register_with_username_already_exists(client, user):
    response = client.post('/api/auth/register', json={
        'username': user.username,
        'email': 'user2@test.com',
        'password': 'test_password1',
        'confirm_password': 'test_password1'
    })

    assert response.status_code == 409
    assert response.json()['detail'] == 'Nome de usuário já registrado. Por favor, tente outro nome de usuário.'
    assert 'access_token' not in response.json()

def test_register_with_email_already_exists(client, user):
    response = client.post('/api/auth/register', json={
        'username': 'User2',
        'email': user.email,
        'password': 'test_password1',
        'confirm_password': 'test_password1'
    })

    assert response.status_code == 409
    assert response.json()['detail'] == 'E-mail já registrado. Por favor, tente outro e-mail.'
    assert 'access_token' not in response.json()

def test_register_validator_username_invalid(client):
    test_usernames = [
        'test user',  # espaço
        'test@user',  # simbolo @
        'test_user_with_more_than_16_characters',
        'te'  # menos de 3 caracteres
    ]

    for username in test_usernames:
        response = client.post('/api/auth/register', json={'username': username, 'email': 'user@test.com', 'password': 'test_password1', 'confirm_password': 'test_password1'})

        assert response.status_code == 422
        assert response.json()['detail'][0]['msg'] == 'Value error, O nome de usuário deve conter apenas letras, números, ou underlines e ter entre 3 e 16 caracteres.'

def test_register_validator_email_invalid(client):
    response = client.post('/api/auth/register', json={'username': 'user', 'email': 'wrong@e.a', 'password': 'test_password1', 'confirm_password': 'test_password1'})

    assert response.status_code == 422
    assert response.json()['detail'][0]['msg'] == 'Value error, O e-mail inserido não é válido. Verifique se o e-mail está correto e tente novamente.'

def test_register_validator_password_invalid(client):
    test_passwords = [
        '12345678',  # sem letras
        'abcdefgh',  # sem numeros
        'abc123',  # menos de 8 caracteres
    ]

    for password in test_passwords:
        response = client.post('/api/auth/register', json={'username': 'user', 'email': 'user@test.com', 'password': password, 'confirm_password': password})

        assert response.status_code == 422
        assert response.json()['detail'][0]['msg'] == 'Value error, A senha deve conter no mínimo 8 caracteres, incluindo pelo menos uma letra e um número.'

def test_register_success(client, request_mock):
    response = client.post('/api/auth/register', json={'username': 'user', 'email': 'user@test.com', 'password': 'password1', 'confirm_password': 'password1'}, headers=request_mock.headers)

    assert response.status_code == 200
    assert response.json()
    assert 'access_token' in response.json()
    assert 'refresh_token' in response.json()

def test_get_current_user_error(client_with_invalid_user):
    response = client_with_invalid_user.get('/api/auth/me')

    assert response.status_code == 401
    assert response.json()['detail'] == 'Invalid token or user not found'

def test_get_current_user_success(logged_client, user):
    response = logged_client.get('/api/auth/me')

    assert response.status_code == 200
    assert response.json() == {'id': user.id, 'username': user.username, 'email': user.email}

def test_update_username_with_invalid_user(client_with_invalid_user):
    response = client_with_invalid_user.patch('/api/auth/me/username', json={'username': 'new_username'})

    assert response.status_code == 401
    assert response.json()['detail'] == 'Invalid token or user not found'

def test_update_username_with_duplicate_username(logged_client, user):
    response = logged_client.patch('/api/auth/me/username', json={'username': user.username})

    assert response.status_code == 409
    assert response.json()['detail'] == 'Username already registered. Please try another username.'

def test_update_username_success(logged_client, user, db_session):
    response = logged_client.patch('/api/auth/me/username', json={'username': 'new_username'})

    assert response.status_code == 200
    assert response.json() == {'message': 'Username updated successfully'}

    user_db = db_session.query(User).filter(User.id == user.id).first()
    assert user_db.username == 'new_username'

def test_update_email_with_invalid_user(client_with_invalid_user):
    response = client_with_invalid_user.patch('/api/auth/me/email', json={'email': 'new@email.com'})

    assert response.status_code == 401
    assert response.json()['detail'] == 'Invalid token or user not found'

def test_update_email_with_duplicate_email(logged_client, user):
    response = logged_client.patch('/api/auth/me/email', json={'email': user.email})

    assert response.status_code == 409
    assert response.json()['detail'] == 'E-mail already registered. Please try another e-mail'

def test_update_email_success(logged_client, user, db_session):
    response = logged_client.patch('/api/auth/me/email', json={'email': 'new@email.com'})

    assert response.status_code == 200
    assert response.json() == {'message': 'E-mail updated successfully'}

    user_db = db_session.query(User).filter(User.id == user.id).first()
    assert user_db.email == 'new@email.com'

def test_update_password_with_invalid_user(client_with_invalid_user):
    response = client_with_invalid_user.patch('/api/auth/me/password', json={'password': 'newpassword1'})

    assert response.status_code == 401
    assert response.json()['detail'] == 'Invalid token or user not found'

def test_update_password_with_same_password(logged_client, user):
    response = logged_client.patch('/api/auth/me/password', json={'password': user.clean_password})

    assert response.status_code == 401
    assert response.json()['detail'] == 'The new password cannot be the same as the old password'

def test_update_password_success(logged_client):
    response = logged_client.patch('/api/auth/me/password', json={'password': 'newpassword1'})

    assert response.status_code == 200
    assert response.json() == {'message': 'Password updated successfully'}

def test_logout_success(logged_client, db_session):
    response = logged_client.post('/api/auth/logout')

    assert response.status_code == 200
    assert response.json() == {'message': 'Successfully logged out'}

    refresh_db = db_session.query(RefreshToken).filter(RefreshToken.session_id == logged_client.cookies['session_id']).first()
    assert refresh_db.is_active is False