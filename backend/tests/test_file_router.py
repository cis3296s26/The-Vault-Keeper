# GET /
def test_read_files_returns_no_files_on_fresh_start(client):
    response = client.get("/api/files/")
    assert response.status_code == 200
    assert response.json() == []

def test_read_files_search_filter(client):
    client.post("/api/files/upload", files={"file": ("test1.txt", b"test1 content", "text/plain")})
    client.post("/api/files/upload", files={"file": ("test2.txt", b"test2 content", "text/plain")})
    response = client.get("/api/files/?search=test2")
    results = response.json()
    assert len(results) == 1
    assert results[0]["name"] == "test2.txt"

def test_read_files_sort(client):
    file_names = ["a.txt", "b.txt", "c.txt", "d.txt", "e.txt", "f.txt"]
    client.post("/api/files/upload", files={"file": (f"{file_names[2]}", b"test1 content", "text/plain")})
    client.post("/api/files/upload", files={"file": (f"{file_names[3]}", b"test2 content", "text/plain")})
    client.post("/api/files/upload", files={"file": (f"{file_names[1]}", b"test1 content", "text/plain")})
    client.post("/api/files/upload", files={"file": (f"{file_names[4]}", b"test2 content", "text/plain")})
    client.post("/api/files/upload", files={"file": (f"{file_names[5]}", b"test1 content", "text/plain")})
    client.post("/api/files/upload", files={"file": (f"{file_names[0]}", b"test2 content", "text/plain")})
    response = client.get("/api/files/?sort_by=name&order=ascending")
    names = [f["name"] for f in response.json()]
    assert names == sorted(file_names)

# POST /upload
def test_upload_returns_file_model(client):
    response = client.post(
        "/api/files/upload",
        files={"file": ("test_file.txt", b"test_file content", "text/plain")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "test_file.txt"
    assert "id" in data
    assert "r2_key" in data

def test_upload_metadata_persists_in_db(client):
    client.post("/api/files/upload", files={"file": ("i_persist.txt", b"my data persists", "text/plain")})
    response = client.get("/api/files/")
    names = [f["name"] for f in response.json()]
    assert "i_persist.txt" in names

# GET /view/{file_id}
def test_view_file_returns_url(client):
    upload = client.post(
        "/api/files/upload",
        files={"file": ("test_img.png", b"picture of cat on swing", "image/png")},
    ).json()
    response = client.get(f"/api/files/view/{upload['id']}")
    assert response.status_code == 200
    assert "url" in response.json()

def test_view_nonexistent_file_returns_404(client):
    response = client.get("/api/files/view/12345")
    assert response.status_code == 404

# GET /download/{file_key}
def test_download_existing_file(client):
    upload = client.post(
        "/api/files/upload",
        files={"file": ("download_me.txt", b"content", "text/plain")},
    ).json()
    response = client.get(f"/api/files/download/{upload['r2_key']}")
    assert response.status_code == 200

def test_download_nonexistent_file_returns_404(client):
    response = client.get("/api/files/download/nonexistent_key.txt")
    assert response.status_code == 404

# DELETE /{file_id}
def test_delete_file_returns_200(client):
    upload = client.post(
        "/api/files/upload",
        files={"file": ("delete_me.txt", b"I must be deleted", "text/plain")},
    ).json()
    response = client.delete(f"/api/files/{upload['id']}")
    assert response.status_code == 200

def test_delete_file_removes_from_db(client):
    upload = client.post(
        "/api/files/upload",
        files={"file": ("delete_me2.txt", b"I must be deleted again", "text/plain")},
    ).json()
    client.delete(f"/api/files/{upload['id']}")
    files = client.get("/api/files/").json()
    ids = [f["id"] for f in files]
    assert upload["id"] not in ids

def test_delete_nonexistent_file_returns_404(client):
    response = client.delete("/api/files/12345")
    assert response.status_code == 404