import os
import uuid
import shutil

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def upload_file(file, filename: str) -> str:
    file_key = f"{uuid.uuid4()}_{filename}"
    dest = os.path.join(UPLOAD_DIR, file_key)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file, f)
    return file_key

def get_file_path(file_key: str) -> str:
    return os.path.join(UPLOAD_DIR, file_key)

def delete_file(file_key: str):
    path = os.path.join(UPLOAD_DIR, file_key)
    if os.path.exists(path):
        os.remove(path)