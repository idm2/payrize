import type { Expense, AlternativeProduct } from "@/lib/utils";

/**
 * Extract product specifications from expense description
 */
function extractProductSpecs(description: string): {
  volume?: string,
  weight?: string,
  size?: string,
  specs?: Record<string, string>
} {
  const specs: Record<string, string> = {};
  
  // Volume patterns (e.g., 2L, 500ml)
  const volumeMatch = description.match(/(\d+(?:\.\d+)?)\s*(l|ml|litre|liter)s?\b/i);
  if (volumeMatch) {
    const [_, amount, unit] = volumeMatch;
    specs.volume = `${amount}${unit.toLowerCase()}`;
  }
  
  // Weight patterns (e.g., 1kg, 500g)
  const weightMatch = description.match(/(\d+(?:\.\d+)?)\s*(kg|g|gram|kilogram)s?\b/i);
  if (weightMatch) {
    const [_, amount, unit] = weightMatch;
    specs.weight = `${amount}${unit.toLowerCase()}`;
  }
  
  // Size patterns (e.g., Large, XL, 42)
  const sizeMatch = description.match(/\b(small|medium|large|xl|xxl|xs|s|m|l|size\s+\d+)\b/i);
  if (sizeMatch) {
    specs.size = sizeMatch[1];
  }
  
  // Technical specs (e.g., CPU cores, RAM, storage)
  const techSpecs = description.match(/(\d+)\s*(cpu|core|gb|tb|mb|ram|storage|data)\b/gi);
  if (techSpecs) {
    techSpecs.forEach(spec => {
      const [amount, unit] = spec.split(/\s+/);
      specs[unit.toLowerCase()] = amount;
    });
  }
  
  return specs;
}

/**
 * Check if a product matches the required specifications
 */
function matchesSpecifications(productTitle: string, requiredSpecs: ReturnType<typeof extractProductSpecs>): boolean {
  const productSpecs = extractProductSpecs(productTitle);
  
  // Check volume match
  if (requiredSpecs.volume) {
    const reqVolume = normalizeVolume(requiredSpecs.volume);
    const prodVolume = normalizeVolume(productSpecs.volume || '');
    if (!prodVolume || prodVolume !== reqVolume) {
      return false;
    }
  }
  
  // Check weight match
  if (requiredSpecs.weight) {
    const reqWeight = normalizeWeight(requiredSpecs.weight);
    const prodWeight = normalizeWeight(productSpecs.weight || '');
    if (!prodWeight || prodWeight !== reqWeight) {
      return false;
    }
  }
  
  // Check size match
  if (requiredSpecs.size && productSpecs.size) {
    if (productSpecs.size.toLowerCase() !== requiredSpecs.size.toLowerCase()) {
      return false;
    }
  }
  
  // Check technical specs match
  if (requiredSpecs.specs) {
    for (const [key, value] of Object.entries(requiredSpecs.specs)) {
      if (!productSpecs.specs?.[key] || productSpecs.specs[key] !== value) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Normalize volume to milliliters for comparison
 */
function normalizeVolume(volume: string): number {
  if (!volume) return 0;
  const match = volume.match(/(\d+(?:\.\d+)?)\s*(l|ml|litre|liter)s?\b/i);
  if (!match) return 0;
  
  const [_, amount, unit] = match;
  const value = parseFloat(amount);
  
  switch (unit.toLowerCase()) {
    case 'l':
    case 'litre':
    case 'liter':
      return value * 1000;
    case 'ml':
      return value;
    default:
      return 0;
  }
}

/**
 * Normalize weight to grams for comparison
 */
function normalizeWeight(weight: string): number {
  if (!weight) return 0;
  const match = weight.match(/(\d+(?:\.\d+)?)\s*(kg|g|gram|kilogram)s?\b/i);
  if (!match) return 0;
  
  const [_, amount, unit] = match;
  const value = parseFloat(amount);
  
  switch (unit.toLowerCase()) {
    case 'kg':
    case 'kilogram':
      return value * 1000;
    case 'g':
    case 'gram':
      return value;
    default:
      return 0;
  }
}

/**
 * Search for products using Serper.dev
 */
export async function searchProducts(expense: Expense): Promise<AlternativeProduct[]> {
  // Track progress for UI feedback
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('search-progress', { 
      detail: { source: 'serper', status: 'started', progress: 10 } 
    }));
  }

  // Get user location from localStorage
  let userLocation = { suburb: '', state: '', country: 'Australia' };
  try {
    if (typeof window !== 'undefined') {
      const suburb = localStorage.getItem('userSuburb');
      const state = localStorage.getItem('userState');
      userLocation = {
        suburb: suburb || '',
        state: state || '',
        country: 'Australia'
      };
    }
  } catch (err) {
    console.error("Error accessing localStorage:", err);
  }

  // Extract product specifications
  const specs = extractProductSpecs(expense.description);
  console.log("Extracted specifications:", specs);

  // Construct search query with exact specifications
  let searchQuery = expense.name;
  if (specs.volume) searchQuery += ` ${specs.volume}`;
  if (specs.weight) searchQuery += ` ${specs.weight}`;
  if (specs.size) searchQuery += ` size ${specs.size}`;
  
  // Add location context
  if (userLocation.suburb) {
    searchQuery += ` in ${userLocation.suburb} ${userLocation.state} ${userLocation.country}`;
  }
  
  // Add store type context
  searchQuery += ' supermarket store retail';

  try {
    const response = await fetch("https://google.serper.dev/shopping", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_DEV_API_KEY || '',
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        q: searchQuery,
        gl: "au", // Force Australian results
        hl: "en",
        num: 25 // Request more results to ensure we find exact matches
      })
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Serper API response:", data);

    // Filter and transform results
    const alternatives = data.shopping
      .filter((item: any) => {
        // Ensure price is valid and less than original
        const price = parseFloat(item.price.replace(/[^0-9.]/g, ''));
        if (!price || price >= expense.amount) return false;

        // Check specifications match
        return matchesSpecifications(item.title, specs);
      })
      .map((item: any) => {
        const price = parseFloat(item.price.replace(/[^0-9.]/g, ''));
        const storeName = item.source || extractStoreName(item.link);
        
        return {
          id: `serper-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: `${storeName}: ${item.title}`, // Include store name in product title
          description: item.description || `Alternative to ${expense.description}`,
          price,
          savings: expense.amount - price,
          url: item.link,
          source: storeName,
          type: 'physical',
          confidence: calculatePriceConfidence(item)
        };
      });

    console.log(`Found ${alternatives.length} matching alternatives`);
    return alternatives;

  } catch (error) {
    console.error("Error searching products:", error);
    return [];
  }
}

/**
 * Extract store name from product URL
 */
function extractStoreName(url: string): string {
  try {
    const domain = new URL(url).hostname;
    const storeName = domain
      .replace(/^www\./i, '')
      .replace(/\.com(\.au)?$/i, '')
      .split('.')
      .shift();
    return storeName ? 
      storeName.charAt(0).toUpperCase() + storeName.slice(1) : 
      'Online Store';
  } catch {
    return 'Online Store';
  }
}

/**
 * Calculate confidence score for price accuracy
 */
function calculatePriceConfidence(item: any): number {
  let confidence = 70; // Base confidence
  
  // Increase confidence for well-known retailers
  if (item.source && /woolworths|coles|aldi|bigw|kmart|target/i.test(item.source)) {
    confidence += 20;
  }
  
  // Decrease confidence for marketplace sites
  if (item.source && /ebay|amazon|gumtree/i.test(item.source)) {
    confidence -= 20;
  }
  
  return Math.min(100, Math.max(0, confidence));
} 