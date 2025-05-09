import re
import string
from random import choices
from src.db.models import Link

def validate_short_url(short_url: str | None, db = None):
    if not short_url or short_url.strip() == "":
        return generate_short_url(db)

    if not re.fullmatch(r"^[a-zA-Z0-9_-]{3,16}$", short_url):
        return False

    return short_url

def generate_short_url(db):
    chars = string.ascii_letters + string.digits
    while True:
        short_url = ''.join(choices(chars, k=8))

        if not db.query(Link).filter(Link.short_url == short_url).first():
            db.close()
            return short_url