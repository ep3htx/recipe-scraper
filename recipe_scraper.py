"""
Recipe Scraper — core logic
----------------------------
Given a recipe URL, fetches the page and extracts a structured recipe
(title, image, times, yield, ingredients, instructions).

Most recipe sites embed a schema.org/Recipe object as JSON-LD, which is
what nearly every recipe plugin (WordPress Recipe Card, Tasty Recipes,
WP Recipe Maker, etc.) outputs for SEO/rich-snippet purposes. That is the
primary extraction path here, with a microdata fallback for older sites.

Run standalone for a quick CLI check:
    python recipe_scraper.py <url>
"""

import html
import json
import re
from dataclasses import dataclass, field

import requests
from bs4 import BeautifulSoup

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)


class RecipeExtractionError(Exception):
    pass


@dataclass
class Recipe:
    title: str = ""
    image: str = ""
    author: str = ""
    yield_: str = ""
    prep_time: str = ""
    cook_time: str = ""
    total_time: str = ""
    description: str = ""
    ingredients: list = field(default_factory=list)
    instructions: list = field(default_factory=list)
    source_url: str = ""

    def to_text(self):
        lines = [self.title or "Recipe", "=" * len(self.title or "Recipe"), ""]
        if self.description:
            lines += [self.description, ""]
        meta = []
        if self.yield_:
            meta.append(f"Yield: {self.yield_}")
        if self.prep_time:
            meta.append(f"Prep: {self.prep_time}")
        if self.cook_time:
            meta.append(f"Cook: {self.cook_time}")
        if self.total_time:
            meta.append(f"Total: {self.total_time}")
        if meta:
            lines += [" | ".join(meta), ""]

        lines.append("Ingredients:")
        for ing in self.ingredients:
            lines.append(f"  - {ing}")
        lines.append("")

        lines.append("Instructions:")
        for i, step in enumerate(self.instructions, 1):
            lines.append(f"  {i}. {step}")

        if self.source_url:
            lines += ["", f"Source: {self.source_url}"]
        return "\n".join(lines)


def fetch_html(url):
    resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=15)
    resp.raise_for_status()
    # Let BeautifulSoup's encoding detection (meta tags, BOM, etc.) take over
    # rather than trusting requests' guess, which is often wrong for pages
    # that don't set a charset in the Content-Type header.
    return resp.content


def _clean_text(value):
    if value is None:
        return ""
    if isinstance(value, list):
        return " ".join(_clean_text(v) for v in value)
    if isinstance(value, dict):
        return _clean_text(value.get("name") or value.get("text") or "")
    text = str(value)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _iso8601_duration_to_human(duration):
    if not duration:
        return ""
    match = re.match(
        r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?", str(duration)
    )
    if not match:
        return str(duration)
    days, hours, minutes = match.groups()
    parts = []
    if days:
        parts.append(f"{days}d")
    if hours:
        parts.append(f"{hours}h")
    if minutes:
        parts.append(f"{minutes}m")
    return " ".join(parts) if parts else str(duration)


def _instructions_from_field(value):
    steps = []
    if value is None:
        return steps
    if isinstance(value, str):
        # Some sites cram all steps into one newline-separated string.
        for line in re.split(r"\n+", value):
            line = _clean_text(line)
            if line:
                steps.append(line)
        return steps
    if isinstance(value, dict):
        value = [value]
    if isinstance(value, list):
        for item in value:
            if isinstance(item, dict):
                item_type = item.get("@type", "")
                if item_type == "HowToSection":
                    section_name = _clean_text(item.get("name"))
                    sub_steps = _instructions_from_field(item.get("itemListElement"))
                    if section_name:
                        steps.append(f"[{section_name}]")
                    steps.extend(sub_steps)
                else:
                    text = _clean_text(item.get("text") or item.get("name"))
                    if text:
                        steps.append(text)
            else:
                text = _clean_text(item)
                if text:
                    steps.append(text)
    return steps


def _find_recipe_node(data):
    """Search a parsed JSON-LD object (or list/@graph) for a Recipe node."""
    if isinstance(data, dict):
        types = data.get("@type")
        types = [types] if isinstance(types, str) else (types or [])
        if any(t == "Recipe" for t in types):
            return data
        if "@graph" in data:
            found = _find_recipe_node(data["@graph"])
            if found:
                return found
    elif isinstance(data, list):
        for item in data:
            found = _find_recipe_node(item)
            if found:
                return found
    return None


def _recipe_from_jsonld(soup, url):
    for tag in soup.find_all("script", type="application/ld+json"):
        if not tag.string:
            continue
        try:
            data = json.loads(tag.string)
        except (json.JSONDecodeError, TypeError):
            continue
        node = _find_recipe_node(data)
        if not node:
            continue

        image = node.get("image")
        if isinstance(image, dict):
            image = image.get("url", "")
        elif isinstance(image, list) and image:
            image = image[0] if isinstance(image[0], str) else image[0].get("url", "")
        elif not isinstance(image, str):
            image = ""

        ingredients = node.get("recipeIngredient") or node.get("ingredients") or []
        if isinstance(ingredients, str):
            ingredients = [ingredients]
        ingredients = [_clean_text(i) for i in ingredients if _clean_text(i)]

        instructions = _instructions_from_field(node.get("recipeInstructions"))

        recipe_yield = node.get("recipeYield") or ""
        if isinstance(recipe_yield, list):
            recipe_yield = recipe_yield[0] if recipe_yield else ""

        return Recipe(
            title=_clean_text(node.get("name")),
            image=image or "",
            author=_clean_text(node.get("author")),
            yield_=_clean_text(recipe_yield),
            prep_time=_iso8601_duration_to_human(node.get("prepTime")),
            cook_time=_iso8601_duration_to_human(node.get("cookTime")),
            total_time=_iso8601_duration_to_human(node.get("totalTime")),
            description=_clean_text(node.get("description")),
            ingredients=ingredients,
            instructions=instructions,
            source_url=url,
        )
    return None


def _recipe_from_microdata(soup, url):
    scope = soup.find(attrs={"itemtype": re.compile(r"schema\.org/Recipe$", re.I)})
    if not scope:
        return None

    def prop(name):
        el = scope.find(attrs={"itemprop": name})
        if not el:
            return ""
        return _clean_text(el.get("content") or el.get_text())

    ingredients = [
        _clean_text(el.get_text())
        for el in scope.find_all(attrs={"itemprop": re.compile(r"^ingredients?$", re.I)})
    ]
    ingredients = [i for i in ingredients if i]

    instructions = [
        _clean_text(el.get_text())
        for el in scope.find_all(attrs={"itemprop": re.compile(r"^recipeInstructions?$", re.I)})
    ]
    instructions = [i for i in instructions if i]

    if not ingredients and not instructions:
        return None

    return Recipe(
        title=prop("name"),
        image="",
        author=prop("author"),
        yield_=prop("recipeYield"),
        prep_time=prop("prepTime"),
        cook_time=prop("cookTime"),
        total_time=prop("totalTime"),
        description=prop("description"),
        ingredients=ingredients,
        instructions=instructions,
        source_url=url,
    )


def extract_recipe(url):
    """Fetch the URL and return a Recipe. Raises RecipeExtractionError on failure."""
    try:
        page_content = fetch_html(url)
    except requests.RequestException as e:
        raise RecipeExtractionError(f"Could not fetch the page: {e}") from e

    soup = BeautifulSoup(page_content, "html.parser")

    recipe = _recipe_from_jsonld(soup, url)
    if recipe is None:
        recipe = _recipe_from_microdata(soup, url)

    if recipe is None:
        raise RecipeExtractionError(
            "No recipe data found on this page (no schema.org Recipe markup detected)."
        )
    if not recipe.ingredients and not recipe.instructions:
        raise RecipeExtractionError(
            "Recipe markup was found but no ingredients or instructions could be parsed."
        )

    if not recipe.title:
        title_tag = soup.find("title")
        recipe.title = _clean_text(title_tag.get_text()) if title_tag else "Recipe"

    return recipe


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python recipe_scraper.py <recipe_url>")
        sys.exit(1)

    try:
        r = extract_recipe(sys.argv[1])
        print(r.to_text())
    except RecipeExtractionError as e:
        print(f"Error: {e}")
        sys.exit(1)
