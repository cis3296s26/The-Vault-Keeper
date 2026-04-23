from typing import Annotated
from fastapi import APIRouter, HTTPException, UploadFile, Query
from fastapi.responses import FileResponse
from models.File import File as FileModel
from sqlmodel import select
from database import SessionDep
from services import storage
import os

router = APIRouter()

@router.get("/")
# Everything up to the : is the function signature (parameters + what to return)
# Assigned value inside the signature = default value. E.g. limit defaults to 100
def read_files(
    session: SessionDep,
    offset: int = 0,
    limit: Annotated[int, Query(le=100)] = 100,

    # New parameters for file filtering and sorting
    sort_by: str = "created_at", # Database column to sort by
    order: str = "descending", # Sorting order (descending or ascending)
    search: str = "", # Filter by file name
) -> list[FileModel]: # Return a list of files from the database (FastAPI converts each FileModel into a JSON)
    
    query = select(FileModel) # Fetch all files from the database
    
    # Filter query; only keep files that match the search string
    if search:
        query = query.where(FileModel.name.contains(search))
    
    # Map the sort_by string (name, size, or created_at) to an actual database column
    sort_by_column_map = {
        "name": FileModel.name,
        "size": FileModel.name,
        "created_at": FileModel.created_at
    }
    # Get the database column that sort_by maps to
    DB_column = sort_by_column_map.get(sort_by, FileModel.created_at)

    # Apply sorting direction to query
    if order == "descending":
        query = query.order_by(DB_column.desc())
    else:
        query = query.order_by(DB_column.asc())

    # Apply offset, limit, and execute the query
    query = query.offset(offset).limit(limit)
    return session.exec(query).all()

@router.post("/upload")
def upload(file: UploadFile, session: SessionDep) -> FileModel:
    file_key = storage.upload_file(file.file, file.filename)
    upload_file = FileModel(name=file.filename, size=file.size, r2_key=file_key)
    session.add(upload_file)
    session.commit()
    session.refresh(upload_file)
    return upload_file

@router.get("/view/{file_id}")
def view_file(file_id: int, session: SessionDep):
    file = session.get(FileModel, file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    # Return a local download URL instead of a presigned R2 URL
    return {"url": f"/api/files/download/{file.r2_key}"}

@router.get("/download/{file_key:path}")
def download_file(file_key: str):
    path = storage.get_file_path(file_key)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    # Extract the original filename (strip the UUID prefix)
    original_name = "_".join(file_key.split("_")[1:])
    return FileResponse(path, filename=original_name)

@router.delete("/{file_id}")
def delete_file(file_id: int, session: SessionDep):
    file = session.get(FileModel, file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    storage.delete_file(file.r2_key)
    session.delete(file)
    session.commit()
    return {"ok": True}