import type { Nutrients } from "../types";

/**
 * A compact food-composition table used as EmberFit's offline backbone.
 *
 * Values are per 100 g edible portion, raw unless the name says otherwise, and
 * rounded from public composition data (USDA FoodData Central / CoFID style
 * reference values). They are reference figures for estimation — the UI always
 * labels anything derived from them as an estimate.
 */
export interface TableFood {
  key: string;
  name: string;
  aliases?: string[];
  /** Rough category, used for portion defaults and cooking adjustments. */
  group:
    | "protein"
    | "grain"
    | "vegetable"
    | "fruit"
    | "dairy"
    | "fat"
    | "legume"
    | "nut"
    | "prepared"
    | "drink"
    | "sweet";
  per100: Nutrients;
  /** Typical single portion in grams, used to pre-fill the amount field. */
  typicalGrams?: number;
  servingLabel?: string;
  /**
   * True when a meaningful share of the energy comes from alcohol (7 kcal/g),
   * which the protein/carb/fat model doesn't capture. The calorie figure is
   * still correct; the macros simply won't add up to it.
   */
  energyFromAlcohol?: boolean;
}

const f = (
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  fiber?: number,
  sugar?: number,
  satFat?: number,
  sodium?: number,
): Nutrients => ({ calories, protein, carbs, fat, fiber, sugar, satFat, sodium });

export const FOOD_TABLE: TableFood[] = [
  // ---- Proteins -----------------------------------------------------------
  { key: "chicken_breast", name: "Chicken breast, skinless, raw", aliases: ["chicken", "chicken breast"], group: "protein", per100: f(120, 22.5, 0, 2.6, 0, 0, 0.7, 63), typicalGrams: 150 },
  { key: "chicken_thigh", name: "Chicken thigh, skinless, raw", aliases: ["chicken thigh"], group: "protein", per100: f(149, 19.7, 0, 7.4, 0, 0, 2.0, 79), typicalGrams: 130 },
  { key: "beef_mince_lean", name: "Beef mince, lean, raw", aliases: ["ground beef", "beef", "minced beef"], group: "protein", per100: f(176, 20.5, 0, 10.2, 0, 0, 4.1, 66), typicalGrams: 125 },
  { key: "beef_steak", name: "Beef steak, lean, raw", aliases: ["steak"], group: "protein", per100: f(158, 22.0, 0, 7.5, 0, 0, 3.0, 55), typicalGrams: 170 },
  { key: "pork_loin", name: "Pork loin, raw", aliases: ["pork"], group: "protein", per100: f(143, 21.0, 0, 6.0, 0, 0, 2.1, 52), typicalGrams: 140 },
  { key: "bacon", name: "Bacon, raw", group: "protein", per100: f(393, 12.6, 1.3, 37.0, 0, 0, 12.3, 1120), typicalGrams: 30 },
  { key: "salmon", name: "Salmon fillet, raw", aliases: ["salmon"], group: "protein", per100: f(208, 20.4, 0, 13.4, 0, 0, 3.1, 59), typicalGrams: 130 },
  { key: "tuna_canned", name: "Tuna, canned in water, drained", aliases: ["tuna"], group: "protein", per100: f(116, 25.5, 0, 0.8, 0, 0, 0.2, 320), typicalGrams: 100 },
  { key: "white_fish", name: "White fish (cod/haddock), raw", aliases: ["cod", "haddock", "fish"], group: "protein", per100: f(82, 17.8, 0, 0.7, 0, 0, 0.1, 78), typicalGrams: 150 },
  { key: "shrimp", name: "Shrimp, raw", aliases: ["prawns", "prawn", "shrimps"], group: "protein", per100: f(85, 20.1, 0.2, 0.5, 0, 0, 0.1, 119), typicalGrams: 100 },
  { key: "egg", name: "Egg, whole, raw", aliases: ["eggs"], group: "protein", per100: f(143, 12.6, 0.7, 9.5, 0, 0.4, 3.1, 142), typicalGrams: 55, servingLabel: "1 medium egg (55 g)" },
  { key: "egg_white", name: "Egg white", group: "protein", per100: f(52, 10.9, 0.7, 0.2, 0, 0.7, 0, 166), typicalGrams: 33 },
  { key: "tofu_firm", name: "Tofu, firm", aliases: ["tofu"], group: "protein", per100: f(144, 15.8, 4.3, 8.7, 2.3, 0.6, 1.3, 14), typicalGrams: 120 },
  { key: "tempeh", name: "Tempeh", group: "protein", per100: f(192, 20.3, 7.6, 10.8, 6.0, 0, 2.2, 9), typicalGrams: 100 },
  { key: "turkey_breast", name: "Turkey breast, skinless, raw", aliases: ["turkey"], group: "protein", per100: f(111, 24.6, 0, 1.0, 0, 0, 0.3, 55), typicalGrams: 150 },

  // ---- Grains & starches --------------------------------------------------
  { key: "rice_white_raw", name: "White rice, dry", aliases: ["rice", "white rice"], group: "grain", per100: f(360, 6.6, 79.3, 0.6, 1.3, 0.1, 0.2, 1), typicalGrams: 75 },
  { key: "rice_white_cooked", name: "White rice, cooked", aliases: ["cooked rice", "steamed rice"], group: "grain", per100: f(130, 2.4, 28.2, 0.3, 0.4, 0.1, 0.1, 1), typicalGrams: 180 },
  { key: "rice_brown_cooked", name: "Brown rice, cooked", aliases: ["brown rice"], group: "grain", per100: f(123, 2.7, 25.6, 1.0, 1.6, 0.2, 0.2, 4), typicalGrams: 180 },
  { key: "pasta_dry", name: "Pasta, dry", aliases: ["pasta", "spaghetti", "penne"], group: "grain", per100: f(371, 13.0, 74.7, 1.5, 3.2, 2.7, 0.3, 6), typicalGrams: 85 },
  { key: "pasta_cooked", name: "Pasta, cooked", aliases: ["cooked pasta"], group: "grain", per100: f(158, 5.8, 30.9, 0.9, 1.8, 0.6, 0.2, 1), typicalGrams: 200 },
  { key: "bread_white", name: "White bread", aliases: ["bread", "toast"], group: "grain", per100: f(265, 9.0, 49.0, 3.2, 2.7, 5.0, 0.7, 491), typicalGrams: 40, servingLabel: "1 slice (40 g)" },
  { key: "bread_wholemeal", name: "Wholemeal bread", aliases: ["brown bread", "whole wheat bread"], group: "grain", per100: f(247, 10.7, 41.3, 3.4, 6.8, 4.3, 0.7, 455), typicalGrams: 40 },
  { key: "oats", name: "Oats, rolled, dry", aliases: ["oatmeal", "porridge oats"], group: "grain", per100: f(379, 13.2, 67.7, 6.5, 10.1, 1.0, 1.1, 6), typicalGrams: 50 },
  { key: "quinoa_cooked", name: "Quinoa, cooked", aliases: ["quinoa"], group: "grain", per100: f(120, 4.4, 21.3, 1.9, 2.8, 0.9, 0.2, 7), typicalGrams: 180 },
  { key: "potato", name: "Potato, raw", aliases: ["potatoes"], group: "vegetable", per100: f(77, 2.0, 17.5, 0.1, 2.2, 0.8, 0, 6), typicalGrams: 180 },
  { key: "sweet_potato", name: "Sweet potato, raw", group: "vegetable", per100: f(86, 1.6, 20.1, 0.1, 3.0, 4.2, 0, 55), typicalGrams: 170 },
  { key: "tortilla", name: "Flour tortilla", aliases: ["wrap"], group: "grain", per100: f(304, 8.2, 51.4, 7.0, 3.1, 2.4, 1.8, 630), typicalGrams: 45 },
  { key: "couscous_cooked", name: "Couscous, cooked", aliases: ["couscous"], group: "grain", per100: f(112, 3.8, 23.2, 0.2, 1.4, 0.1, 0, 5), typicalGrams: 160 },
  { key: "noodles_egg_cooked", name: "Egg noodles, cooked", aliases: ["noodles", "ramen noodles"], group: "grain", per100: f(138, 4.5, 25.2, 2.1, 1.2, 0.4, 0.4, 5), typicalGrams: 190 },

  // ---- Legumes ------------------------------------------------------------
  { key: "lentils_cooked", name: "Lentils, cooked", aliases: ["lentil", "dal"], group: "legume", per100: f(116, 9.0, 20.1, 0.4, 7.9, 1.8, 0.1, 2), typicalGrams: 150 },
  { key: "chickpeas_cooked", name: "Chickpeas, cooked", aliases: ["chickpea", "garbanzo"], group: "legume", per100: f(164, 8.9, 27.4, 2.6, 7.6, 4.8, 0.3, 7), typicalGrams: 150 },
  { key: "black_beans_cooked", name: "Black beans, cooked", aliases: ["black beans"], group: "legume", per100: f(132, 8.9, 23.7, 0.5, 8.7, 0.3, 0.1, 2), typicalGrams: 150 },
  { key: "kidney_beans_cooked", name: "Kidney beans, cooked", aliases: ["kidney beans"], group: "legume", per100: f(127, 8.7, 22.8, 0.5, 6.4, 0.3, 0.1, 2), typicalGrams: 150 },
  { key: "baked_beans", name: "Baked beans in tomato sauce", group: "legume", per100: f(94, 4.8, 15.0, 0.6, 4.1, 5.2, 0.2, 400), typicalGrams: 200 },

  // ---- Vegetables ---------------------------------------------------------
  { key: "broccoli", name: "Broccoli, raw", group: "vegetable", per100: f(34, 2.8, 6.6, 0.4, 2.6, 1.7, 0, 33), typicalGrams: 90 },
  { key: "carrot", name: "Carrot, raw", aliases: ["carrots"], group: "vegetable", per100: f(41, 0.9, 9.6, 0.2, 2.8, 4.7, 0, 69), typicalGrams: 80 },
  { key: "onion", name: "Onion, raw", aliases: ["onions"], group: "vegetable", per100: f(40, 1.1, 9.3, 0.1, 1.7, 4.2, 0, 4), typicalGrams: 70 },
  { key: "garlic", name: "Garlic, raw", group: "vegetable", per100: f(149, 6.4, 33.1, 0.5, 2.1, 1.0, 0.1, 17), typicalGrams: 6 },
  { key: "tomato", name: "Tomato, raw", aliases: ["tomatoes"], group: "vegetable", per100: f(18, 0.9, 3.9, 0.2, 1.2, 2.6, 0, 5), typicalGrams: 100 },
  { key: "tomato_canned", name: "Tomatoes, canned chopped", aliases: ["canned tomatoes", "passata"], group: "vegetable", per100: f(32, 1.6, 5.6, 0.3, 1.3, 3.9, 0, 186), typicalGrams: 200 },
  { key: "spinach", name: "Spinach, raw", group: "vegetable", per100: f(23, 2.9, 3.6, 0.4, 2.2, 0.4, 0.1, 79), typicalGrams: 60 },
  { key: "bell_pepper", name: "Bell pepper, raw", aliases: ["pepper", "capsicum"], group: "vegetable", per100: f(26, 1.0, 6.0, 0.3, 2.1, 4.2, 0, 4), typicalGrams: 90 },
  { key: "mushroom", name: "Mushrooms, raw", aliases: ["mushrooms"], group: "vegetable", per100: f(22, 3.1, 3.3, 0.3, 1.0, 2.0, 0, 5), typicalGrams: 80 },
  { key: "courgette", name: "Courgette / zucchini, raw", aliases: ["zucchini"], group: "vegetable", per100: f(17, 1.2, 3.1, 0.3, 1.0, 2.5, 0.1, 8), typicalGrams: 100 },
  { key: "cucumber", name: "Cucumber, raw", group: "vegetable", per100: f(15, 0.7, 3.6, 0.1, 0.5, 1.7, 0, 2), typicalGrams: 80 },
  { key: "lettuce", name: "Lettuce, raw", aliases: ["salad leaves"], group: "vegetable", per100: f(15, 1.4, 2.9, 0.2, 1.3, 0.8, 0, 28), typicalGrams: 50 },
  { key: "cabbage", name: "Cabbage, raw", group: "vegetable", per100: f(25, 1.3, 5.8, 0.1, 2.5, 3.2, 0, 18), typicalGrams: 90 },
  { key: "green_beans", name: "Green beans, raw", group: "vegetable", per100: f(31, 1.8, 7.0, 0.1, 2.7, 3.3, 0, 6), typicalGrams: 90 },
  { key: "peas", name: "Peas, green", group: "vegetable", per100: f(81, 5.4, 14.5, 0.4, 5.1, 5.7, 0.1, 5), typicalGrams: 80 },
  { key: "corn", name: "Sweetcorn kernels", aliases: ["sweetcorn"], group: "vegetable", per100: f(86, 3.3, 19.0, 1.2, 2.0, 3.2, 0.2, 15), typicalGrams: 90 },
  { key: "aubergine", name: "Aubergine / eggplant, raw", aliases: ["eggplant"], group: "vegetable", per100: f(25, 1.0, 5.9, 0.2, 3.0, 3.5, 0, 2), typicalGrams: 100 },
  { key: "cauliflower", name: "Cauliflower, raw", group: "vegetable", per100: f(25, 1.9, 5.0, 0.3, 2.0, 1.9, 0.1, 30), typicalGrams: 90 },
  { key: "avocado", name: "Avocado", group: "fruit", per100: f(160, 2.0, 8.5, 14.7, 6.7, 0.7, 2.1, 7), typicalGrams: 100 },

  // ---- Fruit --------------------------------------------------------------
  { key: "banana", name: "Banana", group: "fruit", per100: f(89, 1.1, 22.8, 0.3, 2.6, 12.2, 0.1, 1), typicalGrams: 118, servingLabel: "1 medium (118 g)" },
  { key: "apple", name: "Apple", group: "fruit", per100: f(52, 0.3, 13.8, 0.2, 2.4, 10.4, 0, 1), typicalGrams: 150 },
  { key: "orange", name: "Orange", group: "fruit", per100: f(47, 0.9, 11.8, 0.1, 2.4, 9.4, 0, 0), typicalGrams: 140 },
  { key: "strawberry", name: "Strawberries", aliases: ["strawberries"], group: "fruit", per100: f(32, 0.7, 7.7, 0.3, 2.0, 4.9, 0, 1), typicalGrams: 100 },
  { key: "blueberry", name: "Blueberries", aliases: ["blueberries"], group: "fruit", per100: f(57, 0.7, 14.5, 0.3, 2.4, 10.0, 0, 1), typicalGrams: 80 },
  { key: "grapes", name: "Grapes", group: "fruit", per100: f(69, 0.7, 18.1, 0.2, 0.9, 15.5, 0.1, 2), typicalGrams: 100 },
  { key: "mango", name: "Mango", group: "fruit", per100: f(60, 0.8, 15.0, 0.4, 1.6, 13.7, 0.1, 1), typicalGrams: 150 },
  { key: "pineapple", name: "Pineapple", group: "fruit", per100: f(50, 0.5, 13.1, 0.1, 1.4, 9.9, 0, 1), typicalGrams: 120 },

  // ---- Dairy --------------------------------------------------------------
  { key: "milk_whole", name: "Whole milk", aliases: ["milk"], group: "dairy", per100: f(61, 3.2, 4.8, 3.3, 0, 5.1, 1.9, 43), typicalGrams: 250 },
  { key: "milk_semi", name: "Semi-skimmed milk", aliases: ["2% milk"], group: "dairy", per100: f(50, 3.3, 4.8, 1.8, 0, 5.0, 1.1, 44), typicalGrams: 250 },
  { key: "yogurt_greek", name: "Greek yogurt, plain", aliases: ["greek yoghurt", "yogurt"], group: "dairy", per100: f(97, 9.0, 3.6, 5.0, 0, 3.6, 3.2, 35), typicalGrams: 170 },
  { key: "yogurt_plain", name: "Natural yogurt, plain", aliases: ["yoghurt"], group: "dairy", per100: f(61, 3.5, 4.7, 3.3, 0, 4.7, 2.1, 46), typicalGrams: 150 },
  { key: "cheddar", name: "Cheddar cheese", aliases: ["cheese", "cheddar"], group: "dairy", per100: f(403, 24.9, 1.3, 33.1, 0, 0.5, 21.0, 653), typicalGrams: 30 },
  { key: "mozzarella", name: "Mozzarella", group: "dairy", per100: f(280, 27.5, 3.1, 17.1, 0, 1.2, 10.9, 627), typicalGrams: 30 },
  { key: "cottage_cheese", name: "Cottage cheese", group: "dairy", per100: f(98, 11.1, 3.4, 4.3, 0, 2.7, 1.7, 364), typicalGrams: 120 },
  { key: "butter", name: "Butter", group: "fat", per100: f(717, 0.9, 0.1, 81.1, 0, 0.1, 51.4, 643), typicalGrams: 10 },
  { key: "cream", name: "Single cream", aliases: ["cream"], group: "dairy", per100: f(198, 2.6, 4.1, 19.3, 0, 4.1, 12.0, 41), typicalGrams: 30 },

  // ---- Fats, nuts, sauces -------------------------------------------------
  { key: "olive_oil", name: "Olive oil", aliases: ["oil"], group: "fat", per100: f(884, 0, 0, 100, 0, 0, 13.8, 2), typicalGrams: 14, servingLabel: "1 tbsp (14 g)" },
  { key: "vegetable_oil", name: "Vegetable oil", aliases: ["sunflower oil", "canola oil"], group: "fat", per100: f(884, 0, 0, 100, 0, 0, 10.0, 0), typicalGrams: 14 },
  { key: "peanut_butter", name: "Peanut butter", group: "nut", per100: f(588, 25.1, 19.6, 50.4, 6.0, 9.2, 10.3, 429), typicalGrams: 32 },
  { key: "almonds", name: "Almonds", group: "nut", per100: f(579, 21.2, 21.6, 49.9, 12.5, 4.4, 3.8, 1), typicalGrams: 28 },
  { key: "walnuts", name: "Walnuts", group: "nut", per100: f(654, 15.2, 13.7, 65.2, 6.7, 2.6, 6.1, 2), typicalGrams: 28 },
  { key: "cashews", name: "Cashews", group: "nut", per100: f(553, 18.2, 30.2, 43.8, 3.3, 5.9, 7.8, 12), typicalGrams: 28 },
  { key: "mayonnaise", name: "Mayonnaise", group: "fat", per100: f(680, 1.0, 0.6, 75.0, 0, 0.6, 11.0, 635), typicalGrams: 15 },
  { key: "ketchup", name: "Ketchup", group: "sweet", per100: f(101, 1.3, 25.8, 0.1, 0.3, 21.8, 0, 907), typicalGrams: 17 },
  { key: "soy_sauce", name: "Soy sauce", group: "prepared", per100: f(53, 8.1, 4.9, 0.6, 0.8, 0.4, 0.1, 5493), typicalGrams: 15 },
  { key: "hummus", name: "Hummus", group: "legume", per100: f(166, 7.9, 14.3, 9.6, 6.0, 0.3, 1.4, 379), typicalGrams: 60 },

  // ---- Prepared / common meals -------------------------------------------
  { key: "pizza_margherita", name: "Pizza, margherita", aliases: ["pizza"], group: "prepared", per100: f(266, 11.0, 33.0, 10.0, 2.3, 3.6, 4.5, 598), typicalGrams: 250 },
  { key: "burger", name: "Beef burger in bun", aliases: ["hamburger", "cheeseburger"], group: "prepared", per100: f(254, 13.0, 22.0, 12.5, 1.5, 4.5, 5.0, 480), typicalGrams: 220 },
  { key: "fries", name: "French fries", aliases: ["chips", "fries"], group: "prepared", per100: f(312, 3.4, 41.4, 14.7, 3.8, 0.3, 2.3, 210), typicalGrams: 140 },
  { key: "sushi_roll", name: "Sushi roll", aliases: ["sushi"], group: "prepared", per100: f(143, 5.8, 25.0, 1.9, 1.3, 3.6, 0.4, 380), typicalGrams: 180 },
  { key: "curry_chicken", name: "Chicken curry with sauce", aliases: ["curry"], group: "prepared", per100: f(140, 11.0, 5.5, 8.5, 1.2, 2.2, 3.0, 340), typicalGrams: 300 },
  { key: "stir_fry_veg", name: "Vegetable stir-fry", aliases: ["stir fry"], group: "prepared", per100: f(85, 3.0, 9.0, 4.0, 2.5, 3.5, 0.6, 320), typicalGrams: 280 },
  { key: "sandwich", name: "Sandwich, mixed filling", group: "prepared", per100: f(235, 10.5, 27.0, 9.0, 2.2, 3.0, 3.0, 520), typicalGrams: 200 },
  { key: "salad_mixed", name: "Mixed salad, dressed", aliases: ["salad"], group: "prepared", per100: f(78, 1.8, 5.0, 5.6, 1.8, 2.6, 0.9, 210), typicalGrams: 200 },
  { key: "soup_vegetable", name: "Vegetable soup", aliases: ["soup"], group: "prepared", per100: f(42, 1.4, 6.5, 1.2, 1.3, 2.4, 0.3, 330), typicalGrams: 300 },
  { key: "omelette", name: "Omelette, plain", group: "prepared", per100: f(154, 10.6, 0.6, 12.0, 0, 0.5, 3.6, 155), typicalGrams: 150 },
  { key: "pancake", name: "Pancakes", aliases: ["pancakes"], group: "prepared", per100: f(227, 6.4, 28.3, 9.7, 0.9, 6.0, 2.2, 439), typicalGrams: 120 },
  { key: "porridge_milk", name: "Porridge made with milk", aliases: ["porridge", "oatmeal cooked"], group: "prepared", per100: f(93, 3.9, 12.6, 2.9, 1.4, 3.5, 1.3, 40), typicalGrams: 300 },

  // ---- Drinks & sweets ----------------------------------------------------
  { key: "orange_juice", name: "Orange juice", aliases: ["juice"], group: "drink", per100: f(45, 0.7, 10.4, 0.2, 0.2, 8.4, 0, 1), typicalGrams: 250 },
  { key: "coffee_black", name: "Coffee, black", aliases: ["coffee"], group: "drink", per100: f(2, 0.1, 0, 0, 0, 0, 0, 2), typicalGrams: 240 },
  { key: "tea_black", name: "Tea, no milk", aliases: ["tea"], group: "drink", per100: f(1, 0, 0.3, 0, 0, 0, 0, 3), typicalGrams: 240 },
  { key: "cola", name: "Cola soft drink", aliases: ["coke", "soda"], group: "drink", per100: f(42, 0, 10.6, 0, 0, 10.6, 0, 4), typicalGrams: 330 },
  { key: "beer", name: "Beer, 4.5%", group: "drink", per100: f(43, 0.5, 3.6, 0, 0, 0.1, 0, 4), typicalGrams: 330, energyFromAlcohol: true },
  { key: "protein_shake", name: "Whey protein shake, prepared", aliases: ["protein shake", "whey"], group: "drink", per100: f(52, 9.0, 2.4, 0.6, 0.3, 1.5, 0.3, 60), typicalGrams: 350 },
  { key: "chocolate_milk", name: "Chocolate", aliases: ["chocolate bar"], group: "sweet", per100: f(535, 7.6, 59.4, 29.7, 3.4, 51.5, 18.5, 79), typicalGrams: 40 },
  { key: "biscuit", name: "Biscuits / cookies", aliases: ["cookie", "biscuits"], group: "sweet", per100: f(480, 5.9, 63.4, 22.5, 2.2, 28.0, 11.0, 400), typicalGrams: 30 },
  { key: "ice_cream", name: "Ice cream, vanilla", group: "sweet", per100: f(207, 3.5, 23.6, 11.0, 0.7, 21.2, 6.8, 80), typicalGrams: 100 },
  { key: "honey", name: "Honey", group: "sweet", per100: f(304, 0.3, 82.4, 0, 0.2, 82.1, 0, 4), typicalGrams: 21 },
  { key: "sugar", name: "Sugar, white", group: "sweet", per100: f(387, 0, 100, 0, 0, 100, 0, 1), typicalGrams: 4 },
];

/** Fast lookup by key. */
export const FOOD_BY_KEY = new Map(FOOD_TABLE.map((food) => [food.key, food]));

/**
 * Cooking adjustments. Cooking mostly changes water content (concentrating
 * nutrients per gram) and, for frying, adds absorbed fat. These are deliberately
 * coarse — enough to stop a fried dish reading like a boiled one, never precise.
 */
export const COOKING_ADJUSTMENTS: Record<
  string,
  { label: string; addedFatGramsPer100: number; note?: string }
> = {
  raw: { label: "Raw", addedFatGramsPer100: 0 },
  boiled: { label: "Boiled", addedFatGramsPer100: 0 },
  steamed: { label: "Steamed", addedFatGramsPer100: 0 },
  stewed: { label: "Stewed", addedFatGramsPer100: 0 },
  grilled: { label: "Grilled", addedFatGramsPer100: 0.5, note: "a little fat renders off" },
  baked: { label: "Baked", addedFatGramsPer100: 0.5 },
  roasted: { label: "Roasted", addedFatGramsPer100: 1.5, note: "assumes a light coat of oil" },
  air_fried: { label: "Air-fried", addedFatGramsPer100: 1 },
  pan_fried: { label: "Pan-fried", addedFatGramsPer100: 3, note: "assumes oil in the pan" },
  deep_fried: { label: "Deep-fried", addedFatGramsPer100: 8, note: "fried food absorbs oil" },
};
