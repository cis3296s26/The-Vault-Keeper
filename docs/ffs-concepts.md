# Concepts You Need for File Filtering & Sorting (FFS)

This document covers exactly what you need to understand to implement FFS in The Vault Keeper.
It assumes you know Python, Java, or C, but have never built a web backend before.

---

## The Big Picture First

You are used to programs that run in a terminal — you type something, the program responds.

A web backend works the same way, just over a network instead of a terminal:

```
Terminal program:          Web backend (FastAPI):
  You type a command   →     Browser/React sends a URL
  Program reads input  →     FastAPI reads the URL
  Program runs logic   →     FastAPI runs a function
  Program prints output →    FastAPI sends back JSON text
```

When you run `read_files()` in FastAPI, it is exactly like a function in a terminal program.
The difference is: **the URL IS the input**, and **JSON IS the output** (instead of `print()`).

---

## Concept 1 — FastAPI Query Parameters

### What is a URL query parameter?

You have seen URLs like this:

```
https://www.google.com/search?q=python+tutorial&lang=en
```

The part after `?` is called the **query string**. It is a list of key=value pairs separated by `&`.

- `q=python+tutorial` → key is `q`, value is `python tutorial`
- `lang=en` → key is `lang`, value is `en`

In your project, when React wants a sorted list of files, it will call:

```
http://localhost:8000/api/files/?sort_by=name&order=asc&search=report
```

- `sort_by=name` → sort by filename
- `order=asc` → ascending order (A → Z)
- `search=report` → only show files whose name contains "report"

### How FastAPI reads them

In a terminal program, you might read user input like this:

```python
sort_by = input("Sort by: ")
```

In FastAPI, you declare the parameters directly in the function signature:

```python
@router.get("/")
def read_files(sort_by: str = "created_at", order: str = "desc", search: str = ""):
    ...
```

FastAPI automatically reads the URL query string and fills in those variables.
If the caller does not include `?sort_by=...`, FastAPI uses the default value you specified.

So these two are equivalent in behavior:

```
Terminal:   user types "created_at"   →  sort_by = "created_at"
FastAPI:    URL has ?sort_by=name     →  sort_by = "name"
FastAPI:    URL has nothing           →  sort_by = "created_at"  (uses default)
```

### The current function signature (what is already there)

In `backend/routes/file_router.py`, the function currently looks like:

```python
def read_files(
    session: SessionDep,       # database connection (ignore this for now)
    offset: int = 0,           # skip first N results (for pagination)
    limit: int = 100,          # max results to return
) -> list[FileModel]:
```

You will add `sort_by`, `order`, and `search` to this list.
FastAPI treats any simple parameter with a default value as a query parameter automatically.

---

## Concept 2 — The File Model (Your Data Structure)

### What is a model?

In Java or C, if you wanted to represent a file record, you would write a struct or class:

```c
// C
struct File {
    int id;
    char name[256];
    int size;
    char r2_key[512];
    // created_at ...
};
```

In this project, `backend/models/File.py` does the same thing:

```python
class File(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    size: int | None
    r2_key: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

Each field maps directly to a **column in the database table**:

| Python field  | Database column | Type     | What it stores                         |
|---------------|-----------------|----------|----------------------------------------|
| `id`          | id              | integer  | Auto-assigned unique number per file   |
| `name`        | name            | text     | The filename ("report.pdf")            |
| `size`        | size            | integer  | File size in bytes                     |
| `r2_key`      | r2_key          | text     | Where the file lives in cloud storage  |
| `created_at`  | created_at      | datetime | When the file was uploaded             |

### Why this matters for FFS

These are the **only columns you can sort or filter by**, because they are the only data stored.
For FFS you will use: `name`, `size`, and `created_at`.

---

## Concept 3 — SQLModel Query Building

### What is a database query?

You know how to loop through a list in Python:

```python
files = [file1, file2, file3, file4, file5]

# Filter manually
results = [f for f in files if "report" in f.name]

# Sort manually
results.sort(key=lambda f: f.name)
```

A **database query** does the same thing, but inside the database engine, which is much faster
and does not require loading all rows into memory first.

The language for querying databases is called **SQL**. A typical SQL query looks like:

```sql
SELECT * FROM file WHERE name LIKE '%report%' ORDER BY name ASC;
```

Reading it like English:
- `SELECT *` → give me all columns
- `FROM file` → from the file table
- `WHERE name LIKE '%report%'` → only rows where the name contains "report"
- `ORDER BY name ASC` → sorted by name, A to Z

### SQLModel: Writing SQL in Python

SQLModel lets you write those same queries in Python syntax instead of raw SQL text.
This is safer (prevents SQL injection) and feels more natural in Python code.

Here is the direct translation:

```sql
-- Raw SQL:
SELECT * FROM file WHERE name LIKE '%report%' ORDER BY name ASC LIMIT 100;
```

```python
# SQLModel equivalent:
query = select(FileModel)
query = query.where(FileModel.name.contains("report"))
query = query.order_by(FileModel.name.asc())
query = query.limit(100)
results = session.exec(query).all()
```

Each line builds up the query like stacking LEGO bricks. Nothing runs until `session.exec(query)`.

### The building blocks you need

**Filtering with `.where()`**

```python
# Only files whose name contains the search string
query = query.where(FileModel.name.contains(search))
```

`.contains("report")` translates to SQL `LIKE '%report%'`.
If `search` is empty (`""`), skip adding `.where()` entirely — no filter needed.

**Sorting with `.order_by()`**

```python
# Ascending (A → Z, small → large, oldest → newest)
query = query.order_by(FileModel.name.asc())

# Descending (Z → A, large → small, newest → oldest)
query = query.order_by(FileModel.name.desc())
```

**Choosing which column to sort by**

The user will pass `sort_by="name"` or `sort_by="size"` as a string.
You need to convert that string into an actual column reference:

```python
# Map the string the user sends to the actual model field
sort_column_map = {
    "name":       FileModel.name,
    "size":       FileModel.size,
    "created_at": FileModel.created_at,
}

# Look up the column, fall back to created_at if the user sends garbage
col = sort_column_map.get(sort_by, FileModel.created_at)

# Apply direction
if order == "desc":
    query = query.order_by(col.desc())
else:
    query = query.order_by(col.asc())
```

The dictionary lookup replaces a big if/elif chain and also serves as a **whitelist** —
if someone sends `sort_by=DROP TABLE file`, it gets ignored and falls back to the default.

**Executing the query**

```python
results = session.exec(query).all()
```

- `session` = the database connection (FastAPI injects this automatically via `SessionDep`)
- `.exec(query)` = run the query
- `.all()` = return all matching rows as a Python list of `File` objects

---

## Putting It All Together

Here is the full FFS version of `read_files`, annotated:

```python
@router.get("/")
def read_files(
    session: SessionDep,
    offset: int = 0,
    limit: Annotated[int, Query(le=100)] = 100,
    sort_by: str = "created_at",   # new: which column to sort
    order: str = "desc",           # new: asc or desc
    search: str = "",              # new: filter by filename
) -> list[FileModel]:

    # Start with "SELECT * FROM file"
    query = select(FileModel)

    # Add WHERE clause only if the user provided a search term
    if search:
        query = query.where(FileModel.name.contains(search))

    # Map the sort_by string to an actual column (also acts as whitelist)
    sort_column_map = {
        "name":       FileModel.name,
        "size":       FileModel.size,
        "created_at": FileModel.created_at,
    }
    col = sort_column_map.get(sort_by, FileModel.created_at)

    # Apply sort direction
    if order == "desc":
        query = query.order_by(col.desc())
    else:
        query = query.order_by(col.asc())

    # Apply pagination (same as before)
    query = query.offset(offset).limit(limit)

    # Run it and return the list
    return session.exec(query).all()
```

---

## How to Test It Without a Frontend

FastAPI generates an interactive test page automatically.
Once the server is running, open your browser and go to:

```
http://localhost:8000/docs
```

You will see every route listed. Click `GET /api/files/`, then "Try it out", fill in
`sort_by`, `order`, and `search`, and click Execute. It shows you the exact URL it built
and the JSON response. This is your primary debugging tool — use it before touching React.

---

## Summary

| Concept | What it is | Your role |
|---|---|---|
| Query parameters | Key=value pairs in the URL after `?` | Declare them in the function signature; FastAPI fills them in |
| `File` model | Python class whose fields = database columns | Know which fields exist (`name`, `size`, `created_at`) |
| `select(FileModel)` | Starts a "give me all files" query | Chain `.where()` and `.order_by()` onto it |
| `.where(col.contains(x))` | Filters rows by a value | Only added when `search` is not empty |
| `.order_by(col.asc() / .desc())` | Sorts results | Uses the column map to convert string → column |
| `session.exec(query).all()` | Runs the query and returns results | Always the last line |