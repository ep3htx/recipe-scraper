"""
Recipe Scraper — GUI
---------------------
Paste a recipe URL, fetch it, and view the extracted title, ingredients,
and instructions. Supports copying the result or saving it as a text file.

Run:
    python recipe_scraper_gui.py
"""

import threading
import tkinter as tk
from tkinter import ttk, messagebox, filedialog

from recipe_scraper import extract_recipe, RecipeExtractionError


class RecipeScraperApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Recipe Scraper")
        self.geometry("700x620")
        self.minsize(560, 480)

        style = ttk.Style(self)
        try:
            style.theme_use("vista")
        except tk.TclError:
            pass

        self.current_recipe = None

        main = ttk.Frame(self, padding=12)
        main.pack(fill="both", expand=True)

        top = ttk.Frame(main)
        top.pack(fill="x", pady=(0, 10))
        ttk.Label(top, text="Recipe URL:").pack(side="left")

        self.url_var = tk.StringVar()
        self.url_entry = ttk.Entry(top, textvariable=self.url_var)
        self.url_entry.pack(side="left", fill="x", expand=True, padx=(6, 6))
        self.url_entry.bind("<Return>", lambda e: self.fetch())

        self.fetch_btn = ttk.Button(top, text="Fetch Recipe", command=self.fetch)
        self.fetch_btn.pack(side="left")

        self.status_var = tk.StringVar(value="Paste a URL and click Fetch Recipe.")
        ttk.Label(main, textvariable=self.status_var, foreground="gray").pack(
            anchor="w", pady=(0, 8)
        )

        self.output = tk.Text(main, wrap="word", state="disabled")
        self.output.pack(fill="both", expand=True)
        self.output.tag_configure("title", font=("", 12, "bold"))
        self.output.tag_configure("heading", font=("", 10, "bold"))

        bottom = ttk.Frame(main)
        bottom.pack(fill="x", pady=(8, 0))
        self.copy_btn = ttk.Button(bottom, text="Copy to Clipboard", command=self.copy_to_clipboard)
        self.copy_btn.pack(side="left")
        self.save_btn = ttk.Button(bottom, text="Save to File...", command=self.save_to_file)
        self.save_btn.pack(side="left", padx=6)
        self.copy_btn.state(["disabled"])
        self.save_btn.state(["disabled"])

    def fetch(self):
        url = self.url_var.get().strip()
        if not url:
            messagebox.showerror("Error", "Please paste a recipe URL first.")
            return
        if not url.lower().startswith(("http://", "https://")):
            url = "https://" + url

        self.fetch_btn.state(["disabled"])
        self.copy_btn.state(["disabled"])
        self.save_btn.state(["disabled"])
        self.status_var.set("Fetching and parsing recipe...")
        self.set_output("")

        thread = threading.Thread(target=self._fetch_worker, args=(url,), daemon=True)
        thread.start()

    def _fetch_worker(self, url):
        try:
            recipe = extract_recipe(url)
            self.after(0, self._on_fetch_success, recipe)
        except RecipeExtractionError as e:
            self.after(0, self._on_fetch_error, str(e))
        except Exception as e:
            self.after(0, self._on_fetch_error, f"Unexpected error: {e}")

    def _on_fetch_success(self, recipe):
        self.current_recipe = recipe
        self.render_recipe(recipe)
        self.status_var.set(f"Loaded: {recipe.title}")
        self.fetch_btn.state(["!disabled"])
        self.copy_btn.state(["!disabled"])
        self.save_btn.state(["!disabled"])

    def _on_fetch_error(self, message):
        self.current_recipe = None
        self.status_var.set("Failed to extract recipe.")
        self.set_output(f"Error: {message}")
        self.fetch_btn.state(["!disabled"])

    def set_output(self, text):
        self.output.config(state="normal")
        self.output.delete("1.0", "end")
        self.output.insert("end", text)
        self.output.config(state="disabled")

    def render_recipe(self, recipe):
        self.output.config(state="normal")
        self.output.delete("1.0", "end")

        self.output.insert("end", f"{recipe.title}\n", "title")

        meta = []
        if recipe.yield_:
            meta.append(f"Yield: {recipe.yield_}")
        if recipe.prep_time:
            meta.append(f"Prep: {recipe.prep_time}")
        if recipe.cook_time:
            meta.append(f"Cook: {recipe.cook_time}")
        if recipe.total_time:
            meta.append(f"Total: {recipe.total_time}")
        if meta:
            self.output.insert("end", "   |   ".join(meta) + "\n")

        if recipe.description:
            self.output.insert("end", f"\n{recipe.description}\n")

        self.output.insert("end", "\nIngredients\n", "heading")
        for ing in recipe.ingredients:
            self.output.insert("end", f"  • {ing}\n")

        self.output.insert("end", "\nInstructions\n", "heading")
        for i, step in enumerate(recipe.instructions, 1):
            self.output.insert("end", f"  {i}. {step}\n")

        if recipe.source_url:
            self.output.insert("end", f"\nSource: {recipe.source_url}\n")

        self.output.config(state="disabled")

    def copy_to_clipboard(self):
        if not self.current_recipe:
            return
        self.clipboard_clear()
        self.clipboard_append(self.current_recipe.to_text())
        self.status_var.set("Copied recipe to clipboard.")

    def save_to_file(self):
        if not self.current_recipe:
            return
        default_name = (self.current_recipe.title or "recipe").strip().replace("/", "-")
        path = filedialog.asksaveasfilename(
            defaultextension=".txt",
            initialfile=default_name,
            filetypes=[("Text file", "*.txt"), ("All files", "*.*")],
        )
        if not path:
            return
        with open(path, "w", encoding="utf-8") as f:
            f.write(self.current_recipe.to_text())
        self.status_var.set(f"Saved to {path}")


if __name__ == "__main__":
    app = RecipeScraperApp()
    app.mainloop()
