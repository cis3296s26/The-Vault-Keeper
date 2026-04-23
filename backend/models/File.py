from datetime import datetime
from sqlmodel import Field, SQLModel

class File(SQLModel, table=True):
    # File object attributes
    id: int | None = Field(default=None, primary_key=True)
    name: str
    size: int | None
    r2_key: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Fields for password protection
    is_protected: bool = Field(default = False)
    salt: str | None = Field(default=None)   # hex-encoded, 16 bytes
    iv: str | None = Field(default=None)     # hex-encoded, 12 bytes