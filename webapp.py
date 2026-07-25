"""
Recipe database — web app
--------------------------
A Flask front end over recipe_db.py's SQLite storage. Recipes can be
entered manually or created by scraping a URL with recipe_scraper.py;
both paths land on the same edit form before saving.

Run:
    python webapp.py

Then open http://localhost:5000 on this machine, or http://<this-pc's-LAN-ip>:5000
from another device on the same network.
"""

from flask import Flask, redirect, render_template, request, url_for

import recipe_db
from recipe_scraper import RecipeExtractionError, extract_recipe

app = Flask(__name__)


def _lines_to_list(text):
    return [line.strip() for line in text.splitlines() if line.strip()]


def _form_to_recipe_data(form):
    return {
        "title": form.get("title", ""),
        "image": form.get("image", ""),
        "author": form.get("author", ""),
        "yield_": form.get("yield_", ""),
        "prep_time": form.get("prep_time", ""),
        "cook_time": form.get("cook_time", ""),
        "total_time": form.get("total_time", ""),
        "description": form.get("description", ""),
        "ingredients": _lines_to_list(form.get("ingredients", "")),
        "instructions": _lines_to_list(form.get("instructions", "")),
        "source_url": form.get("source_url", ""),
    }


@app.route("/")
def index():
    search = request.args.get("q", "").strip()
    recipes = recipe_db.list_recipes(search)
    return render_template("index.html", recipes=recipes, search=search)


@app.route("/recipe/<int:recipe_id>")
def view_recipe(recipe_id):
    recipe = recipe_db.get_recipe(recipe_id)
    if recipe is None:
        return render_template("404.html", recipe_id=recipe_id), 404
    return render_template("recipe_detail.html", recipe=recipe)


@app.route("/new", methods=["GET", "POST"])
def new_recipe():
    if request.method == "POST":
        data = _form_to_recipe_data(request.form)
        recipe_id = recipe_db.create_recipe(data)
        return redirect(url_for("view_recipe", recipe_id=recipe_id))
    return render_template("recipe_form.html", recipe=None, form_action=url_for("new_recipe"))


@app.route("/new/scrape", methods=["GET", "POST"])
def scrape_recipe():
    if request.method == "POST":
        url = request.form.get("url", "").strip()
        if url and not url.lower().startswith(("http://", "https://")):
            url = "https://" + url
        try:
            scraped = extract_recipe(url)
        except RecipeExtractionError as e:
            return render_template("scrape.html", error=str(e), url=url)
        except Exception as e:
            return render_template("scrape.html", error=f"Unexpected error: {e}", url=url)

        prefill = {
            "title": scraped.title,
            "image": scraped.image,
            "author": scraped.author,
            "yield_": scraped.yield_,
            "prep_time": scraped.prep_time,
            "cook_time": scraped.cook_time,
            "total_time": scraped.total_time,
            "description": scraped.description,
            "ingredients": scraped.ingredients,
            "instructions": scraped.instructions,
            "source_url": scraped.source_url,
        }
        return render_template(
            "recipe_form.html", recipe=prefill, form_action=url_for("new_recipe")
        )
    return render_template("scrape.html", error=None, url="")


@app.route("/recipe/<int:recipe_id>/edit", methods=["GET", "POST"])
def edit_recipe(recipe_id):
    recipe = recipe_db.get_recipe(recipe_id)
    if recipe is None:
        return render_template("404.html", recipe_id=recipe_id), 404
    if request.method == "POST":
        data = _form_to_recipe_data(request.form)
        recipe_db.update_recipe(recipe_id, data)
        return redirect(url_for("view_recipe", recipe_id=recipe_id))
    return render_template(
        "recipe_form.html", recipe=recipe, form_action=url_for("edit_recipe", recipe_id=recipe_id)
    )


@app.route("/recipe/<int:recipe_id>/delete", methods=["POST"])
def delete_recipe(recipe_id):
    recipe_db.delete_recipe(recipe_id)
    return redirect(url_for("index"))


if __name__ == "__main__":
    recipe_db.init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
