export enum Flavor {
  VANILLA = 'Vanilla',
  CHOCOLATE = 'Chocolate',
  STRAWBERRY = 'Strawberry',
  MINT = 'Mint',
  BLUEBERRY = 'Blueberry',
  LEMON = 'Lemon',
  COFFEE = 'Coffee',
  PISTACHIO = 'Pistachio',
  MANGO = 'Mango',
  COOKIE_DOUGH = 'Cookie Dough'
}

export enum Topping {
  SPRINKLES = 'Sprinkles',
  CHERRY = 'Cherry',
  NONE = 'None'
}

export enum Container {
  CONE = 'Cone',
  CUP = 'Cup'
}

export interface IceCreamLayer {
  id: string;
  flavor: Flavor;
}

export interface Order {
  container: Container;
  layers: Flavor[]; // Bottom to Top
  topping: Topping;
}

export interface Customer {
  name: string;
  personality: string;
  order: Order;
  dialogue: string;
}

export enum GameState {
  MENU = 'MENU',
  LOADING_ORDER = 'LOADING_ORDER',
  PLAYING = 'PLAYING',
  RESULT = 'RESULT',
  GAME_OVER = 'GAME_OVER'
}

export enum Difficulty {
  EASY = 'Easy', // 1 scoop, more time
  MEDIUM = 'Medium', // 2 scoops, normal time
  HARD = 'Hard', // 3 scoops, less time
  EXPERT = 'Expert', // 4 scoops, tight time
  MASTER = 'Master' // 5 scoops, extreme
}