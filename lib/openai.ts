import OpenAI from "openai"
import type { Expense, AlternativeProduct } from "@/lib/utils"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function findAlternatives(expense: {
  name: string
  amount: number
  description: string
  category: string
}): Promise<AlternativeProduct[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set")
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an assistant that provides price comparisons for products and services." },
        {
          role: "user",
          content: `Find alternative options for: ${expense.name} costing ${expense.amount} in the ${expense.category} category. Description: ${expense.description}. Provide product name, description, price, and link to service.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" },
    })

    const content = response.choices[0].message.content
    if (!content) {
      throw new Error("No content in OpenAI response")
    }

    const parsedContent = JSON.parse(content)
    if (!Array.isArray(parsedContent.alternatives)) {
      throw new Error("Invalid response format from OpenAI")
    }

    return parsedContent.alternatives.map((alt: any) => ({
      name: alt.name,
      description: alt.description,
      price: Number.parseFloat(alt.price.replace(/[^0-9.]/g, "")),
      url: alt.url,
    }))
  } catch (error) {
    console.error("Error in findAlternatives:", error)
    throw error
  }
}

/**
 * OpenAI integration to find precise product alternatives
 */
export async function findProductAlternatives(expense: Expense): Promise<{ 
  products: string[],
  searchQueries: string[]
}> {
  // Track progress for UI feedback
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('search-progress', { 
      detail: { source: 'openai', status: 'started', progress: 10 } 
    }));
  }

  // API Key validation
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OpenAI API key not configured");
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search-progress', { 
        detail: { source: 'openai', status: 'error', message: 'API key not configured', progress: 100 } 
      }));
    }
    return { products: [], searchQueries: [] };
  }

  try {
    // Get user location from localStorage
    let locationText = "Australia";
    try {
      if (typeof window !== 'undefined') {
        const suburb = localStorage.getItem('userSuburb');
        const state = localStorage.getItem('userState');
        if (suburb && state) {
          locationText = `${suburb}, ${state}, Australia`;
        }
      }
    } catch (err) {
      console.error("Error accessing localStorage:", err);
    }

    // Format the original product details for context
    const productSpec = extractProductDetails(expense);
    console.log("Product specifications:", productSpec);

    // Progress update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search-progress', { 
        detail: { source: 'openai', status: 'processing', progress: 30 } 
      }));
    }

    // Make request to OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a product comparison expert helping find precise alternatives to products in Australia.
            Your task is to identify exact product alternatives that match all specifications exactly.
            All results MUST match the original product specifications exactly (size, volume, capacity, etc).
            You must provide the exact product name and model, along with search terms to find this product.
            For each alternative, provide 1) the exact product name and 2) a search query to find this product online.`
          },
          {
            role: "user",
            content: `I need to find alternatives to this product in ${locationText}:
            
            Product: ${expense.name}
            Description: ${expense.description}
            Category: ${expense.category}
            Current price: $${expense.amount.toFixed(2)}
            ${productSpec ? `Specifications: ${productSpec}` : ''}
            
            Please provide 5 specific alternative products that:
            1. Match ALL specifications exactly (same size/volume/capacity/etc)
            2. Are available in ${locationText}
            3. Are likely to cost less than $${expense.amount.toFixed(2)}
            
            For each alternative, provide:
            1. The EXACT product name and model
            2. A search query to find this specific product online in ${locationText}
            
            Format your response as a JSON array of objects with 'product' and 'searchQuery' properties.`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in OpenAI response");
    }

    // Parse the JSON response
    const parsedContent = JSON.parse(content);
    const alternatives = Array.isArray(parsedContent.alternatives) 
      ? parsedContent.alternatives 
      : [];

    console.log("OpenAI suggested alternatives:", alternatives);

    // Extract products and search queries
    const products = alternatives.map((alt: { product: string; searchQuery: string }) => alt.product);
    const searchQueries = alternatives.map((alt: { product: string; searchQuery: string }) => alt.searchQuery);

    // Progress update - completed
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search-progress', { 
        detail: { 
          source: 'openai', 
          status: 'completed', 
          count: products.length, 
          progress: 100 
        } 
      }));
    }

    return { 
      products,
      searchQueries
    };
  } catch (error) {
    console.error("Error fetching from OpenAI API:", error);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search-progress', { 
        detail: { 
          source: 'openai', 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error', 
          progress: 100 
        } 
      }));
    }
    return { products: [], searchQueries: [] };
  }
}

/**
 * Extract structured product details from the expense
 */
function extractProductDetails(expense: Expense): string {
  const details: string[] = [];
  
  // Check if description exists before attempting to match
  const description = expense.description || '';
  
  // Extract volume/size information
  const volumeMatch = description.match(/(\d+(?:\.\d+)?)\s*(l|ml|litre|liter)s?\b/i);
  if (volumeMatch) {
    details.push(`Volume: ${volumeMatch[0]}`);
  }
  
  // Extract weight information
  const weightMatch = description.match(/(\d+(?:\.\d+)?)\s*(kg|g|gram|kilogram)s?\b/i);
  if (weightMatch) {
    details.push(`Weight: ${weightMatch[0]}`);
  }
  
  // Extract size information
  const sizeMatch = description.match(/\b(small|medium|large|xl|xxl|xs|s|m|l|size\s+\d+)\b/i);
  if (sizeMatch) {
    details.push(`Size: ${sizeMatch[0]}`);
  }
  
  // Extract brand information
  const brandMatch = description.match(/\b(nike|adidas|puma|reebok|asics|new balance|under armour|apple|samsung|lg|sony)\b/i);
  if (brandMatch) {
    details.push(`Brand: ${brandMatch[0]}`);
  }
  
  // Extract technical specs
  const cpuMatch = description.match(/(\d+)\s*(cpu|core)s?\b/i);
  if (cpuMatch) {
    details.push(`CPU/Cores: ${cpuMatch[0]}`);
  }
  
  const ramMatch = description.match(/(\d+)\s*(gb|mb)\s+ram\b/i);
  if (ramMatch) {
    details.push(`RAM: ${ramMatch[0]}`);
  }
  
  const storageMatch = description.match(/(\d+)\s*(gb|tb|mb)\s+(storage|ssd|hdd|data)\b/i);
  if (storageMatch) {
    details.push(`Storage: ${storageMatch[0]}`);
  }
  
  return details.join(", ");
}

/**
 * Convert an OpenAI product suggestion to an AlternativeProduct object
 * (This will be populated with more data by the Bing search)
 */
export function createInitialAlternative(product: string): AlternativeProduct {
  return {
    id: `openai-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    name: product,
    description: `OpenAI suggested alternative: ${product}`,
    price: 0, // Will be populated by Bing search
    savings: 0, // Will be populated by Bing search
    url: "", // Will be populated by Bing search
    source: "OpenAI",
    type: "physical", // Default, may be updated
    confidence: 90 // High confidence in OpenAI's relevance
  };
}

