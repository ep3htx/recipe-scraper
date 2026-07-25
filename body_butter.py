"""
Body Butter Formulator
-----------------------
Calculate ingredient amounts by weight or percentage, scale a recipe to any
batch size, and get scent profile suggestions for essential oil blends.

Usage examples:
    python body_butter.py recipe --batch 500
    python body_butter.py recipe --batch 500 --add "mango butter:35" "cocoa butter:20"
    python body_butter.py scent --notes vanilla floral
    python body_butter.py scent --list
"""

import argparse
import sys
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# Recipe model
# ---------------------------------------------------------------------------

@dataclass
class Ingredient:
    name: str
    percent: float  # share of total batch, 0-100


# ---------------------------------------------------------------------------
# Units
# ---------------------------------------------------------------------------

GRAMS_PER_OZ = 28.3495
GRAMS_PER_LB = 453.592

UNIT_TO_GRAMS = {
    "g": 1.0,
    "oz": GRAMS_PER_OZ,
    "lb": GRAMS_PER_LB,
}


def to_grams(amount: float, unit: str) -> float:
    unit = unit.lower()
    if unit not in UNIT_TO_GRAMS:
        raise ValueError(f"Unknown unit '{unit}'. Use one of: {', '.join(UNIT_TO_GRAMS)}")
    return amount * UNIT_TO_GRAMS[unit]


def from_grams(grams: float, unit: str) -> float:
    unit = unit.lower()
    if unit not in UNIT_TO_GRAMS:
        raise ValueError(f"Unknown unit '{unit}'. Use one of: {', '.join(UNIT_TO_GRAMS)}")
    return grams / UNIT_TO_GRAMS[unit]


def lb_oz_to_grams(lb: float, oz: float) -> float:
    """Combine a pounds + ounces amount (e.g. 2 lb 4 oz) into grams."""
    return lb * GRAMS_PER_LB + oz * GRAMS_PER_OZ


def format_lb_oz(grams: float) -> str:
    """Format a gram amount as 'X lb Y.YY oz' (US kitchen-scale style)."""
    total_oz = from_grams(grams, "oz")
    lb = int(total_oz // 16)
    oz = total_oz - lb * 16
    if lb:
        return f"{lb} lb {oz:.2f} oz"
    return f"{oz:.2f} oz"


# Default body butter base formula (percentages of total batch weight).
# A classic whipped body butter: butters + oils + emulsifier/thickener + extras.
DEFAULT_RECIPE = [
    Ingredient("shea butter", 50.0),
    Ingredient("mango butter", 15.0),
    Ingredient("sweet almond oil", 15.0),
    Ingredient("fractionated coconut oil", 10.0),
    Ingredient("beeswax", 5.0),
    Ingredient("vitamin E oil", 2.0),
    Ingredient("emulsifying wax", 2.0),
    Ingredient("fragrance/essential oil", 1.0),
]


def parse_ingredient_arg(raw: str) -> Ingredient:
    """Parse 'name:percent' into an Ingredient."""
    if ":" not in raw:
        raise ValueError(f"Ingredient '{raw}' must be in 'name:percent' form")
    name, pct = raw.rsplit(":", 1)
    return Ingredient(name.strip(), float(pct))


def build_recipe(overrides):
    """Start from the default recipe, replace or append ingredients by name."""
    recipe = {ing.name: ing.percent for ing in DEFAULT_RECIPE}
    for ing in overrides:
        recipe[ing.name] = ing.percent
    return [Ingredient(n, p) for n, p in recipe.items()]


def normalize(recipe):
    """Rescale percentages so they sum to exactly 100."""
    total = sum(i.percent for i in recipe)
    if total == 0:
        raise ValueError("Total percentage is zero, cannot normalize.")
    return [Ingredient(i.name, i.percent / total * 100) for i in recipe]


def calculate_weights(recipe, batch_size_g):
    """Convert percentages into grams for the given batch size."""
    return [(i.name, i.percent, round(i.percent / 100 * batch_size_g, 2)) for i in recipe]


def print_recipe_table(rows, batch_size_g, unit="g"):
    batch_display = from_grams(batch_size_g, unit)
    print(f"\nBody Butter Recipe — Batch size: {batch_display:.2f} {unit} ({batch_size_g:.2f} g)\n")
    print(f"{'Ingredient':<30}{'Percent':>10}{'Weight (g)':>14}{'Weight (' + unit + ')':>16}{'lb/oz':>16}")
    print("-" * 86)
    for name, pct, grams in rows:
        unit_amount = from_grams(grams, unit)
        print(f"{name:<30}{pct:>9.2f}%{grams:>13.2f}g{unit_amount:>15.2f}{unit}{format_lb_oz(grams):>16}")
    total_pct = sum(r[1] for r in rows)
    total_g = sum(r[2] for r in rows)
    print("-" * 86)
    print(f"{'TOTAL':<30}{total_pct:>9.2f}%{total_g:>13.2f}g{from_grams(total_g, unit):>15.2f}{unit}{format_lb_oz(total_g):>16}\n")


# ---------------------------------------------------------------------------
# Scent profiles
# ---------------------------------------------------------------------------

# Essential oil "families" with a few representative oils each, used to
# build/validate scent profiles and pull complementary suggestions.
SCENT_FAMILIES = {
    "floral":  ["lavender", "rose", "geranium", "ylang ylang", "jasmine"],
    "citrus":  ["sweet orange", "lemon", "grapefruit", "bergamot", "lime"],
    "woody":   ["cedarwood", "sandalwood", "vetiver", "patchouli"],
    "herbal":  ["rosemary", "clary sage", "basil", "peppermint"],
    "spicy":   ["cinnamon", "clove", "ginger", "black pepper"],
    "earthy":  ["patchouli", "vetiver", "frankincense"],
    "vanilla": ["vanilla absolute", "benzoin", "tonka bean"],
    "minty":   ["peppermint", "spearmint", "eucalyptus"],
}

# Classic blending pairings: which families harmonize well together.
COMPLEMENTARY_FAMILIES = {
    "floral":  ["citrus", "woody", "vanilla"],
    "citrus":  ["floral", "spicy", "minty", "woody"],
    "woody":   ["floral", "earthy", "spicy", "vanilla"],
    "herbal":  ["citrus", "minty", "woody"],
    "spicy":   ["citrus", "woody", "vanilla"],
    "earthy":  ["woody", "spicy", "floral"],
    "vanilla": ["floral", "woody", "spicy"],
    "minty":   ["citrus", "herbal"],
}

# Suggested dilution rate for body butter: 1-3% of total fragrance oil by
# weight is the typical safe leave-on cosmetic range.
RECOMMENDED_FRAGRANCE_PERCENT = (1.0, 3.0)


def suggest_scent_profile(notes):
    """
    Given one or more family names (e.g. 'vanilla', 'floral'), return a
    blend suggestion: matched oils plus complementary families/oils.
    """
    notes = [n.lower() for n in notes]
    unknown = [n for n in notes if n not in SCENT_FAMILIES]
    if unknown:
        raise ValueError(
            f"Unknown scent note(s): {', '.join(unknown)}. "
            f"Available: {', '.join(SCENT_FAMILIES)}"
        )

    primary_oils = {n: SCENT_FAMILIES[n] for n in notes}

    complementary = set()
    for n in notes:
        complementary.update(COMPLEMENTARY_FAMILIES.get(n, []))
    complementary -= set(notes)

    complementary_oils = {n: SCENT_FAMILIES[n] for n in complementary}

    return primary_oils, complementary_oils


def print_scent_suggestion(notes, batch_amount=500, unit="g"):
    primary, complementary = suggest_scent_profile(notes)

    print(f"\nScent Profile: {' + '.join(notes)}\n")
    print("Primary oils:")
    for family, oils in primary.items():
        print(f"  {family}: {', '.join(oils)}")

    if complementary:
        print("\nComplementary families to round out the blend:")
        for family, oils in complementary.items():
            print(f"  {family}: {', '.join(oils)}")
    else:
        print("\nNo complementary families found for this combination.")

    lo, hi = RECOMMENDED_FRAGRANCE_PERCENT
    batch_g = to_grams(batch_amount, unit)
    lo_amt = from_grams(batch_g * lo / 100, unit)
    hi_amt = from_grams(batch_g * hi / 100, unit)
    print(f"\nRecommended total fragrance/EO load: {lo}-{hi}% of batch weight")
    print(f"(e.g. for a {batch_amount:g} {unit} batch, that's {lo_amt:.2f}-{hi_amt:.2f} {unit} total oils)\n")


def list_scent_families():
    print("\nAvailable scent families:\n")
    for family, oils in SCENT_FAMILIES.items():
        print(f"  {family:<10} {', '.join(oils)}")
    print()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Body Butter Formulator: recipe weights and scent profiles."
    )
    sub = parser.add_subparsers(dest="command", required=True)

    recipe_p = sub.add_parser("recipe", help="Calculate ingredient amounts for a batch.")
    recipe_p.add_argument("--batch", type=float, required=True, help="Total batch size, in the unit given by --unit.")
    recipe_p.add_argument(
        "--unit", choices=["g", "oz", "lb"], default="g",
        help="Unit for --batch and displayed weights: g (grams), oz (ounces), or lb (pounds). Default: g."
    )
    recipe_p.add_argument(
        "--add", nargs="*", default=[],
        help="Override/add ingredients as 'name:percent', e.g. \"mango butter:35\"."
    )
    recipe_p.add_argument(
        "--no-normalize", action="store_true",
        help="Skip auto-rescaling percentages to total 100%%."
    )

    scent_p = sub.add_parser("scent", help="Get scent profile suggestions.")
    scent_p.add_argument("--notes", nargs="*", default=[], help="Scent families to blend, e.g. vanilla floral.")
    scent_p.add_argument("--list", action="store_true", help="List all available scent families.")
    scent_p.add_argument("--batch", type=float, default=500, help="Batch size for fragrance dosing example.")
    scent_p.add_argument("--unit", choices=["g", "oz", "lb"], default="g", help="Unit for --batch. Default: g.")

    args = parser.parse_args()

    if args.command == "recipe":
        try:
            overrides = [parse_ingredient_arg(a) for a in args.add]
        except ValueError as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)

        recipe = build_recipe(overrides)
        if not args.no_normalize:
            recipe = normalize(recipe)

        batch_g = to_grams(args.batch, args.unit)
        rows = calculate_weights(recipe, batch_g)
        print_recipe_table(rows, batch_g, args.unit)

    elif args.command == "scent":
        if args.list or not args.notes:
            list_scent_families()
            if not args.notes:
                return
        try:
            print_scent_suggestion(args.notes, args.batch, args.unit)
        except ValueError as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
