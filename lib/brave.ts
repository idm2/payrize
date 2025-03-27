import type { Expense, AlternativeProduct } from "@/lib/utils"

const BRAVE_API_KEY = process.env.BRAVE_API_KEY
const BRAVE_SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1/web/search"

// Rate limiting state
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // Minimum 1 second between requests

/**
 * Searches for product alternatives using Brave Search API
 * @param expense The expense to find alternatives for
 * @returns Array of alternative products
 */
export async function searchAlternatives(expense: Expense): Promise<AlternativeProduct[]> {
  // Track progress for UI feedback
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('search-progress', { 
      detail: { source: 'brave', status: 'started', progress: 10 } 
    }));
  }

  // Check for API key
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    const error = new Error("Brave API key not configured");
    console.error(error);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search-progress', { 
        detail: { source: 'brave', status: 'error', message: error.message, progress: 100 } 
      }));
    }
    throw error;
  }

  try {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const delay = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`[Brave Search] Rate limiting - waiting ${delay}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    lastRequestTime = Date.now();

    // Update progress
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('search-progress', { 
        detail: { source: 'brave', status: 'searching', progress: 30 } 
      }));
    }
    
    // Create search query with location context if available
    const searchQuery = createSearchQuery(expense);
    console.log(`[Brave Search] Query: "${searchQuery}"`);
    console.log(`[Brave Search] Expense details:`, {
      name: expense.name,
      category: expense.category,
      amount: expense.amount,
      isPhysical: expense.isPhysical
    });

    // Define request options with correct API key
    const options = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey
      }
    };

    // Make the API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const apiUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&country=AU&search_lang=en&count=10&type=search&freshness=month`;
    console.log(`[Brave Search] API URL: ${apiUrl}`);
    
    try {
      const response = await fetch(apiUrl, { ...options, signal: controller.signal });
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Update progress
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('search-progress', { 
          detail: { source: 'brave', status: 'processing', progress: 60 } 
        }));
      }
      
      if (!response.ok) {
        const error = new Error(`Brave API returned ${response.status}: ${response.statusText}`);
        console.error(error);
        throw error;
      }
      
      const searchResults = await response.json();
      console.log(`[Brave Search] Raw API response:`, searchResults);
      
      if (!searchResults.web?.results || searchResults.web.results.length === 0) {
        console.log("[Brave Search] No results from API");
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('search-progress', { 
            detail: { source: 'brave', status: 'no-results', progress: 100 } 
          }));
        }
        return [];
      }
      
      // Update progress
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('search-progress', { 
          detail: { source: 'brave', status: 'processing', progress: 80 } 
        }));
      }
      
      // Process results to extract product information
      console.log(`[Brave Search] Processing ${searchResults.web.results.length} results`);
      
      const productResults = searchResults.web.results
        .filter((result: any) => {
          const isRelevant = isRelevantResult(result, expense.name);
          console.log(`[Brave Search] Result relevance check:`, {
            title: result.title,
            isRelevant
          });
          return isRelevant;
        })
        .map((result: any) => {
          console.log(`[Brave Search] Processing result:`, {
            title: result.title,
            description: result.description
          });
          
          // Extract store name and price
          const storeName = extractStoreName(result.title, result.description);
          const price = extractPrice(result.description, result.title, expense.amount);
          
          // Skip if we couldn't extract required information
          if (!storeName || !price) {
            console.log(`[Brave Search] Skipping result - missing data:`, {
              hasStoreName: !!storeName,
              hasPrice: !!price
            });
            return null;
          }
          
          // Calculate savings
          const savings = Math.max(0, expense.amount - price);
          
          // Only include results with actual savings
          if (savings <= 0) {
            console.log(`[Brave Search] Skipping result - no savings`);
            return null;
          }
          
          return {
            id: `brave-${Date.now()}-${Math.random()}`,
            name: storeName,
            description: result.description,
            price,
            savings,
            url: result.url,
            source: "Brave Search"
          };
        })
        .filter(Boolean); // Remove null results
      
      console.log(`[Brave Search] Found ${productResults.length} valid alternatives with savings`);
      
      // Update progress
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('search-progress', { 
          detail: { source: 'brave', status: 'complete', count: productResults.length, progress: 100 } 
        }));
      }
      
      return productResults;
      
    } catch (error) {
      // Clear timeout
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error("[Brave Search] Request timed out after 15 seconds");
          throw new Error("Request timed out");
        }
        throw error;
      }
      throw new Error("An unknown error occurred");
    }
  } catch (error) {
    console.error("[Brave Search] Error:", error);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search-progress', { 
        detail: { 
          source: 'brave', 
          status: 'error', 
          message: error instanceof Error ? error.message : 'An unknown error occurred',
          progress: 100 
        } 
      }));
    }
    throw error;
  }
}

// Create a better search query that will find relevant products with pricing
function createSearchQuery(expense: Expense): string {
  const productName = expense.name.toLowerCase();
  const category = (expense.category || '').toLowerCase();
  
  // Start with the product name and add "price" or "cost" to focus on pricing info
  let query = `${productName} price cost`;
  
  // Add category-specific context
  if (category) {
    query += ` ${category}`;
  }
  
  // Add location context for physical products
  if (expense.isPhysical) {
    query += " store shop retail location near";
  }
  
  // Add category-specific retailer context
  if (isGroceryItem(expense)) {
    query += " supermarket woolworths coles aldi";
  } else if (category.includes('electronics')) {
    query += " jb hi-fi harvey norman officeworks";
  } else if (category.includes('clothing') || category.includes('shoes')) {
    query += " retail store foot locker athletes foot";
  } else if (category.includes('home')) {
    query += " ikea freedom fantastic furniture";
  }
  
  // Add "australia" to focus on local results
  query += " australia";
  
  return query;
}

function isGroceryItem(expense: Expense): boolean {
  const groceryKeywords = ['milk', 'bread', 'eggs', 'cheese', 'meat', 'fruit', 'grocery', 'food'];
  
  return groceryKeywords.some(keyword => 
    expense.name.toLowerCase().includes(keyword) || 
    (expense.category && expense.category.toLowerCase().includes(keyword))
  );
}

/**
 * Determines if search result likely represents a product page
 */
function isLikelyProductPage(title: string, description: string, expenseName: string): boolean {
  // Check if title or description contains indicators of a product page
  const productIndicators = ['plan', 'pricing', 'package', 'subscription', 'service', 'bundle', 'buy']
  const lowerTitle = title.toLowerCase()
  const lowerDesc = description.toLowerCase()
  const lowerExpense = expenseName.toLowerCase()
  
  // Check if title contains product indicators or expense name
  const titleHasIndicator = productIndicators.some(indicator => lowerTitle.includes(indicator))
  const titleHasExpense = lowerTitle.includes(lowerExpense) || 
    lowerExpense.split(' ').some(word => word.length > 3 && lowerTitle.includes(word))
  
  // Check if description contains pricing patterns
  const descHasPricing = lowerDesc.includes('$') || 
    lowerDesc.includes('price') || 
    lowerDesc.includes('cost') ||
    lowerDesc.includes('month') ||
    lowerDesc.includes('/mo')
  
  return (titleHasIndicator || titleHasExpense) && descHasPricing
}

/**
 * Extract price using multiple regex patterns, with improved handling for services
 */
function extractPrice(description: string, title: string, originalPrice: number): number | null {
  // Combine text for better chance of finding price
  const combinedText = `${description} ${title}`
  
  // Check if this is likely an insurance product
  const isInsuranceProduct = 
    combinedText.toLowerCase().includes('insurance') || 
    combinedText.toLowerCase().includes('health cover') ||
    combinedText.toLowerCase().includes('health plan') ||
    combinedText.toLowerCase().includes('medicare');
  
  // Try to find price patterns with $ symbol (most reliable)
  const dollarPatterns = [
    /\$(\d+\.\d{1,2})(?:\s*\/\s*mo|\s*per\s*month|\s*monthly)?/i,       // $xx.xx /mo or per month
    /(?:just|only|price:?|cost:?|pay:?)\s*\$(\d+\.\d{1,2})/i,            // only $xx.xx
    /\$(\d+\.\d{1,2})(?!\d)/,                                            // $xx.xx not followed by digits
    /(?:costs?|price|from|for|at)\s*\$(\d+)(?:\.\d{1,2})?(?:\s*\/|\s*per)?/i, // price from $xx
    /(\d+\.\d{1,2})\s*(?:dollars|USD)/i,                                 // xx.xx dollars
    /\$(\d+)(?!\d)(?:\s*\/\s*mo|\s*per\s*month|\s*monthly)?/i            // $xx /mo (no decimal)
  ]
  
  // Service-specific patterns - these look for pricing in formats commonly used for services
  const servicePatterns = [
    /starting\s*(?:at|from)?\s*\$(\d+(?:\.\d{1,2})?)/i,                  // starting at $xx
    /average\s*(?:cost|price)\s*(?:of|is)?\s*\$(\d+(?:\.\d{1,2})?)/i,    // average cost of $xx
    /plans?\s*(?:start|begins?|from)?\s*(?:at|from)?\s*\$(\d+(?:\.\d{1,2})?)/i, // plans start at $xx
    /costs?\s*(?:around|about|approximately)?\s*\$(\d+(?:\.\d{1,2})?)/i, // costs around $xx
    /\$(\d+(?:\.\d{1,2})?)\s*(?:a|per)\s*(?:year|yr|annum)/i,            // $xx per year
    /(\d+(?:\.\d{1,2})?)\s*(?:a|per)\s*(?:year|yr|annum)/i,              // xx per year
    /annual\s*(?:premium|cost|price)\s*(?:of|is)?\s*\$?(\d+(?:\.\d{1,2})?)/i // annual premium of $xx
  ]
  
  // Look for monthly price patterns (second most reliable)
  const monthlyPatterns = [
    /(\d+\.\d{1,2})\s*(?:\/|per)\s*month/i,                              // xx.xx /month
    /(\d+)\s*(?:\/|per)\s*mo(?:nth)?/i,                                  // xx /mo or /month
    /monthly\s*(?:cost|price|rate):?\s*(?:\$)?(\d+(?:\.\d{1,2})?)/i,     // monthly cost: $xx.xx
    /(\d+(?:\.\d{1,2})?)\s*(?:\/|per)\s*month/i                          // xx.xx per month
  ]
  
  // Insurance-specific price patterns
  const insurancePatterns = [
    /premium\s*(?:of|is|:)?\s*\$?(\d+(?:\.\d{1,2})?)/i,                // premium of $xx.xx
    /cover\s*(?:from|starting|costs|at)?\s*\$?(\d+(?:\.\d{1,2})?)/i,    // cover from $xx.xx
    /(?:monthly|annual)\s*cost\s*(?:of|is|:)?\s*\$?(\d+(?:\.\d{1,2})?)/i, // monthly cost of $xx.xx
    /\$(\d+(?:\.\d{1,2})?)\s*(?:a|per)\s*(?:month|fortnight|week)/i,    // $xx.xx per month
    /(?:from|for|only)\s*\$(\d+(?:\.\d{1,2})?)\s*(?:per|a|\/)\s*(?:month|fortnight|week)/i, // from $xx.xx per month
    /(?:basic|starter|standard|bronze)\s*(?:plan|cover|policy)?\s*(?:for|at|:)?\s*\$?(\d+(?:\.\d{1,2})?)/i // basic plan at $xx.xx
  ];
  
  // Choose appropriate patterns based on product type
  const patternsToUse = isInsuranceProduct 
    ? [...insurancePatterns, ...dollarPatterns, ...servicePatterns, ...monthlyPatterns]
    : [...dollarPatterns, ...monthlyPatterns];
  
  // Try each pattern
  for (const pattern of patternsToUse) {
    const match = combinedText.match(pattern)
    if (match && match[1]) {
      const extractedPrice = parseFloat(match[1])
      // Verify price is reasonable compared to original
      if (extractedPrice > 0 && extractedPrice < originalPrice) {
        // For service-based products, do additional validation
        if (isInsuranceProduct && extractedPrice < (originalPrice * 0.5)) {
          // For service products, be more conservative with very low prices - they might be partial costs
          // Only accept if price is explicitly monthly or description clearly indicates it's the full price
          const hasMonthlyIndicator = /mo(?:nth)?|annual|yearly|subscription|premium/i.test(combinedText);
          const hasFullPriceIndicator = /full\s*price|total\s*cost|all\s*inclusive/i.test(combinedText);
          
          if (!hasMonthlyIndicator && !hasFullPriceIndicator && extractedPrice < (originalPrice * 0.5)) {
            // Skip suspicious service prices unless they're clearly marked
            continue;
          }
        }
        return extractedPrice
      }
    }
  }
  
  return null
}

/**
 * Determine if the extracted price is reasonable
 */
function isPriceReasonable(price: number, originalPrice: number): boolean {
  // Insurance products often have a wider range of valid alternatives
  const isInsurancePrice = originalPrice > 50 && originalPrice < 500;
  
  // Adjust minimum price ratio based on product type
  const minPriceRatio = isInsurancePrice ? 0.25 : 0.35; // More flexible for insurance
  const maxPriceRatio = isInsurancePrice ? 0.95 : 0.9; // Allow prices closer to original for insurance
  
  // Price should be lower than original but not suspiciously low
  return price > 0 && 
    price < (originalPrice * maxPriceRatio) && 
    price >= (originalPrice * minPriceRatio);
}

/**
 * Validate URLs to ensure they're likely to work
 */
function isLikelyValidURL(url: string): boolean {
  // Skip URLs that are likely to be irrelevant or broken
  const suspiciousPatterns = [
    /youtube\.com/i,
    /facebook\.com/i,
    /twitter\.com/i,
    /instagram\.com/i,
    /reddit\.com/i,
    /wikipedia\.org/i,
    /pinterest\.com/i
  ];
  
  // Check if URL matches any suspicious pattern
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url)) {
      return false;
    }
  }
  
  // Check if URL is from a comparison site (these often don't link directly to products)
  const comparisonSites = [
    /compare\.com/i,
    /versus\.com/i,
    /pricegrabber\.com/i,
    /shopzilla\.com/i
  ];
  
  for (const site of comparisonSites) {
    if (site.test(url)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Clean up product name for better display
 */
function cleanProductName(title: string, expenseName: string): string {
  // Remove common search result prefixes/suffixes
  let cleanTitle = title
    .replace(/^best\s+/i, '')
    .replace(/\s+reviews?$/i, '')
    .replace(/\s*\|\s*.+$/, '') // Remove pipe and everything after
    .replace(/\s*-\s*.+$/, '')  // Remove dash and everything after
    .replace(/\s*\d{4}$/, '')   // Remove year at end
    .trim()
  
  // If title is too long, try to extract the most relevant part
  if (cleanTitle.length > 50) {
    // Try to find plan name with the expense type
    const expenseType = expenseName.split(' ').pop()?.toLowerCase() || ''
    const planMatch = cleanTitle.match(new RegExp(`([\\w\\s]+${expenseType}[\\w\\s]+)`, 'i'))
    
    if (planMatch && planMatch[1]) {
      return planMatch[1].trim()
    }
    
    // Otherwise just truncate
    return cleanTitle.substring(0, 50) + '...'
  }
  
  return cleanTitle
}

/**
 * Format description to be more product-focused
 */
function formatDescription(description: string, location: string | undefined): string {
  if (!location) {
    // Extract most relevant part of description (first sentence usually has key info)
    const firstSentence = description.split(/\.|\!|\?/)[0];
    
    if (firstSentence.length > 20) {
      return firstSentence.trim();
    }
    
    // If first sentence is too short, use more of the description
    return description.length > 120 ? 
      description.substring(0, 120).trim() + '...' : 
      description.trim();
  }
  
  // For physical products with location, prioritize that information
  if (description.includes(location)) {
    // Find the sentence containing the location
    const sentences = description.split(/[.!?]+/);
    for (const sentence of sentences) {
      if (sentence.includes(location)) {
        return `📍 ${sentence.trim()}`;
      }
    }
  }
  
  // If location not found in description, combine location with first sentence
  const firstSentence = description.split(/\.|\!|\?/)[0];
  return `📍 Located at: ${location}. ${firstSentence.length > 20 ? firstSentence.trim() : description.substring(0, 100).trim()}`;
}

/**
 * Calculate confidence level for the price (0-100)
 */
function calculatePriceConfidence(price: number, originalPrice: number, description: string): number {
  const isInsurance = /insurance|cover|policy|premium|health plan/i.test(description);
  
  // Default base confidence - lower for insurance due to price variability
  let confidence = isInsurance ? 60 : 70;
  
  // Check for insurance-specific terms that increase confidence
  if (isInsurance) {
    if (/official\s*premium|current\s*rates|pricing\s*information/i.test(description)) {
      confidence += 15;
    }
    
    // Check if description mentions specific coverage details (increases confidence)
    if (/cover(?:s|age)?\s*(?:includes?|provides?|offers?)/i.test(description)) {
      confidence += 10;
    }
    
    // References to comparison or official sources increase confidence
    if (/compare\s*the\s*market|official\s*provider|direct\s*from/i.test(description)) {
      confidence += 10;
    }
  } else {
    // Check for explicit price patterns that increase confidence
    if (/official\s*price|current\s*price|pricing|costs?\s*only/i.test(description)) {
      confidence += 10;
    }
    
    // Check for terms that suggest the price might be partial or not current
    if (/estimate|approximately|around|about|up\s*to/i.test(description)) {
      confidence -= 10;
    }
    
    // Price very close to original is suspicious in a comparison context
    const priceRatio = price / originalPrice;
    if (priceRatio > 0.9) {
      confidence -= 15;
    } else if (priceRatio < 0.5) {
      // Very low prices might be missing fees or other costs
      confidence -= 10;
    }
  }
  
  // Cap confidence between 0-100
  return Math.max(0, Math.min(100, confidence));
}

/**
 * Validate URL by checking if it returns a valid response
 * @param url The URL to validate
 * @returns A promise that resolves to a boolean indicating if the URL is valid
 */
async function isValidURL(url: string): Promise<boolean> {
  try {
    // Only attempt to validate if URL is properly formatted
    if (!url.startsWith('http')) {
      return false;
    }
    
    // Attempt a HEAD request with a short timeout to check if URL exists
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        // Use a standard user agent to avoid being blocked
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      redirect: 'follow',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Consider success if we get a 2xx or 3xx response
    return response.ok || (response.status >= 200 && response.status < 400);
  } catch (error) {
    console.log(`URL validation failed for ${url}:`, error);
    return false;
  }
}

/**
 * Determines if the expense is likely a physical product like grocery items
 */
function isPhysicalProduct(expense: Expense): boolean {
  // Check if explicitly marked as physical
  if (expense.isPhysical) {
    return true;
  }
  
  // Check category - safely handle potentially undefined category
  const physicalCategories = ['grocery', 'food', 'supermarket', 'shopping', 'retail'];
  const category = expense.category || '';
  if (physicalCategories.some(cat => category.toLowerCase().includes(cat))) {
    return true;
  }
  
  // Check product name for grocery items
  if (isGroceryItem(expense)) {
    return true;
  }
  
  // Check description for physical indicators
  const physicalKeywords = ['store', 'shop', 'buy', 'purchase', 'supermarket', 'mall', 'retail'];
  if (expense.description && physicalKeywords.some(kw => expense.description?.toLowerCase().includes(kw))) {
    return true;
  }
  
  return false;
}

/**
 * Extract location information from search results for physical products
 * Enhanced to specifically find the closest store locations based on user settings
 */
function extractLocationInfo(description: string, title: string, expense: Expense): string | undefined {
  const combinedText = `${description} ${title}`;
  
  // Get user location preferences
  const userSuburb = getLocalStorageItem('userSuburb');
  const userCountry = getLocalStorageItem('userCountry');
  
  // Create array of store names for common stores in Australia
  const storeNames = ['Woolworths', 'Coles', 'Aldi', 'IGA', 'Foodland', 'Foodworks', 
                      'Big W', 'Kmart', 'Target', 'Bunnings', 'Officeworks'];
                      
  // See if we can find a store name in the result
  const foundStore = storeNames.find(store => 
    title.includes(store) || description.includes(store)
  );
  
  // If we found a store and have location information, format it properly
  if (foundStore) {
    // Try to find specific address for the store
    const addressPatterns = [
      new RegExp(`${foundStore}[^\.]+?at\\s+([^\.]+)`, 'i'),
      new RegExp(`${foundStore}[^\.]+?in\\s+([^\.]+)`, 'i'),
      new RegExp(`${foundStore}[^\.]+?near\\s+([^\.]+)`, 'i'),
      new RegExp(`${foundStore}[^\.]+?located\\s+(?:at|in)\\s+([^\.]+)`, 'i'),
      /(\d+\s+[A-Za-z]+\s+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Place|Pl)[^\.]+)/i,
      /in\s+([A-Za-z\s]+(?:Mall|Shopping Centre|Center|Plaza)[^\.]+)/i,
    ];
    
    // Try each pattern to find a location
    for (const pattern of addressPatterns) {
      const match = combinedText.match(pattern);
      if (match && match[1]) {
        return `${foundStore}, ${match[1].trim()}`;
      }
    }
    
    // If we have a user suburb, use that with the store
    if (userSuburb) {
      return `${foundStore}, ${userSuburb}${userCountry ? ', ' + userCountry : ''}`;
    }
    
    // No specific address but we found the store
    return `${foundStore}, nearest location to you`;
  }
  
  // No store found, look for any address patterns
  const genericAddressPatterns = [
    /located at\s+([^\.]+)/i,
    /address\s*:?\s*([^\.]+)/i,
    /store (?:at|in|on|near)\s+([^\.]+)/i,
    /nearest store\s+(?:at|in|on|near)\s+([^\.]+)/i,
    /closest\s+(?:location|store|shop)\s+(?:at|in|on|near)?\s+([^\.]+)/i,
    /available\s+(?:at|in|on|near)\s+([^\.]+)/i,
    /in\s+([A-Za-z\s]+(?:Mall|Shopping Centre|Center|Plaza)[^\.]+)/i,
  ];
  
  for (const pattern of genericAddressPatterns) {
    const match = combinedText.match(pattern);
    if (match && match[1]) {
      // Found a location - check if it contains the user's suburb
      if (userSuburb && match[1].includes(userSuburb)) {
        return match[1].trim();
      }
      // If no user suburb match, just return what we found
      return match[1].trim();
    }
  }
  
  // If we reach here, no specific location was found
  // For grocery or retail items, provide a general location based on user settings
  if (isGroceryItem(expense) && userSuburb) {
    if (expense.name.toLowerCase().includes('milk') || 
        expense.name.toLowerCase().includes('bread') ||
        expense.name.toLowerCase().includes('eggs')) {
      // For common grocery items, suggest the nearest supermarket
      return `Nearest supermarket in ${userSuburb}`;
    }
    
    // Generic location based on user suburb
    return `Available in ${userSuburb}${userCountry ? ', ' + userCountry : ''}`;
  }
  
  // No location information found
  return undefined;
}

// Helper function for safe localStorage access
function getLocalStorageItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch (e) {
    console.error('Error accessing localStorage:', e);
  }
  return null;
}

// Helper function to extract store name from search result
function extractStoreName(title: string, description: string): string | null {
  // List of known retailers
  const knownRetailers = [
    'Woolworths', 'Coles', 'Aldi', 'IGA',
    'JB Hi-Fi', 'Harvey Norman', 'Officeworks',
    'Foot Locker', "Athlete's Foot", 'Nike',
    'IKEA', 'Freedom', 'Fantastic Furniture'
  ];
  
  // Check for known retailers in title and description
  for (const retailer of knownRetailers) {
    if (title.includes(retailer) || description.includes(retailer)) {
      return retailer;
    }
  }
  
  // Extract store name patterns
  const storePatterns = [
    /at\s+([A-Z][A-Za-z\s&]+?)(?:\sin|near|for|from|\$|\.)/,
    /from\s+([A-Z][A-Za-z\s&]+?)(?:\sin|near|for|from|\$|\.)/,
    /([A-Z][A-Za-z\s&]+?)\s+(?:Store|Shop|Supermarket|Retail)/
  ];
  
  for (const pattern of storePatterns) {
    const match = title.match(pattern) || description.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

// Helper function to try to extract a direct product URL
function extractProductUrl(url: string): string | null {
  // Skip Google search URLs
  if (url.includes('google.com/search')) {
    return null;
  }
  
  // Try to identify product page URLs
  const isLikelyProductPage = url.includes('/product/') || 
                              url.includes('/item/') || 
                              url.includes('/p/') ||
                              url.includes('/shop/') ||
                              url.includes('/dp/');
  
  if (isLikelyProductPage) {
    return url;
  }
  
  // Check for URLs from known retailers
  const knownRetailers = [
    'woolworths.com.au', 'coles.com.au', 'aldi.com.au', 'iga.com.au',
    'harrisfarm.com.au', 'costco.com.au', 'walmart.com', 'target.com', 'kroger.com'
  ];
  
  for (const retailer of knownRetailers) {
    if (url.includes(retailer)) {
      return url;
    }
  }
  
  return null;
}

// Helper to parse price from text
function parsePrice(title: string, description: string, originalPrice: number): number | null {
  const fullText = `${title} ${description}`;
  
  // Common price patterns
  const patterns = [
    /\$(\d+\.\d{2})/g,
    /\$(\d+)/g,
    /(\d+\.\d{2})\s*dollars/i,
    /(\d+)\s*dollars/i,
    /price[^\d]*(\d+\.\d{2})/i,
    /cost[^\d]*(\d+\.\d{2})/i,
    /(\d+\.\d{2})/g
  ];
  
  for (const pattern of patterns) {
    const matches = [...fullText.matchAll(pattern)];
    for (const match of matches) {
      const price = parseFloat(match[1]);
      // Make sure the price makes sense (lower than original but not too low)
      if (!isNaN(price) && price > 0 && price < originalPrice * 0.99 && price > originalPrice * 0.5) {
        return price;
      }
    }
  }
  
  return null;
}

// Check if search result is relevant to the product
function isRelevantResult(result: any, expenseName: string): boolean {
  const title = result.title.toLowerCase();
  const description = result.description.toLowerCase();
  const expense = expenseName.toLowerCase();
  
  // Check if result contains price indicators
  const hasPriceIndicator = description.includes('$') || 
    description.includes('price') || 
    description.includes('cost');
    
  // Check if result is about the product
  const hasProductReference = title.includes(expense) || 
    description.includes(expense);
    
  // Check for store/retail indicators
  const hasStoreIndicator = title.includes('store') || 
    title.includes('shop') || 
    description.includes('store') || 
    description.includes('shop');
    
  return hasPriceIndicator && (hasProductReference || hasStoreIndicator);
} 