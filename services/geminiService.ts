import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Difficulty, Customer, Flavor, Topping, Container } from "../types";
import { FALLBACK_CUSTOMER } from "../constants";

// Define the response schema for strict JSON output
const customerSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Customer name" },
    personality: { type: Type.STRING, description: "Short personality trait" },
    dialogue: { type: Type.STRING, description: "What the customer says to order" },
    order: {
      type: Type.OBJECT,
      properties: {
        container: { type: Type.STRING, enum: Object.values(Container) },
        layers: {
          type: Type.ARRAY,
          items: { type: Type.STRING, enum: Object.values(Flavor) },
          description: "List of flavors from bottom to top"
        },
        topping: { type: Type.STRING, enum: Object.values(Topping) }
      },
      required: ["container", "layers", "topping"]
    }
  },
  required: ["name", "personality", "dialogue", "order"]
};

export const generateCustomerOrder = async (difficulty: Difficulty): Promise<Customer> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found. Using fallback customer.");
    return FALLBACK_CUSTOMER as unknown as Customer;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let numScoops = 1;
  if (difficulty === Difficulty.MEDIUM) numScoops = 2;
  if (difficulty === Difficulty.HARD) numScoops = 3;
  if (difficulty === Difficulty.EXPERT) numScoops = 4;
  if (difficulty === Difficulty.MASTER) numScoops = 5;

  const prompt = `
    Generate a fun ice cream shop customer.
    They want an ice cream with exactly ${numScoops} scoop(s).
    Available Flavors: ${Object.values(Flavor).join(', ')}.
    Available Toppings: ${Object.values(Topping).join(', ')}.
    Available Containers: ${Object.values(Container).join(', ')}.
    
    Make the dialogue funny or quirky based on their personality.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: customerSchema,
        temperature: 1.2, // High creativity
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as Customer;
    }
    throw new Error("Empty response");
  } catch (error) {
    console.error("Gemini API Error:", error);
    return FALLBACK_CUSTOMER as unknown as Customer;
  }
};