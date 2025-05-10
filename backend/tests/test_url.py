from src.db.models import Link

def test_get_url_not_exists(client):
    response = client.get('/api/short/abcde')

    assert response.status_code == 404
    assert response.json()['detail'] == 'Link not found'

def test_get_url_success(client, simple_url):
    response = client.get(f'/api/short/{simple_url.short_url}')

    assert response.status_code == 200
    assert response.json()['original_url'] == simple_url.original_url

def test_get_protected_url_with_password(client, protected_url):
    response = client.get(f'/api/short/{protected_url.short_url}', headers={'password': protected_url.clean_password})

    assert response.status_code == 200
    assert response.json()['original_url'] == protected_url.original_url

def test_get_protected_url_with_invalid_password(client, protected_url):
    response = client.get(f'/api/short/{protected_url.short_url}', headers={'password': 'wrong_password'})

    assert response.status_code == 401
    assert response.json()['detail'] == 'Invalid password'

def test_get_protected_url_without_password(client, protected_url):
    response = client.get(f'/api/short/{protected_url.short_url}')

    assert response.status_code == 401
    assert response.json()['detail'] == 'Link is password protected'

def test_create_url_simple(client):
    response = client.post('/api/short', json={'original_url': 'https://www.google.com/'})

    assert response.status_code == 200
    assert response.json()['original_url'] == 'https://www.google.com/'
    assert response.json()['short_url']
    assert response.json()['created_at']

def test_create_url_with_short_url(client):
    response = client.post('/api/short', json={'original_url': 'https://www.google.com/', 'short_url': 'teste'})

    assert response.status_code == 200
    assert response.json()['original_url'] == 'https://www.google.com/'
    assert response.json()['short_url'] == 'teste'
    assert response.json()['created_at']

def test_create_url_with_invalid_short_url(client):
    response = client.post('/api/short', json={'original_url': 'https://www.google.com/', 'short_url': 'a'})

    assert response.status_code == 400
    assert response.json()['detail'] == 'Invalid short URL'

def test_create_url_with_existing_short_url(client, simple_url):
    short_url = simple_url.short_url

    response = client.post('/api/short', json={'original_url': 'https://www.google.com.br/', 'short_url': short_url})
    assert response.status_code == 400
    assert response.json()['detail'] == 'Short URL already exists'

def test_create_url_with_password(client, db_session):
    response = client.post('/api/short', json={'original_url': 'https://www.google.com.br/', 'password': '123456'})

    assert response.status_code == 200
    assert response.json()['original_url'] == 'https://www.google.com.br/'

    link = db_session.query(Link).filter(Link.short_url == response.json()['short_url']).first()

    assert link.password is not None

