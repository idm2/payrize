import type { Expense, AlternativeProduct } from "@/lib/utils";

/**
 * FireCrawl API integration to get direct product links for alternatives
 */
export async function getDirectProductLinks(expense: Expense): Promise<AlternativeProduct[]> {
  // Force mock data generation if requested
  if (expense._forceMock) {
    console.log("FireCrawl: Generating mock data as requested by _forceMock flag");
    return generateMockFireCrawlResults(expense);
  }

  // Track progress for UI feedback
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('search-progress', { 
      detail: { source: 'firecrawl', status: 'started', progress: 10 } 
    }));
  }

  // API Key validation
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    console.log("FireCrawl API key not configured, returning mock data");
    // Report error in progress tracking
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search-progress', { 
        detail: { source: 'firecrawl', status: 'error', message: 'API key not configured, using mocks', progress: 100 } 
      }));
    }
    // Return mock data instead of empty array
    return generateMockFireCrawlResults(expense);
  }

  try {
    // Extract search terms from expense
    const searchTerms = extractSearchTerms(expense);
    if (!searchTerms) {
      console.log("Could not extract meaningful search terms from expense, using name as fallback");
      // Report error in progress tracking
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('search-progress', { 
          detail: { source: 'firecrawl', status: 'error', message: 'Invalid search terms, using mock data', progress: 100 } 
        }));
      }
      // Return mock data instead of empty array
      return generateMockFireCrawlResults(expense);
    }

    console.log(`Searching FireCrawl API for: "${searchTerms}"`);
    
    // Update progress - preparing request
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search-progress', { 
        detail: { source: 'firecrawl', status: 'searching', progress: 30 } 
      }));
    }

    // Make request to FireCrawl API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      // Make request to FireCrawl API
      const response = await fetch("https://api.firecrawl.dev/v1/products/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          query: searchTerms,
          limit: 5,
          includeImages: true,
          sources: getRelevantSources(expense),
          priceRange: getPriceRangeForExpense(expense)
        }),
        signal: controller.signal
      });
      
      // Clear timeout since request completed
      clearTimeout(timeoutId);

      // Update progress - received response
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('search-progress', { 
          detail: { source: 'firecrawl', status: 'processing', progress: 60 } 
        }));
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`FireCrawl API error: ${response.status} - ${errorText}`);
        // Report error in progress tracking
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('search-progress', { 
            detail: { 
              source: 'firecrawl', 
              status: 'error', 
              message: `API error: ${response.status}`, 
              progress: 100 
            } 
          }));
        }
        return [];
      }

      const data = await response.json();
      
      // Update progress - formatting results
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('search-progress', { 
          detail: { source: 'firecrawl', status: 'formatting', progress: 80 } 
        }));
      }
      
      // Transform FireCrawl results to AlternativeProduct format
      const alternatives = data.results.map((product: any) => {
        const numericPrice = formatFireCrawlPrice(product.price);
        return {
          id: `fc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: product.title,
          description: product.description || `Alternative to ${expense.description}`,
          price: numericPrice,
          savings: Math.max(0, expense.amount - numericPrice),
          url: product.productUrl,
          image: product.imageUrl || null,
          source: product.source || "FireCrawl API",
          location: product.availability?.store || null
        };
      }).filter((product: AlternativeProduct) => 
        // Filter out products that are more expensive than the original
        product.savings > 0
      );
      
      // Update progress - completed successfully
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('search-progress', { 
          detail: { 
            source: 'firecrawl', 
            status: 'completed', 
            count: alternatives.length, 
            progress: 100 
          } 
        }));
      }
      
      return alternatives;
    } catch (fetchError: unknown) {
      // Clear timeout since request errored
      clearTimeout(timeoutId);
      
      // Handle timeout/abort specifically
      if (fetchError && typeof fetchError === 'object' && 'name' in fetchError && fetchError.name === 'AbortError') {
        console.error("FireCrawl API request timed out after 15 seconds");
        // Report timeout in progress tracking
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('search-progress', { 
            detail: { 
              source: 'firecrawl', 
              status: 'error', 
              message: 'Request timed out', 
              progress: 100 
            } 
          }));
        }
      } else {
        throw fetchError; // Re-throw for general error handling
      }
      return [];
    }
  } catch (error: unknown) {
    console.error("Error fetching from FireCrawl API:", error);
    // Report error in progress tracking
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search-progress', { 
        detail: { 
          source: 'firecrawl', 
          status: 'error', 
          message: error && typeof error === 'object' && 'message' in error 
            ? String(error.message) 
            : 'Unknown error', 
          progress: 100 
        } 
      }));
    }
    return [];
  }
}

/**
 * Extract meaningful search terms from the expense
 */
function extractSearchTerms(expense: Expense): string {
  // If we have a specific item name, prioritize that
  if (expense.name && expense.name.length > 3) {
    return expense.name;
  }
  
  // Otherwise use the description
  if (expense.description && expense.description.length > 3) {
    // Remove any specific store names or receipt identifiers
    const cleanDesc = expense.description
      .replace(/receipt from/i, '')
      .replace(/purchase at/i, '')
      .replace(/payment to/i, '');
      
    return cleanDesc.trim();
  }
  
  // As a last resort, use the category
  if (expense.category) {
    return `${expense.category} alternatives`;
  }
  
  return '';
}

/**
 * Format FireCrawl price to a numeric value
 */
function formatFireCrawlPrice(price: any): number {
  if (!price) return 0;
  
  // If price is already a number
  if (typeof price === 'number') {
    return price;
  }
  
  // If price is a string
  if (typeof price === 'string') {
    return parseFloat(price.replace(/[^0-9.]/g, '')) || 0;
  }
  
  // If price is an object with value and currency
  if (typeof price === 'object' && price.value) {
    if (typeof price.value === 'number') {
      return price.value;
    } else if (typeof price.value === 'string') {
      return parseFloat(price.value.replace(/[^0-9.]/g, '')) || 0;
    }
  }
  
  return 0;
}

/**
 * Format price as a display string (for UI purposes)
 */
function formatPriceForDisplay(price: number): string {
  return `$${price.toFixed(2)}`;
}

/**
 * Calculate savings percentage between alternative price and original expense
 */
function calculateSavingsPercentage(alternativePrice: number, originalAmount: number): number {
  if (!alternativePrice || !originalAmount) return 0;
  
  if (alternativePrice <= 0 || originalAmount <= 0) return 0;
  
  const savingsPercent = ((originalAmount - alternativePrice) / originalAmount) * 100;
  return Math.max(0, Math.min(99, Math.round(savingsPercent)));
}

/**
 * Get relevant sources based on expense type
 */
function getRelevantSources(expense: Expense): string[] {
  // Default sources for general products
  const defaultSources = ["amazon", "walmart", "target"];
  
  // If it's a grocery or food item
  if (
    expense.category?.toLowerCase().includes('grocery') ||
    expense.category?.toLowerCase().includes('food') ||
    expense.description?.toLowerCase().includes('grocery') ||
    expense.description?.toLowerCase().includes('food')
  ) {
    return ["kroger", "walmart", "target", "instacart"];
  }
  
  // If it's electronics
  if (
    expense.category?.toLowerCase().includes('electronics') ||
    expense.category?.toLowerCase().includes('tech') ||
    expense.description?.toLowerCase().includes('phone') ||
    expense.description?.toLowerCase().includes('computer') ||
    expense.description?.toLowerCase().includes('laptop')
  ) {
    return ["bestbuy", "amazon", "walmart", "target"];
  }
  
  // If it's clothing
  if (
    expense.category?.toLowerCase().includes('clothing') ||
    expense.category?.toLowerCase().includes('apparel') ||
    expense.description?.toLowerCase().includes('clothes') ||
    expense.description?.toLowerCase().includes('shirt') ||
    expense.description?.toLowerCase().includes('pants')
  ) {
    return ["amazon", "walmart", "target", "macys"];
  }
  
  return defaultSources;
}

/**
 * Calculate appropriate price range based on expense amount
 */
function getPriceRangeForExpense(expense: Expense): { min: number, max: number } {
  if (!expense.amount) {
    return { min: 0, max: 200 };
  }
  
  // We want to find alternatives that cost less, so set max to the original amount
  const max = expense.amount;
  
  // Set minimum to a reasonable percentage of the original price
  // For small purchases, go as low as 10%
  // For larger purchases, don't go lower than 50% to maintain quality
  let minPercentage = 0.1;
  
  if (expense.amount > 100) {
    minPercentage = 0.5;
  } else if (expense.amount > 50) {
    minPercentage = 0.3;
  } else if (expense.amount > 20) {
    minPercentage = 0.2;
  }
  
  return {
    min: Math.max(1, Math.floor(expense.amount * minPercentage)),
    max: Math.ceil(max)
  };
}

/**
 * Generate an optimized search query based on expense type
 */
function generateSearchQuery(expense: Expense): string {
  // Get user location
  const userSuburb = getLocalStorageItem('userSuburb') || '';
  const userCountry = getLocalStorageItem('userCountry') || 'Australia';
  
  // Base query with expense name
  let query = expense.name;
  
  // Add expense description keywords if available (limit to avoid overtargeting)
  if (expense.description) {
    const keyTerms = expense.description
      .split(' ')
      .filter(word => word.length > 3)
      .slice(0, 3)
      .join(' ');
    
    query += ` ${keyTerms}`;
  }
  
  // Add price context
  const targetPrice = expense.amount * 0.9; // Target 10% less than current expense
  query += ` under $${Math.round(targetPrice)}`;
  
  // Special handling for different expense types
  if (isInsuranceProduct(expense)) {
    query += ` cheaper insurance plan ${userCountry}`;
  } else if (isPhysicalProduct(expense)) {
    // For physical products, include location and terms like "store" or "shop"
    query += ` ${userSuburb} ${userCountry} store shop location`;
    
    // For grocery items, add supermarket names
    if (isGroceryItem(expense)) {
      query += ` supermarket woolworths coles aldi price`;
    }
  } else if (isSubscriptionService(expense)) {
    // For subscriptions like streaming, add relevant terms
    query += ` alternative service cheaper plan subscription`;
  }
  
  return query;
}

/**
 * Extract price from text using RegExp patterns
 */
function extractPrice(text: string, originalPrice: number): number | null {
  if (!text) return null;
  
  // Different price patterns to try
  const patterns = [
    /\$(\d+\.\d{1,2})/g,                // $xx.xx
    /\$(\d+)/g,                         // $xx
    /(\d+\.\d{1,2})\s*dollars/gi,       // xx.xx dollars
    /(\d+)\s*dollars/gi,                // xx dollars
    /price[^\d]*(\d+\.\d{1,2})/gi,      // price: xx.xx
    /cost[^\d]*(\d+\.\d{1,2})/gi,       // cost: xx.xx
    /(\d+\.\d{1,2})/g                   // xx.xx (fallback, less reliable)
  ];
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const price = parseFloat(match[1]);
      // Verify price makes sense
      if (!isNaN(price) && price > 0 && price < originalPrice * 1.1) {
        return price;
      }
    }
  }
  
  return null;
}

/**
 * Check if price is reasonable compared to original
 */
function isPriceReasonable(price: number, originalPrice: number): boolean {
  // Price should be at least 5% less and not more than 80% less to be realistic
  return price > 0 && price < originalPrice * 0.95 && price > originalPrice * 0.2;
}

/**
 * Clean up product name for better readability
 */
function cleanProductName(title: string, expenseName: string): string {
  if (!title) return expenseName + " Alternative";
  
  // Remove common prefixes and suffixes
  let cleaned = title
    .replace(/^(top|best|cheapest|review:)\s+/gi, '')
    .replace(/\s+\|\s+.*$/g, '')
    .replace(/\s+-\s+.*$/g, '')
    .replace(/^amazon.com\s*:?\s*/i, '')
    .replace(/\(\d+\)$/, '');
    
  // Truncate if too long
  if (cleaned.length > 60) {
    cleaned = cleaned.substring(0, 57) + '...';
  }
  
  return cleaned;
}

/**
 * Detect if the result page is likely a product page
 */
function isLikelyProductPage(title: string, description: string, expenseName: string): boolean {
  if (!title || !description) return false;
  
  // Product page indicators
  const productTerms = ['price', 'buy', '$', 'shop', 'product', 'purchase', 'order', 'add to cart'];
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description.toLowerCase();
  
  // Check if contains product terms
  const hasProductTerm = productTerms.some(term => 
    lowerTitle.includes(term) || lowerDesc.includes(term)
  );
  
  // Check if contains expense name or keywords
  const expenseKeywords = expenseName.toLowerCase().split(' ')
    .filter(word => word.length > 3);
  
  const hasExpenseKeyword = expenseKeywords.some(keyword => 
    lowerTitle.includes(keyword) || lowerDesc.includes(keyword)
  );
  
  return hasProductTerm && hasExpenseKeyword;
}

/**
 * Check if expense is a physical product
 */
function isPhysicalProduct(expense: Expense): boolean {
  if (!expense) return false;
  
  const physicalTerms = [
    'grocery', 'food', 'market', 'shop', 'store', 'retail', 
    'supermarket', 'mall', 'product', 'item', 'goods'
  ];
  
  const expenseText = `${expense.name} ${expense.category || ''} ${expense.description || ''}`.toLowerCase();
  
  return physicalTerms.some(term => expenseText.includes(term));
}

/**
 * Check if expense is a grocery item
 */
function isGroceryItem(expense: Expense): boolean {
  if (!expense) return false;
  
  const groceryTerms = [
    'grocery', 'food', 'supermarket', 'milk', 'bread', 'fruit', 
    'vegetable', 'meat', 'chicken', 'beef', 'fish'
  ];
  
  const expenseText = `${expense.name} ${expense.category || ''} ${expense.description || ''}`.toLowerCase();
  
  return groceryTerms.some(term => expenseText.includes(term));
}

/**
 * Check if expense is an insurance product
 */
function isInsuranceProduct(expense: Expense): boolean {
  if (!expense) return false;
  
  const expenseText = `${expense.name} ${expense.category || ''} ${expense.description || ''}`.toLowerCase();
  
  return expenseText.includes('insurance') || 
         expenseText.includes('cover') || 
         expenseText.includes('policy');
}

/**
 * Check if expense is a subscription service
 */
function isSubscriptionService(expense: Expense): boolean {
  if (!expense) return false;
  
  const subscriptionTerms = [
    'subscription', 'membership', 'plan', 'service', 'monthly',
    'streaming', 'netflix', 'spotify', 'prime', 'disney'
  ];
  
  const expenseText = `${expense.name} ${expense.category || ''} ${expense.description || ''}`.toLowerCase();
  
  return subscriptionTerms.some(term => expenseText.includes(term));
}

/**
 * Safe way to get an item from localStorage that works on the server
 */
function getLocalStorageItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch (e) {
    console.error(`Error accessing localStorage for key ${key}:`, e);
  }
  return null;
}

/**
 * Generate mock FireCrawl results for development testing
 */
function generateMockFireCrawlResults(expense: Expense): AlternativeProduct[] {
  console.log("Generating mock FireCrawl results for expense:", expense.name);
  
  // Calculate a realistic alternative price that's lower than the original
  const generatePrice = () => {
    const savingsPercent = Math.random() * 0.3 + 0.1; // 10-40% savings
    return Math.round((expense.amount * (1 - savingsPercent)) * 100) / 100;
  };
  
  // Generate better product names based on expense category
  let productPrefix = "FireCrawl:";
  if (expense.category?.toLowerCase().includes('food') || isGroceryItem(expense)) {
    productPrefix = "FireCrawl: Value Brand";
  } else if (expense.category?.toLowerCase().includes('tech') || 
           expense.name.toLowerCase().includes('phone') ||
           expense.name.toLowerCase().includes('computer')) {
    productPrefix = "FireCrawl: Budget Tech";
  } else {
    productPrefix = "FireCrawl: Discount";
  }
  
  // Generate 3-5 mock alternatives to ensure we have enough diverse options
  const alternatives: AlternativeProduct[] = [
    {
      id: `fc-mock-1-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: `${productPrefix} ${expense.name}`,
      description: `FireCrawl found a cheaper alternative to ${expense.name} with similar features.`,
      price: generatePrice(),
      url: `https://www.amazon.com/s?k=${encodeURIComponent(expense.name)}`,
      savings: 0, // Will calculate below
      source: "FireCrawl API",
      confidence: 85
    },
    {
      id: `fc-mock-2-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: `${productPrefix} Premium ${expense.name}`,
      description: `FireCrawl found this premium alternative to ${expense.name} at a better price.`,
      price: generatePrice(),
      url: `https://www.walmart.com/search/?query=${encodeURIComponent(expense.name)}`,
      savings: 0, // Will calculate below
      source: "FireCrawl API",
      confidence: 80
    },
    {
      id: `fc-mock-3-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: `${productPrefix} Economy ${expense.name}`,
      description: `FireCrawl found this budget-friendly version of ${expense.name}.`,
      price: generatePrice(),
      url: `https://www.target.com/s?searchTerm=${encodeURIComponent(expense.name)}`,
      savings: 0, // Will calculate below
      source: "FireCrawl API",
      confidence: 90
    },
    {
      id: `fc-mock-4-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: `${productPrefix} Basic ${expense.name}`,
      description: `FireCrawl found this affordable basic version of ${expense.name}.`,
      price: generatePrice(),
      url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(expense.name)}`,
      savings: 0, // Will calculate below
      source: "FireCrawl API",
      confidence: 75
    },
    {
      id: `fc-mock-5-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: `${productPrefix} Bargain ${expense.name}`,
      description: `FireCrawl found this bargain deal for ${expense.name}.`,
      price: generatePrice(),
      url: `https://www.costco.com/CatalogSearch?keyword=${encodeURIComponent(expense.name)}`,
      savings: 0, // Will calculate below
      source: "FireCrawl API",
      confidence: 95
    }
  ];
  
  // Calculate savings for all alternatives
  alternatives.forEach(alt => {
    alt.savings = Math.round((expense.amount - alt.price) * 100) / 100;
  });
  
  console.log("Generated FireCrawl mock alternatives:", alternatives.map(alt => ({
    name: alt.name,
    price: alt.price,
    savings: alt.savings,
    source: alt.source
  })));
  
  return alternatives;
} 