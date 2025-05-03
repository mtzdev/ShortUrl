import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
