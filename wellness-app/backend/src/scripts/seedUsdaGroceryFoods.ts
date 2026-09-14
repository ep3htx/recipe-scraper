// Seeds common packaged/grocery foods as global entries (userId: null), same
// convention as seedFoods.ts and seedRestaurantFoods.ts, so meal logging finds
// real branded grocery products instead of only generic placeholders.
//
// Sourced from the USDA FoodData Central (FDC) Branded Foods API
// (https://fdc.nal.usda.gov/), which reports nutrients per 100g. Values here
// were scaled to each product's actual serving size (grams/ml) at import time
// -- i.e. these are per-serving values, not per-100g. Spot-checked a sample
// against known real-world label values (Cheerios, Coca-Cola, Oreo, Jif
// peanut butter, StarKist tuna, etc.) as a sanity check; treat as
// close-enough for day-to-day tracking, not lab-verified. Some items use a
// runner-up or store-brand match where the FDC search didn't cleanly surface
// the expected national brand (noted as such where relevant).
//
// The stored `name` is prefixed with the brand (e.g. "General Mills -
// Cheerios") unless the item name already starts with the brand, so search
// (which only matches on `name`, not `brand`) finds every item for a given
// brand. Safe to re-run: skips any food that already exists by name among
// the global (userId: null) set.
import { prisma } from "../db/prisma";

interface SeedFood {
  name: string;
  brand: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
}

const RAW_FOODS: SeedFood[] = [
  { name: "Cheerios", brand: "General Mills", servingSize: "1 cup (28g)", calories: 100, protein: 4.0, carbs: 21.0, fat: 2.0, fiber: 3.0, sodium: 140 },
  { name: "Honey Nut Cheerios", brand: "General Mills", servingSize: "3/4 cup (28g)", calories: 110, protein: 2.0, carbs: 22.0, fat: 1.5, fiber: 2.0, sodium: 160 },
  { name: "Frosted Flakes", brand: "Kellogg's", servingSize: "3/4 cup (34g)", calories: 124, protein: 1.5, carbs: 30.1, fat: 0.1, fiber: 1.0, sodium: 173 },
  { name: "Cinnamon Toast Crunch", brand: "General Mills", servingSize: "3/4 cup (41g)", calories: 170, protein: 2.0, carbs: 33.0, fat: 4.0, fiber: 3.0, sodium: 230 },
  { name: "Frosted Mini Wheats", brand: "Kellogg's", servingSize: "24 biscuits (59g)", calories: 208, protein: 4.7, carbs: 49.8, fat: 1.3, fiber: 5.7, sodium: 10 },
  { name: "Special K Original", brand: "Kellogg's", servingSize: "1 1/3 cup (36g)", calories: 137, protein: 6.6, carbs: 26.5, fat: 0.7, fiber: 0.5, sodium: 252 },
  { name: "Lucky Charms", brand: "General Mills", servingSize: "3/4 cup (36g)", calories: 140, protein: 3.0, carbs: 30.0, fat: 1.5, fiber: 2.0, sodium: 220 },
  { name: "Corn Flakes", brand: "Kellogg's", servingSize: "3/4 cup (21g)", calories: 76, protein: 1.3, carbs: 17.8, fat: 0.1, fiber: 0.7, sodium: 151 },
  { name: "Rice Krispies", brand: "Kellogg's", servingSize: "scant 3/4 cup (18g)", calories: 70, protein: 1.2, carbs: 16.1, fat: 0.1, fiber: 0.1, sodium: 90 },
  { name: "Original Low Fat Yogurt, Tropical", brand: "Yoplait", servingSize: "1 cup (170g)", calories: 150, protein: 6.0, carbs: 26.0, fat: 2.0, fiber: 0.0, sodium: 105 },
  { name: "Fruit on the Bottom Strawberry Yogurt", brand: "Dannon", servingSize: "5.3 oz cup (150g)", calories: 120, protein: 5.0, carbs: 20.0, fat: 2.0, fiber: 0.0, sodium: 90 },
  { name: "Fruit on the Bottom Blueberry Yogurt", brand: "Dannon", servingSize: "5.3 oz cup (150g)", calories: 120, protein: 5.0, carbs: 19.0, fat: 2.0, fiber: 0.0, sodium: 90 },
  { name: "Peach Probiotic Yogurt", brand: "Activia", servingSize: "4 oz cup (113g)", calories: 90, protein: 4.0, carbs: 15.0, fat: 1.5 },
  { name: "Plain Greek Yogurt", brand: "Chobani", servingSize: "5.3 oz cup (150g)", calories: 120, protein: 13.0, carbs: 16.0, fat: 0.0, fiber: 0.0, sodium: 64 },
  { name: "Banana Greek Yogurt", brand: "Chobani", servingSize: "5.3 oz cup (150g)", calories: 140, protein: 11.0, carbs: 18.0, fat: 3.0, fiber: 1.0, sodium: 56 },
  { name: "Blueberry Greek Yogurt", brand: "Chobani", servingSize: "5.3 oz cup (150g)", calories: 130, protein: 12.0, carbs: 19.0, fat: 0.0, fiber: 1.0, sodium: 60 },
  { name: "Total 5% Greek Strained Yogurt", brand: "Fage", servingSize: "7 oz (200g)", calories: 140, protein: 18.0, carbs: 6.0, fat: 10.0, fiber: 0.0, sodium: 70 },
  { name: "Total 2% Greek Yogurt, Strawberry", brand: "Fage", servingSize: "5.3 oz cup (150g)", calories: 120, protein: 12.0, carbs: 13.0, fat: 2.5, sodium: 45 },
  { name: "Triple Zero Peach Nonfat Greek Yogurt", brand: "Oikos", servingSize: "5.3 oz cup (150g)", calories: 90, protein: 15.0, carbs: 10.0, fat: 0.0, fiber: 3.0, sodium: 55 },
  { name: "Activia Probiotic Nonfat Greek Yogurt", brand: "Dannon", servingSize: "5.3 oz cup (150g)", calories: 120, protein: 12.0, carbs: 17.0, fat: 0.0, fiber: 0.0, sodium: 50 },
  { name: "Specialty Honey Wheat Bread", brand: "Nature's Own", servingSize: "2 slices (43g)", calories: 100, protein: 5.0, carbs: 20.0, fat: 1.0, fiber: 3.0, sodium: 150 },
  { name: "Powerseed Organic Bread", brand: "Dave's Killer Bread", servingSize: "1 slice (45g)", calories: 110, protein: 5.0, carbs: 18.0, fat: 2.0, fiber: 6.0, sodium: 150 },
  { name: "100% Whole Wheat Organic Bread", brand: "Dave's Killer Bread", servingSize: "1 slice (42g)", calories: 100, protein: 4.0, carbs: 22.0, fat: 1.0, fiber: 3.0, sodium: 160 },
  { name: "Farmhouse Multi-Grain Bread", brand: "Pepperidge Farm", servingSize: "1 slice (43g)", calories: 120, protein: 4.0, carbs: 22.0, fat: 2.0, fiber: 2.0, sodium: 170 },
  { name: "100% Whole Wheat Bread", brand: "Pepperidge Farm", servingSize: "1 slice (43g)", calories: 120, protein: 5.0, carbs: 21.0, fat: 1.5, fiber: 3.0, sodium: 135 },
  { name: "Classic White Bread", brand: "Sara Lee", servingSize: "2 slices (57g)", calories: 150, protein: 4.0, carbs: 28.0, fat: 2.0, fiber: 1.0, sodium: 290 },
  { name: "Simply Peanut Butter, Creamy", brand: "Jif", servingSize: "2 tbsp (33g)", calories: 200, protein: 7.0, carbs: 7.0, fat: 17.0, fiber: 3.0, sodium: 65 },
  { name: "Creamy Peanut Butter", brand: "Jif", servingSize: "2 tbsp (33g)", calories: 190, protein: 7.0, carbs: 8.0, fat: 16.0, fiber: 2.0, sodium: 140 },
  { name: "Creamy Peanut Butter", brand: "Skippy", servingSize: "2 tbsp (32g)", calories: 190, protein: 7.0, carbs: 6.0, fat: 16.0, fiber: 2.0, sodium: 150 },
  { name: "Creamy Peanut Butter", brand: "Peter Pan", servingSize: "2 tbsp (32g)", calories: 210, protein: 8.0, carbs: 6.0, fat: 17.0, fiber: 2.0, sodium: 140 },
  { name: "Crunchy Oats 'n Honey Granola Bars", brand: "Nature Valley", servingSize: "2 bars (42g)", calories: 190, protein: 3.0, carbs: 29.0, fat: 7.0, fiber: 2.0, sodium: 140 },
  { name: "Chewy Granola Bar", brand: "Quaker", servingSize: "1 bar (24g)", calories: 100, protein: 1.0, carbs: 17.0, fat: 3.5, fiber: 1.0, sodium: 70 },
  { name: "Granola Bars", brand: "KIND", servingSize: "1 bar (35g)", calories: 150, protein: 2.0, carbs: 23.0, fat: 5.0, fiber: 2.5, sodium: 100 },
  { name: "Granola Bars", brand: "Udi's", servingSize: "1 bar (35g)", calories: 140, protein: 3.0, carbs: 23.0, fat: 5.0, fiber: 3.0, sodium: 40 },
  { name: "Oats 'n Honey Protein Granola", brand: "Nature Valley", servingSize: "2/3 cup (65g)", calories: 270, protein: 13.0, carbs: 41.0, fat: 7.0, fiber: 4.0, sodium: 170 },
  { name: "Fruit + Nut Bar, Peanut Butter", brand: "Clif Bar", servingSize: "1 bar (50g)", calories: 200, protein: 6.0, carbs: 25.0, fat: 11.0, fiber: 4.0, sodium: 85 },
  { name: "Fruit + Nut Bar, Chocolate Almond Coconut", brand: "Clif Bar", servingSize: "1 bar (48g)", calories: 190, protein: 4.0, carbs: 25.0, fat: 12.0, fiber: 5.0, sodium: 105 },
  { name: "Almond Protein Bar", brand: "KIND", servingSize: "1 bar (45g)", calories: 230, protein: 10.0, carbs: 15.0, fat: 16.0, fiber: 3.0, sodium: 125 },
  { name: "Protein Bar, Cookies & Cream", brand: "Quest Nutrition", servingSize: "1 bar (60g)", calories: 190, protein: 21.0, carbs: 21.0, fat: 8.0, fiber: 13.0, sodium: 290 },
  { name: "Protein Bar, Chocolate Sea Salt", brand: "RXBAR", servingSize: "1 bar (52g)", calories: 200, protein: 12.0, carbs: 23.0, fat: 8.0, fiber: 5.0, sodium: 190 },
  { name: "American Cheese Singles", brand: "Crystal Farms", servingSize: "1 slice (21g)", calories: 70, protein: 4.0, carbs: 2.0, fat: 5.0, fiber: 0.0, sodium: 250 },
  { name: "Reduced Fat Sharp Cheddar Slices", brand: "Sargento", servingSize: "1 slice (28g)", calories: 90, protein: 8.0, carbs: 1.0, fat: 6.0, fiber: 0.3, sodium: 180 },
  { name: "Sharp Cheddar-Jack Cheese Slices", brand: "Sargento", servingSize: "1 slice (19g)", calories: 70, protein: 5.0, carbs: 0.0, fat: 6.0, fiber: 0.0, sodium: 120 },
  { name: "Sharp Cheddar Cheese Snacks", brand: "Sargento", servingSize: "1 pouch (43g)", calories: 170, protein: 11.0, carbs: 1.0, fat: 14.0, fiber: 0.0, sodium: 280 },
  { name: "Original Cream Cheese", brand: "Philadelphia", servingSize: "2 tbsp (28g)", calories: 100, protein: 2.0, carbs: 1.0, fat: 9.0, fiber: 0.0, sodium: 105 },
  { name: "Original Whipped Cream Cheese Spread", brand: "Philadelphia", servingSize: "2 tbsp (22g)", calories: 50, protein: 1.0, carbs: 2.0, fat: 4.0, fiber: 0.0, sodium: 85 },
  { name: "Deli Fresh Oven Roasted Turkey Breast", brand: "Oscar Mayer", servingSize: "2 slices (56g)", calories: 60, protein: 10.0, carbs: 2.0, fat: 1.0, fiber: 0.0, sodium: 480 },
  { name: "Deluxe Ham", brand: "Boar's Head", servingSize: "2 slices (56g)", calories: 60, protein: 9.0, carbs: 2.0, fat: 1.0, sodium: 588 },
  { name: "Bologna", brand: "Boar's Head", servingSize: "2 slices (56g)", calories: 150, protein: 7.0, carbs: 1.0, fat: 13.0, sodium: 530 },
  { name: "Deli Select Honey Roasted Turkey Breast", brand: "Hillshire Farm", servingSize: "2 slices (56g)", calories: 60, protein: 10.0, carbs: 4.0, fat: 0.5, sodium: 380 },
  { name: "Deli Select Ultra Thin Brown Sugar Ham", brand: "Hillshire Farm", servingSize: "2 slices (56g)", calories: 60, protein: 9.0, carbs: 3.0, fat: 1.5, sodium: 661 },
  { name: "Premium Hickory Smoked Turkey Breast", brand: "Land O'Frost", servingSize: "2 slices (50g)", calories: 90, protein: 8.0, carbs: 3.0, fat: 5.0, sodium: 510 },
  { name: "Detroit Style Four Cheese Pizza", brand: "DiGiorno", servingSize: "1/4 pizza (148g)", calories: 391, protein: 17.0, carbs: 34.9, fat: 21.0, fiber: 1.0, sodium: 591 },
  { name: "Hand Tossed Cheese Pizza", brand: "DiGiorno", servingSize: "1/5 pizza (130g)", calories: 300, protein: 14.0, carbs: 39.0, fat: 10.0, fiber: 2.0, sodium: 680 },
  { name: "Rising Crust Pepperoni Pizza", brand: "Red Baron", servingSize: "1/5 pizza (137g)", calories: 340, protein: 14.0, carbs: 44.9, fat: 12.0, fiber: 2.1, sodium: 891 },
  { name: "Thin & Crispy Pizza", brand: "Red Baron", servingSize: "1/3 pizza (139g)", calories: 350, protein: 13.0, carbs: 40.0, fat: 16.0, fiber: 1.9, sodium: 840 },
  { name: "Cheese Party Pizza", brand: "Totino's", servingSize: "1 pizza (278g)", calories: 670, protein: 15.0, carbs: 77.0, fat: 33.1, fiber: 3.1, sodium: 1251 },
  { name: "Pepperoni Party Pizza", brand: "Totino's", servingSize: "1/2 pizza (145g)", calories: 360, protein: 9.0, carbs: 38.0, fat: 19.0, fiber: 2.0, sodium: 740 },
  { name: "Chicken Noodle Soup", brand: "Campbell's", servingSize: "1 can (305g)", calories: 149, protein: 8.0, carbs: 21.0, fat: 4.0, fiber: 2.1, sodium: 961 },
  { name: "Chunky Chicken Noodle Soup", brand: "Campbell's", servingSize: "1 can (527g)", calories: 264, protein: 19.8, carbs: 30.7, fat: 6.6, fiber: 2.1, sodium: 1734 },
  { name: "Organic Chicken Noodle Soup", brand: "Progresso", servingSize: "1 cup (245g)", calories: 91, protein: 6.0, carbs: 15.0, fat: 1.0, fiber: 1.0, sodium: 730 },
  { name: "Light Chicken Noodle Soup", brand: "Progresso", servingSize: "1 cup (244g)", calories: 61, protein: 5.0, carbs: 9.0, fat: 0.5, fiber: 1.0, sodium: 659 },
  { name: "Old World Style Traditional Pasta Sauce", brand: "Ragu", servingSize: "1/2 cup (125g)", calories: 80, protein: 2.0, carbs: 13.0, fat: 2.0, fiber: 2.0, sodium: 480 },
  { name: "Traditional Pasta Sauce", brand: "Prego", servingSize: "1/2 cup (130g)", calories: 70, protein: 2.0, carbs: 12.0, fat: 1.0, fiber: 3.0, sodium: 471 },
  { name: "Sausage Pasta Sauce", brand: "Ragu", servingSize: "1/2 cup (125g)", calories: 80, protein: 2.0, carbs: 4.0, fat: 6.0, fiber: 2.0, sodium: 610 },
  { name: "Caesar Dressing", brand: "Newman's Own", servingSize: "2 tbsp (30g)", calories: 150, protein: 1.0, carbs: 1.0, fat: 16.0, sodium: 339 },
  { name: "Lite Italian Dressing", brand: "Newman's Own", servingSize: "2 tbsp (30g)", calories: 60, protein: 0.0, carbs: 1.0, fat: 6.0, sodium: 260 },
  { name: "Creamy Balsamic Dressing", brand: "Newman's Own", servingSize: "2 tbsp (30g)", calories: 100, protein: 0.0, carbs: 7.0, fat: 8.0, sodium: 200 },
  { name: "Original Ranch Topping & Dip", brand: "Hidden Valley", servingSize: "2 tbsp (30g)", calories: 130, protein: 0.0, carbs: 3.0, fat: 14.0, fiber: 1.0, sodium: 240 },
  { name: "Ranch Dressing", brand: "Ken's Steak House", servingSize: "2 tbsp (30g)", calories: 150, protein: 0.0, carbs: 2.0, fat: 16.0, sodium: 280 },
  { name: "Classic Potato Chips", brand: "Lay's", servingSize: "1 oz (28g)", calories: 160, protein: 2.0, carbs: 15.0, fat: 10.0, fiber: 1.0, sodium: 170 },
  { name: "Original Potato Chips", brand: "Ruffles", servingSize: "1 oz (28g)", calories: 160, protein: 2.0, carbs: 15.0, fat: 10.0, fiber: 1.0, sodium: 160 },
  { name: "Original Potato Crisps", brand: "Pringles", servingSize: "1 oz (28g)", calories: 152, protein: 1.2, carbs: 15.8, fat: 9.4, fiber: 0.7, sodium: 151 },
  { name: "Crunchy Cheese Flavored Snacks", brand: "Cheetos", servingSize: "1 oz (28g)", calories: 150, protein: 2.0, carbs: 13.0, fat: 10.0, fiber: 1.0, sodium: 250 },
  { name: "Original Corn Chips", brand: "Fritos", servingSize: "1 oz (28g)", calories: 160, protein: 2.0, carbs: 16.0, fat: 10.0, fiber: 1.0, sodium: 105 },
  { name: "Yellow Corn Tortilla Chips", brand: "Tostitos", servingSize: "1 oz (28g)", calories: 140, protein: 2.0, carbs: 19.0, fat: 6.0, fiber: 1.0, sodium: 100 },
  { name: "Nacho Cheese Tortilla Chips", brand: "Doritos", servingSize: "1 oz (28g)", calories: 140, protein: 2.0, carbs: 16.0, fat: 8.0, fiber: 1.0, sodium: 210 },
  { name: "Original Crackers", brand: "Triscuit", servingSize: "6 crackers (28g)", calories: 120, protein: 3.0, carbs: 20.0, fat: 3.5, fiber: 3.0, sodium: 170 },
  { name: "Original Crackers", brand: "Wheat Thins", servingSize: "16 crackers (31g)", calories: 140, protein: 2.0, carbs: 22.0, fat: 5.0, fiber: 3.0, sodium: 200 },
  { name: "Original Crackers", brand: "Ritz", servingSize: "5 crackers (16g)", calories: 80, protein: 1.0, carbs: 10.0, fat: 4.5, sodium: 105 },
  { name: "Original Crackers", brand: "Cheez-It", servingSize: "27 crackers (30g)", calories: 150, protein: 3.0, carbs: 18.0, fat: 8.0, fiber: 1.0, sodium: 200 },
  { name: "Classic Hummus", brand: "Sabra", servingSize: "1/4 cup (57g)", calories: 150, protein: 4.0, carbs: 9.0, fat: 11.0, fiber: 3.0, sodium: 260 },
  { name: "Classic Hummus Singles", brand: "Sabra", servingSize: "2 tbsp (28g)", calories: 70, protein: 2.0, carbs: 4.0, fat: 6.0, fiber: 1.0, sodium: 105 },
  { name: "Steamfresh Mixed Vegetables", brand: "Birds Eye", servingSize: "1 cup (88g)", calories: 60, protein: 2.0, carbs: 11.0, fat: 1.0, fiber: 2.0, sodium: 30 },
  { name: "Stir-Fry Vegetables", brand: "Birds Eye", servingSize: "1.5 cups (150g)", calories: 90, protein: 4.0, carbs: 16.0, fat: 0.0, fiber: 2.0, sodium: 30 },
  { name: "Broccoli Florets", brand: "Generic", servingSize: "1.5 cups (85g)", calories: 30, protein: 3.0, carbs: 4.0, fat: 0.0, fiber: 2.0, sodium: 25 },
  { name: "Instant Oatmeal, Original", brand: "Quaker", servingSize: "1 packet (28g)", calories: 100, protein: 4.0, carbs: 18.0, fat: 2.0, fiber: 3.0, sodium: 75 },
  { name: "Old Fashioned Oats", brand: "Quaker", servingSize: "1/2 cup dry (40g)", calories: 150, protein: 5.0, carbs: 27.0, fat: 3.0, fiber: 4.0, sodium: 0 },
  { name: "Almond Milk, Original", brand: "Silk", servingSize: "1 cup (240g)", calories: 60, protein: 1.0, carbs: 8.0, fat: 2.5, fiber: 0.0, sodium: 150 },
  { name: "Almond Milk, Vanilla", brand: "Silk", servingSize: "1 cup (240g)", calories: 80, protein: 1.0, carbs: 14.0, fat: 2.5, sodium: 125 },
  { name: "Almondmilk, Original", brand: "Almond Breeze", servingSize: "1 cup (240g)", calories: 60, protein: 1.0, carbs: 8.0, fat: 2.5, fiber: 1.0, sodium: 150 },
  { name: "Oat Milk, Original", brand: "Oatly", servingSize: "11 fl oz (330ml)", calories: 172, protein: 4.0, carbs: 22.0, fat: 7.0, fiber: 3.0, sodium: 119 },
  { name: "Oatmilk, Original", brand: "Planet Oat", servingSize: "1 cup (240ml)", calories: 90, protein: 2.0, carbs: 19.0, fat: 1.5, fiber: 2.0, sodium: 120 },
  { name: "Oatmilk, Vanilla Unsweetened", brand: "Planet Oat", servingSize: "1 cup (240ml)", calories: 45, protein: 1.0, carbs: 8.0, fat: 0.5, fiber: 1.0, sodium: 100 },
  { name: "Cherry Garcia Ice Cream", brand: "Ben & Jerry's", servingSize: "2/3 cup (120ml)", calories: 260, protein: 4.0, carbs: 26.0, fat: 16.0, fiber: 1.0, sodium: 46 },
  { name: "Chocolate Fudge Brownie Ice Cream", brand: "Ben & Jerry's", servingSize: "2/3 cup (120ml)", calories: 270, protein: 5.0, carbs: 30.0, fat: 14.0, fiber: 2.0, sodium: 65 },
  { name: "Natural Vanilla Ice Cream", brand: "Breyers", servingSize: "2/3 cup (88g)", calories: 170, protein: 3.0, carbs: 19.0, fat: 9.0, fiber: 0.0, sodium: 50 },
  { name: "Original Chocolate Sandwich Cookies", brand: "Oreo", servingSize: "3 cookies (38g)", calories: 160, protein: 1.0, carbs: 24.0, fat: 6.0, fiber: 1.0, sodium: 140 },
  { name: "Original Cookies", brand: "Chips Ahoy!", servingSize: "3 cookies (33g)", calories: 160, protein: 2.0, carbs: 22.0, fat: 8.0, fiber: 1.0, sodium: 105 },
  { name: "Peanut Butter Sandwich Cookies", brand: "Nutter Butter", servingSize: "2 cookies (25g)", calories: 120, protein: 2.0, carbs: 17.0, fat: 5.0, fiber: 1.0, sodium: 90 },
  { name: "Trail Mix, Nut & Chocolate", brand: "Planters", servingSize: "1/3 cup (56g)", calories: 290, protein: 8.0, carbs: 27.0, fat: 18.0, fiber: 3.0, sodium: 15 },
  { name: "Deluxe Mixed Nuts", brand: "Planters", servingSize: "1 oz (28g)", calories: 170, protein: 5.0, carbs: 7.0, fat: 14.0, fiber: 2.0, sodium: 80 },
  { name: "Honey Roasted Mixed Nuts", brand: "Planters", servingSize: "1 oz (28g)", calories: 160, protein: 5.0, carbs: 9.0, fat: 12.0, fiber: 2.0, sodium: 110 },
  { name: "Homestyle Pretzels", brand: "Snyder's of Hanover", servingSize: "1 oz (31g)", calories: 120, protein: 3.0, carbs: 25.0, fat: 1.0, fiber: 1.0, sodium: 230 },
  { name: "Thins Pretzels", brand: "Rold Gold", servingSize: "1 oz (28g)", calories: 110, protein: 2.0, carbs: 23.0, fat: 1.0, fiber: 1.0, sodium: 490 },
  { name: "Original Popcorn", brand: "SkinnyPop", servingSize: "5.5 cups (28g)", calories: 150, protein: 2.0, carbs: 15.0, fat: 10.0, fiber: 3.0, sodium: 75 },
  { name: "White Cheddar Popcorn", brand: "Smartfood", servingSize: "1.5 cups (28g)", calories: 160, protein: 4.0, carbs: 13.0, fat: 10.0, fiber: 2.0, sodium: 240 },
  { name: "Butter Microwave Popcorn", brand: "Orville Redenbacher's", servingSize: "1 bag serving (35g)", calories: 170, protein: 2.0, carbs: 17.0, fat: 11.0, fiber: 3.0, sodium: 310 },
  { name: "Classic", brand: "Coca-Cola", servingSize: "12 fl oz can (355ml)", calories: 138, protein: 0.0, carbs: 39.0, fat: 0.0, sodium: 46 },
  { name: "Cola", brand: "Pepsi", servingSize: "12 fl oz can (360ml)", calories: 155, protein: 0.0, carbs: 42.1, fat: 0.0, sodium: 32 },
  { name: "Lemon-Lime Soda", brand: "Sprite", servingSize: "12.5 fl oz (370ml)", calories: 152, protein: 0.0, carbs: 40.0, fat: 0.0, sodium: 70 },
  { name: "Soda", brand: "Dr Pepper", servingSize: "12 fl oz can (355ml)", calories: 149, protein: 0.0, carbs: 39.8, fat: 0.0, sodium: 53 },
  { name: "Thirst Quencher, Orange", brand: "Gatorade", servingSize: "12 fl oz (360ml)", calories: 83, protein: 0.0, carbs: 22.0, fat: 0.0, sodium: 166 },
  { name: "G2 Thirst Quencher (Low Calorie)", brand: "Gatorade", servingSize: "20 fl oz (600ml)", calories: 48, protein: 0.0, carbs: 12.0, fat: 0.0, sodium: 270 },
  { name: "Gold Standard 100% Whey Protein Powder", brand: "Optimum Nutrition", servingSize: "1 scoop (30g)", calories: 120, protein: 24.0, carbs: 3.0, fat: 1.0, sodium: 130 },
  { name: "Gold Standard 100% Whey Protein Powder, Chocolate", brand: "Optimum Nutrition", servingSize: "1 scoop (32g)", calories: 130, protein: 24.0, carbs: 5.0, fat: 1.0, fiber: 1.0, sodium: 60 },
  { name: "Non-Dairy Protein Shake, Chocolate", brand: "Muscle Milk", servingSize: "11 fl oz (330ml)", calories: 158, protein: 20.0, carbs: 12.0, fat: 4.0, fiber: 1.0, sodium: 129 },
  { name: "Applewood Smoked Bacon", brand: "Oscar Mayer", servingSize: "2 slices cooked (18g)", calories: 90, protein: 5.0, carbs: 1.0, fat: 7.0, sodium: 329 },
  { name: "Thick Cut Bacon, Hardwood Smoked", brand: "Oscar Mayer", servingSize: "1 slice cooked (12g)", calories: 60, protein: 4.0, carbs: 0.0, fat: 5.0, sodium: 220 },
  { name: "Black Label Brown Sugar Thick Cut Bacon", brand: "Hormel", servingSize: "1 slice cooked (24g)", calories: 110, protein: 8.0, carbs: 1.0, fat: 8.0, sodium: 470 },
  { name: "Black Label Applewood Real Bacon Crumbles", brand: "Hormel", servingSize: "1 tbsp (7g)", calories: 25, protein: 3.0, carbs: 0.0, fat: 1.5, sodium: 210 },
  { name: "Salted Butter", brand: "Land O'Lakes", servingSize: "1 tbsp (15g)", calories: 100, protein: 0.0, carbs: 0.0, fat: 11.0, fiber: 0.0, sodium: 90 },
  { name: "Pure Irish Butter", brand: "Kerrygold", servingSize: "1 tbsp (14g)", calories: 100, protein: 0.0, carbs: 0.0, fat: 11.0, sodium: 65 },
  { name: "Reduced Fat Irish Butter", brand: "Kerrygold", servingSize: "1 tbsp (14g)", calories: 80, protein: 0.0, carbs: 0.0, fat: 8.0, sodium: 45 },
  { name: "Whole Milk, Vitamin D", brand: "Dean's Dairy Pure", servingSize: "1 cup (240ml)", calories: 149, protein: 8.0, carbs: 12.0, fat: 8.0, sodium: 120 },
  { name: "2% Reduced Fat Milk", brand: "Darigold", servingSize: "1 cup (240ml)", calories: 130, protein: 8.0, carbs: 13.0, fat: 5.0, sodium: 130 },
  { name: "Tomato Ketchup", brand: "Heinz", servingSize: "1 tbsp (17g)", calories: 20, protein: 0.0, carbs: 5.0, fat: 0.0, sodium: 180 },
  { name: "Classic Yellow Mustard", brand: "French's", servingSize: "1 tsp (7g)", calories: 0, protein: 0.0, carbs: 0.0, fat: 0.0, sodium: 80 },
  { name: "Real Mayonnaise", brand: "Hellmann's", servingSize: "1 tbsp (14g)", calories: 100, protein: 0.0, carbs: 0.0, fat: 11.0, sodium: 100 },
  { name: "Original Picante Sauce", brand: "Pace", servingSize: "2 tbsp (30ml)", calories: 10, protein: 0.0, carbs: 3.0, fat: 0.0, fiber: 1.0, sodium: 250 },
  { name: "Black Bean Fiesta Grillin' Beans", brand: "Bush's Best", servingSize: "1/2 cup (130g)", calories: 110, protein: 5.0, carbs: 21.1, fat: 1.0, fiber: 4.9, sodium: 569 },
  { name: "Original Baked Beans", brand: "Bush's Best", servingSize: "1/2 cup (125ml)", calories: 140, protein: 6.0, carbs: 29.0, fat: 1.0, fiber: 5.0, sodium: 550 },
  { name: "Refried Black Beans", brand: "Bush's Best", servingSize: "1/2 cup (130g)", calories: 150, protein: 8.0, carbs: 23.0, fat: 3.0, fiber: 7.0, sodium: 439 },
  { name: "Honey Baked Beans", brand: "Bush's Best", servingSize: "1/2 cup (125ml)", calories: 160, protein: 6.0, carbs: 33.0, fat: 0.0, fiber: 7.0, sodium: 550 },
  { name: "Chunk Light Tuna in Water", brand: "StarKist", servingSize: "2 oz drained (56g)", calories: 60, protein: 13.0, carbs: 0.0, fat: 0.5, fiber: 0.0, sodium: 250 },
  { name: "Chunk White Albacore Tuna in Water", brand: "StarKist", servingSize: "2.8 oz drained (79g)", calories: 80, protein: 16.0, carbs: 0.0, fat: 0.5, fiber: 0.0, sodium: 200 },
  { name: "Chunk Light Tuna in Water", brand: "Bumble Bee", servingSize: "2 oz drained (56g)", calories: 50, protein: 11.0, carbs: 0.0, fat: 0.0, fiber: 0.0, sodium: 180 },
  { name: "Solid Light Tuna Yellowfin in Vegetable Oil", brand: "Bumble Bee", servingSize: "2 oz drained (56g)", calories: 110, protein: 15.0, carbs: 0.0, fat: 5.0, fiber: 0.0, sodium: 220 },
  { name: "Homestyle Waffles", brand: "Eggo", servingSize: "2 waffles (70g)", calories: 180, protein: 4.3, carbs: 27.4, fat: 6.1, fiber: 0.8, sodium: 356 },
  { name: "Mini Bagels, Plain", brand: "Thomas'", servingSize: "1 mini bagel (43g)", calories: 120, protein: 5.0, carbs: 24.0, fat: 1.0, fiber: 2.0, sodium: 190 },
  { name: "Cinnamon Raisin Bagel", brand: "Western Bagel", servingSize: "1 bagel (85g)", calories: 240, protein: 7.0, carbs: 50.0, fat: 1.0, fiber: 2.0, sodium: 320 },
  { name: "Fajita Flour Tortillas", brand: "Mission", servingSize: "1 tortilla (36g)", calories: 110, protein: 3.0, carbs: 18.0, fat: 2.5, fiber: 1.0, sodium: 310 },
  { name: "Beef Flavored Rice", brand: "Rice-A-Roni", servingSize: "1/3 cup dry mix (56g)", calories: 185, protein: 5.7, carbs: 40.5, fat: 0.5, fiber: 1.5, sodium: 750 },
  { name: "Red Beans & Rice", brand: "Rice-A-Roni", servingSize: "1/3 cup dry mix (56g)", calories: 189, protein: 6.4, carbs: 41.2, fat: 0.8, fiber: 4.4, sodium: 767 },
  { name: "Red Beans & Rice Dinner Mix", brand: "Zatarain's", servingSize: "1/4 box dry mix (50g)", calories: 170, protein: 7.0, carbs: 34.0, fat: 1.0, fiber: 4.0, sodium: 620 },
  { name: "Dirty Rice Mix", brand: "Zatarain's", servingSize: "1/4 box dry mix (49g)", calories: 170, protein: 4.0, carbs: 38.0, fat: 0.5, fiber: 1.0, sodium: 480 },
  { name: "Organic Spaghetti", brand: "Barilla", servingSize: "2 oz dry (56g)", calories: 200, protein: 7.0, carbs: 42.0, fat: 1.0, fiber: 3.0, sodium: 0 },
  { name: "Whole Grain Spaghetti", brand: "Barilla", servingSize: "2 oz dry (56g)", calories: 180, protein: 8.0, carbs: 39.0, fat: 1.5, fiber: 6.0, sodium: 0 },
  { name: "Organic Penne", brand: "Barilla", servingSize: "2 oz dry (56g)", calories: 200, protein: 7.0, carbs: 42.0, fat: 1.0, fiber: 3.0, sodium: 0 },
  { name: "Whole Grain Penne", brand: "Barilla", servingSize: "2 oz dry (56g)", calories: 180, protein: 8.0, carbs: 39.0, fat: 1.5, fiber: 6.0, sodium: 0 },
];

async function main() {
  let created = 0;
  let skipped = 0;
  for (const food of RAW_FOODS) {
    const name = food.name.toLowerCase().startsWith(food.brand.toLowerCase())
      ? food.name
      : `${food.brand} - ${food.name}`;

    const existing = await prisma.food.findFirst({ where: { userId: null, name } });
    if (existing) {
      skipped += 1;
      continue;
    }
    await prisma.food.create({
      data: {
        name,
        brand: food.brand,
        servingSize: food.servingSize,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber ?? null,
        sodium: food.sodium ?? null,
        userId: null,
        isCustom: false,
        isFavorite: false,
      },
    });
    created += 1;
  }
  // eslint-disable-next-line no-console
  console.log(`Seeded ${created} grocery foods (${skipped} already present, skipped).`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
