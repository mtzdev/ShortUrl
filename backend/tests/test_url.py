def test_get_url_not_exists(client):
    response = client.get('/api/short/abcde')

    assert response.status_code == 404
    assert response.json()['detail'] == 'Link not found'

def test_get_url_success(client):
    response = client.post('/api/short', json={'original_url': 'https://www.google.com/', 'short_url': 'abcde'})

    assert response.status_code == 200
    assert response.json()['id'] == 1
    assert response.json()['original_url'] == 'https://www.google.com/'
    assert response.json()['short_url'] == 'abcde'
    assert response.json()['created_at']

    response = client.get('/api/short/abcde')
    assert response.status_code == 200
    assert response.json()['original_url'] == 'https://www.google.com/'

def test_get_url_with_password(client):
    response = client.post('/api/short', json={'original_url': 'https://www.google.com/', 'short_url': 'google', 'password': 'abcde'})

    assert response.status_code == 200
    assert response.json()['id'] == 1
    assert response.json()['original_url'] == 'https://www.google.com/'
    assert response.json()['short_url']
    assert response.json()['created_at']

    response = client.get('/api/short/google')
    assert response.status_code == 401
    assert response.json()['detail'] == 'Link is password protected'


def test_create_url_simple(client):
    response = client.post('/api/short', json={'original_url': 'https://www.google.com/'})

    assert response.status_code == 200
    assert response.json()['id'] == 1
    assert response.json()['original_url'] == 'https://www.google.com/'
    assert response.json()['short_url']
    assert response.json()['created_at']

def test_create_url_with_short_url(client):
    response = client.post('/api/short', json={'original_url': 'https://www.google.com/', 'short_url': 'teste'})

    assert response.status_code == 200
    assert response.json()['id'] == 1
    assert response.json()['original_url'] == 'https://www.google.com/'
    assert response.json()['short_url'] == 'teste'
    assert response.json()['created_at']

def test_create_url_with_invalid_short_url(client):
    response = client.post('/api/short', json={'original_url': 'https://www.google.com/', 'short_url': 'a'})

    assert response.status_code == 400
    assert response.json()['detail'] == 'Invalid short URL'

def test_create_url_with_existing_short_url(client):
    response1 = client.post('/api/short', json={'original_url': 'https://www.google.com/', 'short_url': 'google'})

    assert response1.status_code == 200
    assert response1.json()['id'] == 1
    assert response1.json()['original_url'] == 'https://www.google.com/'
    assert response1.json()['short_url'] == 'google'

    response2 = client.post('/api/short', json={'original_url': 'https://www.google.com.br/', 'short_url': 'google'})
    assert response2.status_code == 400
    assert response2.json()['detail'] == 'Short URL already exists'
