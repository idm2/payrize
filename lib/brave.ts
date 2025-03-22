import type { Expense, AlternativeProduct } from "@/lib/utils"

const BRAVE_API_KEY = process.env.BRAVE_API_KEY
const BRAVE_SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1/web/search"

/**
 * Searches for product alternatives using Brave Search API
 * @param expense The expense to find alternatives for
 * @returns Array of alternative products
 */
export async function searchAlternatives(expense: Expense): Promise<AlternativeProduct[]> {
  try {
    // Check if API key is available
    if (!BRAVE_API_KEY) {
      console.error("BRAVE_API_KEY is not set in environment variables")
      return []
    }
    
    // Create more targeted search query based on expense details
    let searchQuery = `best cheaper alternatives to ${expense.name} price comparison`
    
    // Add category for more context
    if (expense.category) {
      searchQuery += ` ${expense.category}`
    }
    
    // Add specific details for better targeting
    if (expense.description) {
      // Extract key details from description
      const descriptionWords = expense.description
        .split(' ')
        .filter(word => word.length > 3) // Filter out short words
        .slice(0, 5) // Take only the first 5 significant words to avoid overtargeting
        .join(' ')
      
      searchQuery += ` ${descriptionWords}`
    }
    
    // Add price context for better results
    searchQuery += ` under $${expense.amount}`
    
    // Build the URL with search parameters
    const url = new URL(BRAVE_SEARCH_ENDPOINT)
    url.searchParams.append("q", searchQuery)
    url.searchParams.append("count", "15") // Fetch more results to increase chances of finding good alternatives
    url.searchParams.append("search_lang", "en")
    
    // Call Brave Search API
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-Subscription-Token": BRAVE_API_KEY
      },
      cache: "no-store",
      next: { revalidate: 0 }
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Brave API error: ${errorData.message || response.statusText}`)
    }

    const data = await response.json()
    
    // Process search results - extract useful information
    const alternatives: AlternativeProduct[] = []
    
    // Extract product information from search results
    for (const result of data.web?.results || []) {
      try {
        // Skip results that don't look like product pages
        if (!isLikelyProductPage(result.title, result.description, expense.name)) {
          continue
        }
        
        // Extract price using multiple strategies
        const price = extractPrice(result.description, result.title, expense.amount)
        
        // Only add if we found a price and it's reasonable
        if (price && isPriceReasonable(price, expense.amount)) {
          alternatives.push({
            id: `brave-${result.url.substring(0, 20)}`,
            name: cleanProductName(result.title, expense.name),
            description: formatDescription(result.description),
            price: price,
            url: result.url,
            savings: expense.amount - price,
            source: "Brave"
          })
        }
      } catch (err) {
        // Skip any results that error during processing
        console.error("Error processing search result:", err)
        continue
      }
    }
    
    // Sort by confidence in pricing and relevance
    return alternatives.sort((a, b) => b.savings - a.savings)
  } catch (error) {
    console.error("Error searching with Brave API:", error)
    return []
  }
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
 * Extract price using multiple regex patterns
 */
function extractPrice(description: string, title: string, originalPrice: number): number | null {
  // Combine text for better chance of finding price
  const combinedText = `${description} ${title}`
  
  // Try to find price patterns with $ symbol (most reliable)
  const dollarPatterns = [
    /\$(\d+\.\d{1,2})(?:\s*\/\s*mo|\s*per\s*month|\s*monthly)?/i,       // $xx.xx /mo or per month
    /(?:just|only|price:?|cost:?|pay:?)\s*\$(\d+\.\d{1,2})/i,            // only $xx.xx
    /\$(\d+\.\d{1,2})(?!\d)/,                                            // $xx.xx not followed by digits
    /(?:costs?|price|from|for|at)\s*\$(\d+)(?:\.\d{1,2})?(?:\s*\/|\s*per)?/i, // price from $xx
    /(\d+\.\d{1,2})\s*(?:dollars|USD)/i,                                 // xx.xx dollars
    /\$(\d+)(?!\d)(?:\s*\/\s*mo|\s*per\s*month|\s*monthly)?/i            // $xx /mo (no decimal)
  ]
  
  // Look for monthly price patterns (second most reliable)
  const monthlyPatterns = [
    /(\d+\.\d{1,2})\s*(?:\/|per)\s*month/i,                              // xx.xx /month
    /(\d+)\s*(?:\/|per)\s*mo(?:nth)?/i,                                  // xx /mo or /month
    /monthly\s*(?:cost|price|rate):?\s*(?:\$)?(\d+(?:\.\d{1,2})?)/i,     // monthly cost: $xx.xx
    /(\d+(?:\.\d{1,2})?)\s*(?:\/|per)\s*month/i                          // xx.xx per month
  ]
  
  // Try each pattern
  for (const pattern of [...dollarPatterns, ...monthlyPatterns]) {
    const match = combinedText.match(pattern)
    if (match && match[1]) {
      const extractedPrice = parseFloat(match[1])
      // Verify price is reasonable compared to original
      if (extractedPrice > 0 && extractedPrice < originalPrice) {
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
  // Price should be lower than original but not suspiciously low
  return price > 0 && 
    price < originalPrice && 
    price >= (originalPrice * 0.4) // Not less than 40% of original price
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
function formatDescription(description: string): string {
  // Extract most relevant part of description (first sentence usually has key info)
  const firstSentence = description.split(/\.|\!|\?/)[0]
  
  if (firstSentence.length > 20) {
    return firstSentence.trim()
  }
  
  // If first sentence is too short, use more of the description
  return description.length > 120 ? 
    description.substring(0, 120).trim() + '...' : 
    description.trim()
} 