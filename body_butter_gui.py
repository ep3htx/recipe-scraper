"""
Body Butter Formulator — GUI
-----------------------------
A user-friendly Tkinter interface for the body butter formulator.
Lets you edit ingredient percentages, set a batch size, and get live
weight calculations, plus a scent-profile picker with blend suggestions.

Run:
    python body_butter_gui.py
"""

import tkinter as tk
from tkinter import ttk, messagebox

from body_butter import (
    DEFAULT_RECIPE,
    Ingredient,
    normalize,
    calculate_weights,
    SCENT_FAMILIES,
    COMPLEMENTARY_FAMILIES,
    suggest_scent_profile,
    RECOMMENDED_FRAGRANCE_PERCENT,
    to_grams,
    from_grams,
    format_lb_oz,
    lb_oz_to_grams,
)

UNITS = ["g", "oz", "lb", "lb + oz"]


class RecipeTab(ttk.Frame):
    def __init__(self, parent):
        super().__init__(parent, padding=12)
        self.rows = []  # (name_var, pct_var, weight_label)

        top = ttk.Frame(self)
        top.pack(fill="x", pady=(0, 10))
        ttk.Label(top, text="Batch size:").pack(side="left")

        self.batch_var = tk.StringVar(value="500")
        self.batch_entry = ttk.Entry(top, textvariable=self.batch_var, width=10)
        self.batch_entry.pack(side="left", padx=(6, 6))
        self.batch_entry.bind("<KeyRelease>", lambda e: self.recalculate())

        self.lb_var = tk.StringVar(value="0")
        self.oz_var = tk.StringVar(value="0")
        self.lb_entry = ttk.Entry(top, textvariable=self.lb_var, width=5)
        self.lb_label = ttk.Label(top, text="lb")
        self.oz_entry = ttk.Entry(top, textvariable=self.oz_var, width=5)
        self.oz_label = ttk.Label(top, text="oz")
        for w in (self.lb_entry, self.oz_entry):
            w.bind("<KeyRelease>", lambda e: self.recalculate())

        self.unit_var = tk.StringVar(value="g")
        unit_combo = ttk.Combobox(top, textvariable=self.unit_var, values=UNITS,
                                   width=8, state="readonly")
        unit_combo.pack(side="left", padx=(0, 16))
        unit_combo.bind("<<ComboboxSelected>>", lambda e: self.update_unit_mode())

        ttk.Button(top, text="Add Ingredient", command=self.add_row).pack(side="left")
        ttk.Button(top, text="Normalize to 100%", command=self.do_normalize).pack(side="left", padx=6)
        ttk.Button(top, text="Reset to Default", command=self.reset_default).pack(side="left")

        header = ttk.Frame(self)
        header.pack(fill="x")
        ttk.Label(header, text="Ingredient", width=28, font=("", 9, "bold")).pack(side="left")
        ttk.Label(header, text="Percent (%)", width=12, font=("", 9, "bold")).pack(side="left")
        ttk.Label(header, text="Weight", width=14, font=("", 9, "bold")).pack(side="left")
        ttk.Label(header, text="lb / oz", width=14, font=("", 9, "bold")).pack(side="left")

        self.rows_frame = ttk.Frame(self)
        self.rows_frame.pack(fill="both", expand=True, pady=6)

        bottom = ttk.Frame(self)
        bottom.pack(fill="x", pady=(8, 0))
        self.total_label = ttk.Label(bottom, text="", font=("", 10, "bold"))
        self.total_label.pack(side="left")

        self.update_unit_mode()
        self.reset_default()

    def update_unit_mode(self):
        if self.unit_var.get() == "lb + oz":
            self.batch_entry.pack_forget()
            self.lb_entry.pack(side="left", padx=(6, 2))
            self.lb_label.pack(side="left", padx=(0, 6))
            self.oz_entry.pack(side="left", padx=(0, 2))
            self.oz_label.pack(side="left", padx=(0, 6))
        else:
            self.lb_entry.pack_forget()
            self.lb_label.pack_forget()
            self.oz_entry.pack_forget()
            self.oz_label.pack_forget()
            self.batch_entry.pack(side="left", padx=(6, 6))
        self.recalculate()

    def batch_grams(self):
        try:
            if self.unit_var.get() == "lb + oz":
                lb = float(self.lb_var.get() or 0)
                oz = float(self.oz_var.get() or 0)
                return lb_oz_to_grams(lb, oz)
            return to_grams(float(self.batch_var.get() or 0), self.unit_var.get())
        except ValueError:
            return 0.0

    def reset_default(self):
        for child in self.rows_frame.winfo_children():
            child.destroy()
        self.rows = []
        for ing in DEFAULT_RECIPE:
            self.add_row(ing.name, ing.percent)
        self.recalculate()

    def add_row(self, name="", pct=0.0):
        row = ttk.Frame(self.rows_frame)
        row.pack(fill="x", pady=2)

        name_var = tk.StringVar(value=name)
        pct_var = tk.StringVar(value=str(pct))

        name_entry = ttk.Entry(row, textvariable=name_var, width=28)
        name_entry.pack(side="left")

        pct_entry = ttk.Entry(row, textvariable=pct_var, width=12)
        pct_entry.pack(side="left")
        pct_entry.bind("<KeyRelease>", lambda e: self.recalculate())
        name_entry.bind("<KeyRelease>", lambda e: self.recalculate())

        weight_label = ttk.Label(row, text="0.00g", width=14)
        weight_label.pack(side="left")

        lboz_label = ttk.Label(row, text="0.00 oz", width=14)
        lboz_label.pack(side="left")

        remove_btn = ttk.Button(row, text="✕", width=3,
                                 command=lambda: self.remove_row(row))
        remove_btn.pack(side="left", padx=4)

        self.rows.append((row, name_var, pct_var, weight_label, lboz_label))
        self.recalculate()

    def remove_row(self, row_frame):
        self.rows = [r for r in self.rows if r[0] is not row_frame]
        row_frame.destroy()
        self.recalculate()

    def current_recipe(self):
        recipe = []
        for _, name_var, pct_var, *_ in self.rows:
            name = name_var.get().strip()
            try:
                pct = float(pct_var.get())
            except ValueError:
                pct = 0.0
            if name:
                recipe.append(Ingredient(name, pct))
        return recipe

    def do_normalize(self):
        recipe = self.current_recipe()
        if not recipe:
            return
        try:
            normalized = normalize(recipe)
        except ValueError as e:
            messagebox.showerror("Error", str(e))
            return
        for (_, name_var, pct_var, *_), ing in zip(self.rows, normalized):
            pct_var.set(f"{ing.percent:.2f}")
        self.recalculate()

    def recalculate(self):
        unit = self.unit_var.get()
        display_unit = "g" if unit == "lb + oz" else unit
        batch_g = self.batch_grams()

        recipe = self.current_recipe()
        total_pct = sum(i.percent for i in recipe)

        weight_map_g = {i.name: round(i.percent / 100 * batch_g, 2) for i in recipe}
        for _, name_var, _, weight_label, lboz_label in self.rows:
            name = name_var.get().strip()
            grams = weight_map_g.get(name, 0.0)
            weight_label.config(text=f"{from_grams(grams, display_unit):.2f} {display_unit}")
            lboz_label.config(text=format_lb_oz(grams))

        total_weight_g = sum(weight_map_g.values())
        color = "black" if abs(total_pct - 100) < 0.01 else "red"
        self.total_label.config(
            text=(f"Total: {total_pct:.2f}%   {from_grams(total_weight_g, display_unit):.2f} {display_unit}"
                  f"   ({format_lb_oz(total_weight_g)})"),
            foreground=color,
        )


class ScentTab(ttk.Frame):
    def __init__(self, parent):
        super().__init__(parent, padding=12)

        ttk.Label(self, text="Select scent families to blend:", font=("", 10, "bold")).pack(anchor="w")

        self.family_vars = {}
        family_frame = ttk.Frame(self)
        family_frame.pack(fill="x", pady=8)
        cols = 4
        for idx, family in enumerate(SCENT_FAMILIES):
            var = tk.BooleanVar(value=False)
            self.family_vars[family] = var
            cb = ttk.Checkbutton(family_frame, text=family, variable=var,
                                  command=self.update_suggestion)
            cb.grid(row=idx // cols, column=idx % cols, sticky="w", padx=6, pady=3)

        ttk.Separator(self).pack(fill="x", pady=8)

        ttk.Label(self, text="Batch size for fragrance dosing:").pack(anchor="w")
        dose_frame = ttk.Frame(self)
        dose_frame.pack(anchor="w", pady=(0, 8))

        self.batch_var = tk.StringVar(value="500")
        self.batch_entry = ttk.Entry(dose_frame, textvariable=self.batch_var, width=10)
        self.batch_entry.bind("<KeyRelease>", lambda e: self.update_suggestion())

        self.lb_var = tk.StringVar(value="0")
        self.oz_var = tk.StringVar(value="0")
        self.lb_entry = ttk.Entry(dose_frame, textvariable=self.lb_var, width=5)
        self.lb_label = ttk.Label(dose_frame, text="lb")
        self.oz_entry = ttk.Entry(dose_frame, textvariable=self.oz_var, width=5)
        self.oz_label = ttk.Label(dose_frame, text="oz")
        for w in (self.lb_entry, self.oz_entry):
            w.bind("<KeyRelease>", lambda e: self.update_suggestion())

        self.unit_var = tk.StringVar(value="g")
        self.unit_combo = ttk.Combobox(dose_frame, textvariable=self.unit_var, values=UNITS,
                                        width=8, state="readonly")
        self.unit_combo.bind("<<ComboboxSelected>>", lambda e: self.update_unit_mode())

        self.output = tk.Text(self, height=18, wrap="word", state="disabled")
        self.output.pack(fill="both", expand=True)

        self.update_unit_mode()

        self.update_suggestion()

    def update_unit_mode(self):
        if self.unit_var.get() == "lb + oz":
            self.batch_entry.pack_forget()
            self.lb_entry.pack(side="left", padx=(0, 2))
            self.lb_label.pack(side="left", padx=(0, 6))
            self.oz_entry.pack(side="left", padx=(0, 2))
            self.oz_label.pack(side="left", padx=(0, 6))
        else:
            self.lb_entry.pack_forget()
            self.lb_label.pack_forget()
            self.oz_entry.pack_forget()
            self.oz_label.pack_forget()
            self.batch_entry.pack(side="left", padx=(0, 6))
        self.unit_combo.pack(side="left", padx=(6, 0))
        self.update_suggestion()

    def batch_grams(self):
        try:
            if self.unit_var.get() == "lb + oz":
                lb = float(self.lb_var.get() or 0)
                oz = float(self.oz_var.get() or 0)
                return lb_oz_to_grams(lb, oz)
            return to_grams(float(self.batch_var.get() or 0), self.unit_var.get())
        except ValueError:
            return 0.0

    def update_suggestion(self):
        notes = [f for f, v in self.family_vars.items() if v.get()]
        self.output.config(state="normal")
        self.output.delete("1.0", "end")

        if not notes:
            self.output.insert("end", "Select one or more scent families above to see suggestions.\n\n")
            self.output.insert("end", "Available families:\n")
            for family, oils in SCENT_FAMILIES.items():
                self.output.insert("end", f"  • {family}: {', '.join(oils)}\n")
            self.output.config(state="disabled")
            return

        primary, complementary = suggest_scent_profile(notes)

        self.output.insert("end", f"Scent Profile: {' + '.join(notes)}\n\n", "title")
        self.output.insert("end", "Primary oils:\n")
        for family, oils in primary.items():
            self.output.insert("end", f"  • {family}: {', '.join(oils)}\n")

        if complementary:
            self.output.insert("end", "\nComplementary families to round out the blend:\n")
            for family, oils in complementary.items():
                self.output.insert("end", f"  • {family}: {', '.join(oils)}\n")

        unit = self.unit_var.get()
        display_unit = "g" if unit == "lb + oz" else unit
        batch_g = self.batch_grams()
        batch_label = (f"{self.lb_var.get() or 0} lb {self.oz_var.get() or 0} oz"
                       if unit == "lb + oz" else f"{self.batch_var.get() or 0} {unit}")

        lo, hi = RECOMMENDED_FRAGRANCE_PERCENT
        lo_amt = from_grams(batch_g * lo / 100, display_unit)
        hi_amt = from_grams(batch_g * hi / 100, display_unit)
        self.output.insert("end", f"\nRecommended fragrance load: {lo}-{hi}% of batch weight\n")
        self.output.insert(
            "end",
            f"For a {batch_label} batch: {lo_amt:.2f} - {hi_amt:.2f} {display_unit} total oils\n",
        )
        self.output.config(state="disabled")


class BodyButterApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Body Butter Formulator")
        self.geometry("680x560")
        self.minsize(560, 480)

        style = ttk.Style(self)
        try:
            style.theme_use("vista")
        except tk.TclError:
            pass

        notebook = ttk.Notebook(self)
        notebook.pack(fill="both", expand=True)

        recipe_tab = RecipeTab(notebook)
        scent_tab = ScentTab(notebook)

        notebook.add(recipe_tab, text="Recipe Calculator")
        notebook.add(scent_tab, text="Scent Profiles")


if __name__ == "__main__":
    app = BodyButterApp()
    app.mainloop()
