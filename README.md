# Recipe Box

A local recipe database with a web GUI. Recipes live in a single SQLite
file (`recipes.db`) and can be added by pasting a URL (auto-scraped) or
by typing them in manually.

## Setup

```bash
pip install -r requirements.txt
```

## Run

```bash
python webapp.py
```

Then open **http://localhost:5000** in a browser on this machine.

To reach it from another device on the same network (phone, tablet,
another PC), find this machine's LAN IP (the server prints it on
startup, e.g. `http://192.168.1.232:5000`) and open that address on the
other device — no separate deployment needed, since it's the same
process and the same `recipes.db` file.

Stop the server with `Ctrl+C`.

## Data

Everything is stored in `recipes.db` in this folder (ignored by git).
Back it up or copy it elsewhere to move your recipes to another machine.

## Features

- Browse/search recipes by title or ingredient (`/`)
- Add a recipe manually (`/new`)
- Import a recipe from a URL — reuses `recipe_scraper.py`'s schema.org
  extraction, then opens an editable preview before saving (`/new/scrape`)
- Edit or delete any saved recipe
- Tag recipes with a cuisine (grouped and filterable on the home page) and
  any number of free-form tags (e.g. "vegetarian, quick, dessert")

`recipe_scraper.py` and `recipe_scraper_gui.py` (the standalone Tkinter
scraper) are unchanged and still work independently of this app.
