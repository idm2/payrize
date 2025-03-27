import { NextRequest, NextResponse } from 'next/server';
import { findStoreLocations } from '@/lib/places';
import { searchProducts } from '@/lib/serper';
import { findProductAlternatives } from '@/lib/openai';
import { validateProductAlternatives } from '@/lib/bing';
import type { Expense, AlternativeProduct } from '@/lib/utils';

export async function POST(req: NextRequest) {
  console.log("=== ALTERNATIVES API CALLED ===");
  
  // Check if we have the required API keys
  const hasBraveKey = !!process.env.BRAVE_API_KEY;
  const hasFirecrawlKey = !!process.env.FIRECRAWL_API_KEY;
  const hasSerperKey = !!process.env.SERPER_DEV_API_KEY;
  const hasGooglePlacesKey = !!process.env.GOOGLE_PLACES_API_KEY;
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const hasBingKey = !!process.env.BING_SEARCH_API_KEY;
  
  // Log environment status - useful for debugging
  console.log("Environment variables:", { 
    hasBraveKey, 
    braveKeyLength: process.env.BRAVE_API_KEY?.length || 0,
    hasOpenAIKey,
    hasBingKey
  });
  
  try {
    const expense = await req.json() as Expense;
    console.log("Alternatives API received expense:", JSON.stringify(expense, null, 2));
    
    // Parse user preferences from headers
    const preferences = {
      locationRadius: parseInt(req.headers.get('x-location-radius') || '10'),
      sortPreference: req.headers.get('x-sort-preference') || 'balanced',
      isPhysical: req.headers.get('x-is-physical') === 'true',
      userLocation: req.headers.get('x-user-location') !== 'null' 
        ? JSON.parse(req.headers.get('x-user-location') || 'null')
        : null
    };
    console.log("User preferences:", preferences);
    
    // Start with empty alternatives array
    let alternatives: AlternativeProduct[] = [];
    
    try {
      // Step 1: Use OpenAI to identify precise product alternatives
      if (hasOpenAIKey) {
        console.log("=== USING OPENAI FOR PRODUCT MATCHING ===");
        const { products, searchQueries } = await findProductAlternatives(expense);
        
        if (products.length > 0) {
          console.log(`OpenAI suggested ${products.length} alternatives`);
          
          // Step 2: Use Bing to validate and enhance OpenAI's suggestions
          if (hasBingKey) {
            console.log("=== USING BING TO VALIDATE PRODUCT INFORMATION ===");
            const validatedAlternatives = await validateProductAlternatives(
              expense, 
              products, 
              searchQueries
            );
            
            alternatives = alternatives.concat(validatedAlternatives);
            console.log(`Bing validated ${validatedAlternatives.length} alternatives`);
          }
        }
      }
      
      // Fallback: If OpenAI + Bing approach yielded no results or keys not available,
      // use the previous Serper approach
      if (alternatives.length === 0) {
        console.log("=== FALLING BACK TO SERPER SEARCH ===");
        if (hasSerperKey) {
          const serperAlternatives = await searchProducts(expense);
          alternatives = alternatives.concat(serperAlternatives);
          console.log(`Serper found ${serperAlternatives.length} alternatives`);
        }
      }
      
      // Add location information for physical products if Google Places API key is available
      if (hasGooglePlacesKey && alternatives.length > 0) {
        console.log("=== ENHANCING WITH STORE LOCATIONS ===");
        alternatives = await findStoreLocations(expense, alternatives);
      }
      
      // If we still don't have alternatives, generate backup alternatives
      if (alternatives.length === 0) {
        console.log("=== GENERATING BACKUP ALTERNATIVES ===");
        const backupAlternatives = generateBackupAlternatives(expense);
        alternatives = alternatives.concat(backupAlternatives);
        console.log(`Generated ${backupAlternatives.length} backup alternatives`);
      }
      
      // Sort alternatives by savings or distance or a balanced approach
      if (alternatives.length > 0) {
        console.log("=== SORTING ALTERNATIVES ===");
        alternatives = sortAlternatives(alternatives, preferences.sortPreference);
      }
    } catch (searchError) {
      console.error("Error in search process:", searchError);
      // If all searches fail, still generate backup alternatives
      const backupAlternatives = generateBackupAlternatives(expense);
      alternatives = backupAlternatives;
      console.log(`Generated ${backupAlternatives.length} backup alternatives after error`);
    }
    
    console.log(`Returning ${alternatives.length} alternatives`);
    return NextResponse.json(alternatives);
  } catch (error) {
    console.error("Error in alternatives API:", error);
    return NextResponse.json(
      { error: "Failed to fetch alternatives", message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Sort alternatives based on user preference
 */
function sortAlternatives(
  alternatives: AlternativeProduct[], 
  sortPreference: string
): AlternativeProduct[] {
  switch (sortPreference) {
    case 'price':
      // Sort by price (lowest to highest)
      return alternatives.sort((a, b) => (a.price || 0) - (b.price || 0));
      
    case 'distance':
      // Sort by distance if available
      return alternatives.sort((a, b) => {
        // Extract numeric distance if available
        const distA = a.location?.distance ? parseFloat(a.location.distance) : 9999;
        const distB = b.location?.distance ? parseFloat(b.location.distance) : 9999;
        return distA - distB;
      });
      
    case 'balanced':
    default:
      // Balanced approach: score based on both savings and distance
      return alternatives.sort((a, b) => {
        const savingsScoreA = (a.savings / (a.price || 1)) * 50;
        const savingsScoreB = (b.savings / (b.price || 1)) * 50;
        
        // Distance score (lower is better)
        const distanceA = a.location?.distance ? parseFloat(a.location.distance) : 50;
        const distanceB = b.location?.distance ? parseFloat(b.location.distance) : 50;
        const distanceScoreA = Math.max(0, 50 - distanceA);
        const distanceScoreB = Math.max(0, 50 - distanceB);
        
        const totalScoreA = savingsScoreA + distanceScoreA;
        const totalScoreB = savingsScoreB + distanceScoreB;
        
        return totalScoreB - totalScoreA; // Higher score first
      });
  }
}

async function validateURL(url: string): Promise<boolean> {
  if (!url) return false
  
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0" },
    })
    
    return response.ok
  } catch (error) {
    return false
  }
}

function isGroceryItem(expense: Expense): boolean {
  if (!expense) return false
  
  const groceryTerms = ["grocery", "food", "supermarket", "grains", "dairy", "meat"]
  
  const lowerCategory = expense.category?.toLowerCase() || ""
  const lowerDesc = expense.description?.toLowerCase() || ""
  const lowerName = expense.name?.toLowerCase() || ""
  
  return (
    groceryTerms.some((term) => lowerCategory.includes(term)) ||
    groceryTerms.some((term) => lowerDesc.includes(term)) ||
    groceryTerms.some((term) => lowerName.includes(term))
  )
}

function validateHealthInsurancePricing(
  alternatives: any[], 
  originalPrice: number
): any[] {
  return alternatives.map(alt => {
    // Health insurance alternatives should typically save between 10-30%
    // Adjust any that are outside this range
    const minReasonablePrice = originalPrice * 0.7; // 30% savings
    const maxReasonablePrice = originalPrice * 0.9; // 10% savings
    
    // If the price is too low (unrealistic), adjust it upward
    if (alt.price < minReasonablePrice) {
      const adjustedPrice = minReasonablePrice + (Math.random() * (maxReasonablePrice - minReasonablePrice));
      
      return {
        ...alt,
        price: adjustedPrice,
        savings: originalPrice - adjustedPrice,
        name: `${alt.name} (Basic Plan)` // Indicate this is a basic plan if price is low
      };
    }
    
    // If the price is too high (not enough savings), adjust it downward
    if (alt.price > maxReasonablePrice) {
      const adjustedPrice = maxReasonablePrice;
      
      return {
        ...alt,
        price: adjustedPrice,
        savings: originalPrice - adjustedPrice,
        name: `${alt.name} (Limited Coverage)` // Indicate this has limited coverage
      };
    }
    
    return alt;
  });
}

/**
 * Less strict distance filter that keeps online alternatives even without locations
 */
function relaxedDistanceFilter(alternatives: AlternativeProduct[], maxRadius: number): AlternativeProduct[] {
  // Filter to keep all services, and physical products either with locations in radius OR marked as online-only
  const filtered = alternatives.filter(alt => {
    // Always keep service-type alternatives
    if (alt.type === 'service' || alt.type === 'subscription' || alt.type === 'insurance') {
      return true;
    }
    
    // For physical products, check location if available
    if (alt.type === 'physical') {
      // If it's already marked as online-only, keep it
      if (alt.isOnlineOnly) {
        return true;
      }
      
      // If it has a location, check if it's within radius
      if (alt.location && alt.location.distance) {
        const distance = parseFloat(alt.location.distance);
        return !isNaN(distance) && distance <= maxRadius;
      }
      
      // No location for physical product, but keep it and mark as online-only
      alt.isOnlineOnly = true;
      alt.source = alt.source || "Online Store";
      return true;
    }
    
    // Default case - keep everything else
    return true;
  });
  
  console.log(`After relaxed filtering: ${filtered.length} alternatives kept`);
  
  // If we have no results at all, return all original alternatives and mark them as online-only
  if (filtered.length === 0 && alternatives.length > 0) {
    console.log("No alternatives passed filtering, returning all as online-only");
    return alternatives.map(alt => {
      // Create a copy with the location set to an empty object instead of null
      // This fixes the type error
      return {
        ...alt,
        location: undefined, // Use undefined instead of null
        isOnlineOnly: alt.type === 'physical' ? true : undefined,
        source: alt.type === 'physical' ? (alt.source || "Online Store") : alt.source
      };
    });
  }
  
  return filtered;
}

/**
 * Generate backup alternatives when API doesn't return enough results
 */
function generateBackupAlternatives(expense: Expense): AlternativeProduct[] {
  console.log("Generating backup alternatives for:", expense.name);
  
  // Generate price within 10-30% less than original
  const generatePrice = () => {
    const savingsPercent = 0.1 + (Math.random() * 0.2); // 10-30% savings
    return Math.round((expense.amount * (1 - savingsPercent)) * 100) / 100;
  };
  
  // Determine product type for naming
  let productPrefix = "";
  const productType = determineProductType(expense);
  
  if (productType === "subscription") {
    productPrefix = "Value";
  } else if (productType === "insurance") {
    productPrefix = "Basic";
  } else if (productType === "service") {
    productPrefix = "Budget";
  } else {
    // For physical products, use more specific naming based on the expense
    if (expense.name?.toLowerCase().includes('milk')) {
      productPrefix = "Store Brand";
    } else if (expense.name?.toLowerCase().includes('shoes')) {
      productPrefix = "Discount";
    } else {
      productPrefix = "Generic";
    }
  }
  
  // Create 3 alternatives
  const alternatives: AlternativeProduct[] = [];
  
  for (let i = 1; i <= 3; i++) {
    const price = generatePrice();
    
    alternatives.push({
      id: `backup-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: `${productPrefix} ${expense.name} Alternative ${i}`,
      description: `A more affordable alternative to ${expense.description || expense.name}`,
      price: price,
      originalPrice: expense.amount,
      savings: expense.amount - price,
      url: "#",
      source: "Comparison Service",
      type: productType,
      isOnlineOnly: productType === "physical" ? true : undefined
    });
  }
  
  return alternatives;
}

function determineProductType(expense: Expense): "physical" | "service" | "subscription" | "insurance" {
  const expenseText = `${expense.name || ''} ${expense.description || ''} ${expense.category || ''}`.toLowerCase();
  
  // Check for insurance products
  if (expenseText.includes('insurance') || expenseText.includes('cover') || expenseText.includes('policy')) {
    return "insurance";
  }
  
  // Check for subscription services
  if (expenseText.includes('subscription') || 
      expenseText.includes('plan') || 
      expenseText.includes('monthly') || 
      expenseText.includes('netflix') || 
      expenseText.includes('spotify')) {
    return "subscription";
  }
  
  // Check for general services
  if (expenseText.includes('service') || 
      expenseText.includes('membership') || 
      expenseText.includes('internet') || 
      expenseText.includes('streaming') || 
      expenseText.includes('phone') || 
      expenseText.includes('utility')) {
    return "service";
  }
  
  // Default to physical product
  return "physical";
}

