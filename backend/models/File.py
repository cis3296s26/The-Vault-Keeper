from datetime import datetime
from sqlmodel import Field, SQLModel

class File(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    size: int | None
    r2_key: str
    created_at: datetime = Field(default_factory=datetime.utcnow)