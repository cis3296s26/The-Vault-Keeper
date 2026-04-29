import os
import pytest
from services import storage

@pytest.fixture(autouse=True)
def create_test_storage_temp_dir(tmp_path, monkeypatch):
    # Redirects upload path from the users folder
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path))
    storage.UPLOAD_DIR = str(tmp_path)
    return tmp_path

def test_upload_file_returns_key():
    file = open("tests/assets/Test.pdf", "rb")
    key = storage.upload_file(file, "Test.pdf")
    file.close()
    assert "Test.pdf" in key

def test_upload_file_creates_file_on_disk():
    file = open("tests/assets/Test.pdf", "rb")
    key = storage.upload_file(file, "Test.pdf")
    file.close()
    path = storage.get_file_path(key)
    assert os.path.exists(path)

def test_get_file_path_returns_correct_path():
    path = storage.get_file_path("Test.pdf")
    assert path.endswith("Test.pdf")

def test_delete_file_removes_from_disk():
    file = open("tests/assets/Test.pdf", "rb")
    key = storage.upload_file(file, "Test.pdf")
    file.close()
    storage.delete_file(key)
    assert not os.path.exists(storage.get_file_path(key))

def test_delete_file_nonexistent_does_not_error():
    # Should silently do nothing, not crash
    storage.delete_file("Test.pdf")