"""
Recipe database — SQLite storage shared by the web app.
-----------------------------------------------------------
A single local file (recipes.db) holds every recipe. Ingredients and
instructions are stored as ordered JSON arrays of strings, which mirrors
the list-of-strings shape recipe_scraper.Recipe already uses.
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
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


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


def _row_to_dict(row):
    d = dict(row)
    d["ingredients"] = json.loads(d["ingredients"])
    d["instructions"] = json.loads(d["instructions"])
    return d


def list_recipes(search=""):
    query = "SELECT * FROM recipes"
    params = ()
    if search:
        query += " WHERE title LIKE ? OR ingredients LIKE ?"
        like = f"%{search}%"
        params = (like, like)
    query += " ORDER BY title COLLATE NOCASE"
    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()
    return [_row_to_dict(r) for r in rows]


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
                 description, ingredients, instructions, source_url, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
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
                instructions = ?, source_url = ?, updated_at = datetime('now')
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
                recipe_id,
            ),
        )


def delete_recipe(recipe_id):
    with get_connection() as conn:
        conn.execute("DELETE FROM recipes WHERE id = ?", (recipe_id,))
