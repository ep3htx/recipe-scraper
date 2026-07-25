"""
Recipe database — SQLite storage shared by the web app.
-----------------------------------------------------------
A single local file (recipes.db) holds every recipe. Ingredients,
instructions, and tags are stored as ordered JSON arrays of strings;
ingredients/instructions mirror the list-of-strings shape
recipe_scraper.Recipe already uses. Cuisine is a single free-text value
used to group/filter the recipe list.
"""

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "recipes.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    image TEXT DEFAULT '',
    author TEXT DEFAULT '',
    yield_ TEXT DEFAULT '',
    prep_time TEXT DEFAULT '',
    cook_time TEXT DEFAULT '',
    total_time TEXT DEFAULT '',
    description TEXT DEFAULT '',
    ingredients TEXT NOT NULL DEFAULT '[]',
    instructions TEXT NOT NULL DEFAULT '[]',
    source_url TEXT DEFAULT '',
    cuisine TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""

# Columns added after the initial release; applied to existing databases
# that predate them so old recipes.db files keep working.
_MIGRATIONS = [
    ("cuisine", "ALTER TABLE recipes ADD COLUMN cuisine TEXT NOT NULL DEFAULT ''"),
    ("tags", "ALTER TABLE recipes ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'"),
]


@contextmanager
def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_connection() as conn:
        conn.execute(SCHEMA)
        existing_columns = {row["name"] for row in conn.execute("PRAGMA table_info(recipes)")}
        for column, statement in _MIGRATIONS:
            if column not in existing_columns:
                conn.execute(statement)


def _row_to_dict(row):
    d = dict(row)
    d["ingredients"] = json.loads(d["ingredients"])
    d["instructions"] = json.loads(d["instructions"])
    d["tags"] = json.loads(d["tags"])
    return d


def list_recipes(search="", tag="", cuisine=""):
    query = "SELECT * FROM recipes"
    clauses = []
    params = []
    if search:
        clauses.append("(title LIKE ? OR ingredients LIKE ?)")
        like = f"%{search}%"
        params += [like, like]
    if tag:
        clauses.append("tags LIKE ?")
        params.append(f'%"{tag}"%')
    if cuisine:
        clauses.append("cuisine = ?")
        params.append(cuisine)
    if clauses:
        query += " WHERE " + " AND ".join(clauses)
    query += " ORDER BY cuisine COLLATE NOCASE, title COLLATE NOCASE"
    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()
    return [_row_to_dict(r) for r in rows]


def list_all_cuisines():
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT DISTINCT cuisine FROM recipes WHERE cuisine != '' ORDER BY cuisine COLLATE NOCASE"
        ).fetchall()
    return [r["cuisine"] for r in rows]


def list_all_tags():
    with get_connection() as conn:
        rows = conn.execute("SELECT tags FROM recipes").fetchall()
    tags = {t for r in rows for t in json.loads(r["tags"])}
    return sorted(tags, key=str.lower)


def get_recipe(recipe_id):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM recipes WHERE id = ?", (recipe_id,)).fetchone()
    return _row_to_dict(row) if row else None


def create_recipe(data):
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO recipes
                (title, image, author, yield_, prep_time, cook_time, total_time,
                 description, ingredients, instructions, source_url, cuisine, tags, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """,
            (
                data.get("title", "").strip() or "Untitled Recipe",
                data.get("image", ""),
                data.get("author", ""),
                data.get("yield_", ""),
                data.get("prep_time", ""),
                data.get("cook_time", ""),
                data.get("total_time", ""),
                data.get("description", ""),
                json.dumps(data.get("ingredients", [])),
                json.dumps(data.get("instructions", [])),
                data.get("source_url", ""),
                data.get("cuisine", ""),
                json.dumps(data.get("tags", [])),
            ),
        )
        return cursor.lastrowid


def update_recipe(recipe_id, data):
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE recipes SET
                title = ?, image = ?, author = ?, yield_ = ?, prep_time = ?,
                cook_time = ?, total_time = ?, description = ?, ingredients = ?,
                instructions = ?, source_url = ?, cuisine = ?, tags = ?,
                updated_at = datetime('now')
            WHERE id = ?
            """,
            (
                data.get("title", "").strip() or "Untitled Recipe",
                data.get("image", ""),
                data.get("author", ""),
                data.get("yield_", ""),
                data.get("prep_time", ""),
                data.get("cook_time", ""),
                data.get("total_time", ""),
                data.get("description", ""),
                json.dumps(data.get("ingredients", [])),
                json.dumps(data.get("instructions", [])),
                data.get("source_url", ""),
                data.get("cuisine", ""),
                json.dumps(data.get("tags", [])),
                recipe_id,
            ),
        )


def delete_recipe(recipe_id):
    with get_connection() as conn:
        conn.execute("DELETE FROM recipes WHERE id = ?", (recipe_id,))
