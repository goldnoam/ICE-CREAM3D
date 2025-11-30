import { Flavor, Difficulty } from './types';

export const FLAVOR_COLORS: Record<Flavor, string> = {
  [Flavor.VANILLA]: '#F3E5AB',
  [Flavor.CHOCOLATE]: '#5D4037',
  [Flavor.STRAWBERRY]: '#FF80AB',
  [Flavor.MINT]: '#80CBC4',
  [Flavor.BLUEBERRY]: '#7986CB',
  [Flavor.LEMON]: '#FFF176',
  [Flavor.COFFEE]: '#6F4E37',
  [Flavor.PISTACHIO]: '#93C572',
  [Flavor.MANGO]: '#FFCC80',
  [Flavor.COOKIE_DOUGH]: '#E1C699',
};

export const DIFFICULTY_SETTINGS = {
  [Difficulty.EASY]: { maxScoops: 1, timeLimit: 30, coinMultiplier: 1 },
  [Difficulty.MEDIUM]: { maxScoops: 2, timeLimit: 20, coinMultiplier: 2 },
  [Difficulty.HARD]: { maxScoops: 3, timeLimit: 15, coinMultiplier: 3 },
  [Difficulty.EXPERT]: { maxScoops: 4, timeLimit: 12, coinMultiplier: 5 },
  [Difficulty.MASTER]: { maxScoops: 5, timeLimit: 10, coinMultiplier: 10 },
};

export const FALLBACK_CUSTOMER = {
  name: "Timmy",
  personality: "Likes simple things.",
  dialogue: "I just want a vanilla cone!",
  order: {
    container: "Cone",
    layers: ["Vanilla"],
    topping: "None"
  }
};