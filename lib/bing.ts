import type { Expense, AlternativeProduct } from "@/lib/utils";

interface BingSearchResult {
  name: string;
  url: string;
  snippet: string;
  deepLinks?: Array<{
    name: string;
    url: string;
    snippet?: string;
  }>;
}

/**
 * Bing Search API integration to validate and enhance OpenAI's product suggestions
 */
export async function validateProductAlternatives(
  expense: Expense,
  productSuggestions: string[],
  searchQueries: string[]
): Promise<AlternativeProduct[]> {
  // Track progress for UI feedback
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('search-progress', { 
      detail: { source: 'bing', status: 'started', progress: 10 } 
    }));
  }

  // API Key validation
  const apiKey = process.env.BING_SEARCH_API_KEY;
  if (!apiKey) {
    console.error("Bing Search API key not configured");
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search-progress', { 
        detail: { source: 'bing', status: 'error', message: 'API key not configured', progress: 100 } 
      }));
    }
    return [];
  }

  try {
    // Get user location from localStorage
    let locationContext = "Australia";
    try {
      if (typeof window !== 'undefined') {
        const suburb = localStorage.getItem('userSuburb');
        const state = localStorage.getItem('userState');
        if (suburb && state) {
          locationContext = `${suburb} ${state} Australia`;
        }
      }
    } catch (err) {
      console.error("Error accessing localStorage:", err);
    }

    // Progress update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search-progress', { 
        detail: { source: 'bing', status: 'searching', progress: 30 } 
      }));
    }

    // Validate each product suggestion with Bing Search
    const validatedResults: AlternativeProduct[] = [];
    
    // Using Promise.all to run searches in parallel (limited to 5 at a time)
    const searchPromises = searchQueries.map((query, index) => {
      const productName = productSuggestions[index];
      
      // Add location and price context to the search query
      const enhancedQuery = `${query} price ${locationContext}`;
      
      return performBingSearch(enhancedQuery, apiKey)
        .then(searchResults => {
          // Process search results to extract product information
          const productInfo = extractProductInfo(searchResults, productName, expense);
          
          if (productInfo) {
            validatedResults.push(productInfo);
          }
        })
        .catch(err => {
          console.error(`Error searching for product "${productName}":`, err);
        });
    });
    
    await Promise.all(searchPromises);

    // Progress update - completed
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search-progress', { 
        detail: { 
          source: 'bing', 
          status: 'completed', 
          count: validatedResults.length, 
          progress: 100 
        } 
      }));
    }

    // Sort validated results by price (lowest first)
    const sortedResults = validatedResults
      .filter(alt => alt.price > 0 && alt.price < expense.amount)
      .sort((a, b) => a.price - b.price);

    return sortedResults;
  } catch (error) {
    console.error("Error validating product alternatives:", error);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search-progress', { 
        detail: { 
          source: 'bing', 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error', 
          progress: 100 
        } 
      }));
    }
    return [];
  }
}

/**
 * Perform a Bing search with the given query
 */
async function performBingSearch(query: string, apiKey: string): Promise<BingSearchResult[]> {
  console.log(`Searching Bing for: "${query}"`);

  const encodedQuery = encodeURIComponent(query);
  const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodedQuery}&count=10&responseFilter=Webpages`;

  const response = await fetch(url, {
    headers: {
      "Ocp-Apim-Subscription-Key": apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`Bing Search API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.webPages || !data.webPages.value || !Array.isArray(data.webPages.value)) {
    return [];
  }

  return data.webPages.value;
}

/**
 * Extract product information from Bing search results
 */
function extractProductInfo(
  searchResults: BingSearchResult[], 
  productName: string, 
  expense: Expense
): AlternativeProduct | null {
  if (!searchResults || searchResults.length === 0) {
    return null;
  }

  // Find relevant search results (prioritize product pages)
  const relevantResults = searchResults.filter(result => 
    // Check for price indicators
    result.snippet.includes("$") || 
    // Check for product name match
    result.name.toLowerCase().includes(productName.toLowerCase()) ||
    // Check for shopping sites
    result.url.includes("shop") || 
    result.url.includes("product") || 
    result.url.includes("store")
  );

  if (relevantResults.length === 0) {
    return null;
  }

  // Take the first relevant result
  const bestResult = relevantResults[0];
  
  // Extract price information
  const price = extractPrice(bestResult.snippet);
  if (!price || price >= expense.amount) {
    // No valid price found or price is not lower than original
    return null;
  }

  // Extract store/retailer information
  const storeName = extractStoreName(bestResult.url);

  // Create the alternative product
  return {
    id: `bing-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: productName,
    description: truncateText(bestResult.snippet, 120),
    price,
    savings: expense.amount - price,
    url: bestResult.url,
    source: storeName,
    type: 'physical',
    confidence: 80
  };
}

/**
 * Extract price from text
 */
function extractPrice(text: string): number | null {
  if (!text) return null;

  // Look for price patterns in the text
  const priceMatches = text.match(/\$\s?(\d+(?:\.\d{1,2})?)/g);
  if (!priceMatches || priceMatches.length === 0) {
    return null;
  }

  // Convert price matches to numbers and get the lowest valid price
  const prices = priceMatches
    .map(match => parseFloat(match.replace(/[^\d.]/g, '')))
    .filter(price => !isNaN(price) && price > 0)
    .sort((a, b) => a - b);

  if (prices.length === 0) {
    return null;
  }

  return prices[0]; // Return the lowest price
}

/**
 * Extract store name from URL
 */
function extractStoreName(url: string): string {
  try {
    const domain = new URL(url).hostname;
    // Remove www. and .com/.com.au
    const storeName = domain
      .replace(/^www\./i, '')
      .replace(/\.com(\.au)?$/i, '')
      .split('.')
      .shift();
    
    if (!storeName) return 'Online Store';
    
    // Capitalize first letter
    return storeName.charAt(0).toUpperCase() + storeName.slice(1);
  } catch (error) {
    return 'Online Store';
  }
}

/**
 * Truncate text to a maximum length
 */
function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
} 