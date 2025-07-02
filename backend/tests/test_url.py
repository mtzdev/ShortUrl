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

def test_click_url_not_found(client):
    response = client.post('/api/click/abcde')

    assert response.status_code == 404
    assert response.json()['detail'] == 'Link not found'

def test_increment_click_url(client, simple_url, db_session):
    response = client.post(f'api/click/{simple_url.short_url}')

    assert response.status_code == 200
    assert response.json() == {'message': 'Link clicked successfully'}

    link = db_session.query(Link).filter(Link.id == simple_url.id).first()
    assert link.clicks == 1

def test_increment_multiple_clicks(client, simple_url, db_session):
    for _ in range(25):
        response = client.post(f'api/click/{simple_url.short_url}')
        assert response.status_code == 200
        assert response.json() == {'message': 'Link clicked successfully'}

    link = db_session.query(Link).filter(Link.id == simple_url.id).first()
    assert link.clicks == 25

def test_create_url_simple(client):
    response = client.post('/api/short', json={'original_url': 'https://www.google.com/'})

    assert response.status_code == 200
    assert response.json()['original_url'] == 'https://www.google.com/'
    assert response.json()['short_url']
    assert response.json()['created_at']

def test_create_url_with_user(logged_client, user, db_session):
    response = logged_client.post('/api/short', json={'original_url': 'https://www.google.com/'})

    assert response.status_code == 200
    assert response.json()['original_url'] == 'https://www.google.com/'
    assert response.json()['short_url']
    assert response.json()['created_at']

    link = db_session.query(Link).filter(Link.id == response.json()['id']).first()
    assert link.user_id == user.id

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

def test_get_stats_success(client, simple_url):
    response = client.get(f'/api/stats/{simple_url.short_url}')

    assert response.status_code == 200
    assert response.json()['original_url'] == simple_url.original_url
    assert response.json()['short_url'] == simple_url.short_url
    assert response.json()['clicks'] == 0
    assert response.json()['created_at']

def test_get_stats_with_invalid_link(client):
    response = client.get('/api/stats/abcde')

    assert response.status_code == 404
    assert response.json()['detail'] == 'Link not found'

def test_get_stats_with_protected_link(client, protected_url):
    response = client.get(f'/api/stats/{protected_url.short_url}')

    assert response.status_code == 401
    assert response.json()['detail'] == 'Link is password protected'

def test_get_all_user_links_with_invalid_user(client_with_invalid_user):
    response = client_with_invalid_user.get('/api/user/links')

    assert response.status_code == 401
    assert response.json()['detail'] == 'You must be logged in to access this resource'

def test_get_all_user_links_success(logged_client, user, db_session):
    db_session.add(Link(original_url='https://www.google.com/', short_url='teste1', user_id=user.id))
    db_session.add(Link(original_url='https://www.google.com/', short_url='teste2', user_id=user.id))
    db_session.commit()

    response = logged_client.get('/api/user/links')

    assert response.status_code == 200
    assert response.json()['links'][0]['original_url'] == 'https://www.google.com/'
    assert response.json()['links'][1]['short_url'] == 'teste2'
    assert len(response.json()['links']) == 2

def test_update_short_url_with_invalid_user(client_with_invalid_user):
    response = client_with_invalid_user.patch('/api/short/teste', json={'short_url': 'teste2'})

    assert response.status_code == 401
    assert response.json()['detail'] == 'You must be logged in to access this resource'

def test_update_short_url_with_invalid_short_url(logged_client, url_with_user):
    response = logged_client.patch(f'/api/short/{url_with_user.short_url}', json={'short_url': 'a'})

    assert response.status_code == 400
    assert response.json()['detail'] == 'Invalid short URL'

def test_update_short_url_with_non_existent_link(logged_client):
    response = logged_client.patch('/api/short/teste', json={'short_url': 'teste'})

    assert response.status_code == 404
    assert response.json()['detail'] == 'Link not found'

def test_update_short_url_with_duplicated_short_url(logged_client, url_with_user):
    response = logged_client.patch(f'/api/short/{url_with_user.short_url}', json={'short_url': url_with_user.short_url})

    assert response.status_code == 400
    assert response.json()['detail'] == 'Short URL already exists'

def test_update_short_url_success(logged_client, url_with_user):
    response = logged_client.patch(f'/api/short/{url_with_user.short_url}', json={'short_url': 'new_shorturl'})

    assert response.status_code == 200
    assert response.json()['short_url'] == 'new_shorturl'

def test_delete_short_url_with_invalid_user(client_with_invalid_user):
    response = client_with_invalid_user.delete('/api/short/teste')

    assert response.status_code == 401
    assert response.json()['detail'] == 'You must be logged in to access this resource'

def test_delete_short_url_with_non_existent_link(logged_client):
    response = logged_client.delete('/api/short/teste')

    assert response.status_code == 404
    assert response.json()['detail'] == 'Link not found'

def test_delete_short_url_success(logged_client, url_with_user):
    response = logged_client.delete(f'/api/short/{url_with_user.short_url}')

    assert response.status_code == 200
    assert response.json() == {'message': 'URL deleted successfully'}
