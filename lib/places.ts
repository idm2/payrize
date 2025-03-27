import type { AlternativeProduct, Expense } from "@/lib/utils";

interface GooglePlace {
  name: string;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  opening_hours?: {
    open_now?: boolean;
  };
  types?: string[];
  business_status?: string;
}

/**
 * Google Places API integration to get store locations
 */
export async function findStoreLocations(expense: Expense, alternatives: AlternativeProduct[]): Promise<AlternativeProduct[]> {
  // Skip store locations for non-physical products/services
  if (isServiceExpense(expense) && !alternatives.some(alt => alt.type === "physical")) {
    console.log("Skipping store location search for non-physical service:", expense.name);
    return alternatives;
  }

  // Track progress for UI feedback
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('search-progress', { 
      detail: { source: 'places', status: 'started', progress: 10 } 
    }));
  }

  // API Key validation
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("Google Places API key not configured");
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search-progress', { 
        detail: { source: 'places', status: 'error', message: 'API key not configured', progress: 100 } 
      }));
    }
    return alternatives;
  }

  try {
    // Get user's location from localStorage - CRITICAL for accurate results
    let userLocation;
    let userLocationRadius = 10; // Default if not set
    
    try {
      if (typeof window !== 'undefined') {
        // Get exact coordinates - CRITICAL for accurate distance calculations
        const storedLocation = localStorage.getItem('userLocation');
        if (!storedLocation) {
          console.error("No user location found in localStorage");
          return alternatives;
        }
        
        userLocation = JSON.parse(storedLocation);
        console.log("User location from localStorage:", userLocation);
        
        // Get user's preferred max distance
        const userRadiusPref = localStorage.getItem('userLocationRadius');
        if (userRadiusPref) {
          userLocationRadius = parseInt(userRadiusPref);
        }
        console.log(`User location radius preference: ${userLocationRadius}km`);
      }
    } catch (err) {
      console.error("Error accessing localStorage:", err);
      return alternatives;
    }

    const { latitude, longitude } = userLocation;
    
    // Update progress - searching for stores
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search-progress', { 
        detail: { source: 'places', status: 'searching', progress: 30 } 
      }));
    }

    console.log(`Searching for stores near ${latitude},${longitude} with strict radius ${userLocationRadius}km`);

    // Determine store types based on expense category and alternatives
    const storeTypes = determineStoreTypes(expense, alternatives);
    
    // Build store search requests for each type - CRITICAL to restrict to user's radius preference
    const searchPromises = storeTypes.map(type => 
      fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
        `location=${latitude},${longitude}&` +
        `radius=${userLocationRadius * 1000}&` + // Convert km to meters - RESPECT USER SETTINGS
        `type=${type}&` +
        `rankby=distance&` + // Prioritize closest results
        `keyword=${encodeURIComponent(getStoreKeywords(expense, alternatives))}&` +
        `key=${apiKey}`
      ).then(response => {
        if (!response.ok) {
          throw new Error(`Places API error: ${response.status}`);
        }
        return response.json();
      })
    );

    // Process all store search requests
    const searchResults = await Promise.all(searchPromises);
    
    // Combine and deduplicate store results by place_id
    const uniqueStores = new Map<string, GooglePlace>();
    searchResults.forEach(result => {
      if (result.results && Array.isArray(result.results)) {
        result.results.forEach((store: GooglePlace & { place_id?: string }) => {
          if (store.place_id && !uniqueStores.has(store.place_id)) {
            uniqueStores.set(store.place_id, store);
          }
        });
      }
    });
    
    const stores = Array.from(uniqueStores.values());
    console.log(`Found ${stores.length} unique stores near user location`);
    
    // Update progress - processing results
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search-progress', { 
        detail: { source: 'places', status: 'processing', progress: 60 } 
      }));
    }

    // Calculate distances and store details for each store
    const storesWithDistance = stores.map(store => {
      const distance = calculateDistance(
        latitude,
        longitude,
        store.geometry.location.lat,
        store.geometry.location.lng
      );
      
      return {
        ...store,
        distance,
        formattedDistance: `${Math.round(distance * 10) / 10}km` // Round to 1 decimal
      };
    });
    
    // CRITICAL: Filter stores that are beyond the user's maximum distance preference
    const filteredStores = storesWithDistance.filter(store => 
      store.distance <= userLocationRadius
    );
    
    if (storesWithDistance.length !== filteredStores.length) {
      console.log(`Filtered out ${storesWithDistance.length - filteredStores.length} stores beyond ${userLocationRadius}km radius`);
    }
    
    // Sort by distance - closest first
    const sortedStores = filteredStores.sort((a, b) => a.distance - b.distance);
    console.log(`After filtering and sorting, ${sortedStores.length} stores are within ${userLocationRadius}km`);
    
    // Match stores to alternatives based on relevance
    const updatedAlternatives = matchStoresToAlternatives(
      alternatives, 
      sortedStores,
      expense,
      userLocationRadius
    );

    // Update progress - completed
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search-progress', { 
        detail: { 
          source: 'places', 
          status: 'completed', 
          count: updatedAlternatives.length, 
          progress: 100 
        } 
      }));
    }

    // CRITICAL: Remove alternatives without a location or with locations beyond the user's radius
    const alternativesWithValidLocations = updatedAlternatives.filter(alt => {
      // Keep service alternatives regardless of location
      if (alt.type === "service" || alt.type === "subscription" || alt.type === "insurance") {
        return true;
      }
      
      // For physical products, require a location within radius
      if (alt.location && alt.location.distance) {
        const distance = parseFloat(alt.location.distance);
        return distance <= userLocationRadius;
      }
      
      // No valid location info
      return false;
    });
    
    console.log(`Returning ${alternativesWithValidLocations.length} alternatives with locations within ${userLocationRadius}km`);
    
    return alternativesWithValidLocations;
  } catch (error) {
    console.error("Error fetching from Google Places API:", error);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search-progress', { 
        detail: { 
          source: 'places', 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error', 
          progress: 100 
        } 
      }));
    }
    return alternatives;
  }
}

/**
 * Match stores to alternatives based on relevance and store names
 */
function matchStoresToAlternatives(
  alternatives: AlternativeProduct[], 
  stores: (GooglePlace & { distance: number, formattedDistance: string })[], 
  expense: Expense,
  maxDistance: number
): AlternativeProduct[] {
  // Skip for non-physical products
  if (isServiceExpense(expense) && !alternatives.some(alt => alt.type === "physical")) {
    return alternatives;
  }

  // Clone the alternatives to avoid mutating the original
  const results = [...alternatives];
  
  // Keep track of which stores are assigned to avoid duplicates
  const assignedStores = new Set<string>();
  
  // Organize stores by name for better matching
  const storesByName = new Map<string, (GooglePlace & { distance: number, formattedDistance: string })[]>();
  stores.forEach(store => {
    const name = store.name.toLowerCase();
    if (!storesByName.has(name)) {
      storesByName.set(name, []);
    }
    storesByName.get(name)!.push(store);
  });
  
  // Try to match each alternative to a store
  results.forEach(alt => {
    if (alt.type === "service" || alt.type === "subscription" || alt.type === "insurance" || !alt.source) {
      return; // Skip service alternatives
    }
    
    // Try to find a direct name match
    const source = alt.source.toLowerCase();
    const matchingStoresByName = storesByName.get(source) || [];
    
    // Find unassigned stores that match or contain the source name
    let matchingStore = matchingStoresByName.find(store => 
      !assignedStores.has(store.name) && 
      store.distance <= maxDistance && // CRITICAL: Enforce max distance
      (store.name.toLowerCase() === source || 
       store.name.toLowerCase().includes(source))
    );
    
    // If no direct match, try partial matches
    if (!matchingStore) {
      // Find stores that include the source name
      const partialMatches = stores.filter(store => 
        !assignedStores.has(store.name) && 
        store.distance <= maxDistance && // CRITICAL: Enforce max distance
        (store.name.toLowerCase().includes(source) || 
         source.includes(store.name.toLowerCase()))
      );
      
      if (partialMatches.length > 0) {
        // Sort by closest distance
        matchingStore = partialMatches.sort((a, b) => a.distance - b.distance)[0];
      } else {
        // Last resort: assign the closest generic store type
        const genericStores = stores.filter(store => 
          !assignedStores.has(store.name) && 
          store.distance <= maxDistance && // CRITICAL: Enforce max distance
          isRelevantStoreType(store, alt, expense)
        );
        
        if (genericStores.length > 0) {
          matchingStore = genericStores.sort((a, b) => a.distance - b.distance)[0];
        }
      }
    }
    
    // If we found a matching store, update the alternative
    if (matchingStore) {
      assignedStores.add(matchingStore.name);
      
      alt.location = {
        name: matchingStore.name,
        address: matchingStore.vicinity,
        distance: matchingStore.formattedDistance,
        rating: matchingStore.rating,
        openNow: matchingStore.opening_hours?.open_now,
        coords: {
          lat: matchingStore.geometry.location.lat,
          lng: matchingStore.geometry.location.lng
        }
      };
    }
  });
  
  // For any remaining alternatives without locations, assign the closest generic stores
  const remainingStores = stores.filter(store => 
    !assignedStores.has(store.name) && 
    store.distance <= maxDistance // CRITICAL: Enforce max distance
  );
  
  results.forEach(alt => {
    if (alt.location || alt.type === "service" || alt.type === "subscription" || alt.type === "insurance") {
      return; // Skip if already has location or is a service
    }
    
    // Find a relevant store type
    const relevantStores = remainingStores.filter(store => 
      isRelevantStoreType(store, alt, expense)
    );
    
    if (relevantStores.length > 0) {
      // Sort by distance and take the closest
      const closestStore = relevantStores.sort((a, b) => a.distance - b.distance)[0];
      
      assignedStores.add(closestStore.name);
      
      alt.location = {
        name: closestStore.name,
        address: closestStore.vicinity,
        distance: closestStore.formattedDistance,
        rating: closestStore.rating,
        openNow: closestStore.opening_hours?.open_now,
        coords: {
          lat: closestStore.geometry.location.lat,
          lng: closestStore.geometry.location.lng
        }
      };
      
      // Remove from remaining stores
      const index = remainingStores.indexOf(closestStore);
      if (index !== -1) {
        remainingStores.splice(index, 1);
      }
    } else {
      // No nearby stores available, mark this product as unavailable locally
      console.log(`No nearby stores found for ${alt.name}, not including in results`);
    }
  });
  
  // Only return products that have a local store within range, or are services
  return results;
}

/**
 * Determine if a store type is relevant for the alternative
 */
function isRelevantStoreType(store: GooglePlace, alt: AlternativeProduct, expense: Expense): boolean {
  if (!store.types || store.types.length === 0) return true;
  
  // General store types to check
  const storeTypes = store.types.map(type => type.toLowerCase());
  
  // Check if store is a relevant type
  const isGrocery = storeTypes.some(type => 
    type.includes('grocery') || 
    type.includes('supermarket') || 
    type.includes('food')
  );
  
  const isRetail = storeTypes.some(type => 
    type.includes('store') || 
    type.includes('shop') || 
    type.includes('department_store') || 
    type.includes('shopping_mall')
  );
  
  const isElectronics = storeTypes.some(type => 
    type.includes('electronics_store')
  );
  
  // Check expense category for relevance
  const expenseText = `${expense.name || ''} ${expense.description || ''} ${expense.category || ''}`.toLowerCase();
  
  if (expenseText.includes('food') || expenseText.includes('grocery')) {
    return isGrocery;
  }
  
  if (expenseText.includes('electronics') || expenseText.includes('computer') || expenseText.includes('phone')) {
    return isElectronics || isRetail;
  }
  
  // Default to any retail store
  return isRetail;
}

/**
 * Determine appropriate store types based on expense category
 */
function determineStoreTypes(expense: Expense, alternatives: AlternativeProduct[]): string[] {
  // Default store types
  const defaultTypes = ['store', 'shopping_mall', 'department_store'];
  
  // Check if this is a service - don't need physical stores
  if (isServiceExpense(expense) && !alternatives.some(alt => alt.type === "physical")) {
    return [];
  }
  
  // Get category and description
  const expenseText = `${expense.name || ''} ${expense.description || ''} ${expense.category || ''}`.toLowerCase();
  
  // Grocery or food
  if (expenseText.includes('grocery') || expenseText.includes('food') || expenseText.includes('supermarket')) {
    return ['grocery_or_supermarket', 'supermarket', 'store'];
  }
  
  // Electronics
  if (expenseText.includes('electronics') || expenseText.includes('computer') || 
      expenseText.includes('phone') || expenseText.includes('tech')) {
    return ['electronics_store', 'store'];
  }
  
  // Clothing or shoes
  if (expenseText.includes('clothing') || expenseText.includes('clothes') || 
      expenseText.includes('fashion') || expenseText.includes('apparel') ||
      expenseText.includes('shoes') || expenseText.includes('footwear')) {
    return ['clothing_store', 'shoe_store', 'store', 'shopping_mall'];
  }
  
  // Sporting goods
  if (expenseText.includes('sport') || expenseText.includes('fitness') || 
      expenseText.includes('gym') || expenseText.includes('athletic')) {
    return ['sporting_goods', 'store'];
  }
  
  // Generic store type
  return defaultTypes;
}

/**
 * Generate keywords for store search based on expense and alternatives
 */
function getStoreKeywords(expense: Expense, alternatives: AlternativeProduct[]): string {
  // Extract store names from alternatives
  const storeNames = alternatives
    .filter(alt => alt.source && alt.source !== "Online Store" && alt.source !== "Comparison Service")
    .map(alt => alt.source)
    .filter((value, index, self) => self.indexOf(value) === index) // deduplicate
    .slice(0, 3) // limit to 3 store names
    .join(" ");
  
  // If we have store names, use those
  if (storeNames) {
    return storeNames;
  }
  
  // Add brand names if available in description (like Adidas, Nike, etc.)
  const description = expense.description?.toLowerCase() || "";
  const brandMatches = description.match(/\b(nike|adidas|puma|reebok|new balance|asics|under armour|vans|converse|skechers)\b/g);
  if (brandMatches && brandMatches.length > 0) {
    return `${brandMatches.join(" ")} ${expense.name || ""}`;
  }
  
  // Otherwise generate based on expense category
  const category = expense.category?.toLowerCase() || "";
  
  if (category.includes('grocery') || category.includes('food')) {
    return "supermarket grocery store";
  }
  
  if (category.includes('clothing') || category.includes('apparel') || expense.name?.toLowerCase().includes('shoes')) {
    return `${expense.name || ""} clothing fashion store`;
  }
  
  if (category.includes('electronics')) {
    return "electronics tech store";
  }
  
  // Use name and category as keywords
  return `${expense.name || ""} ${category} store shop retail`;
}

/**
 * Calculate distance between two points using the Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI/180);
}

/**
 * Check if expense is a service rather than physical product
 */
function isServiceExpense(expense: Expense): boolean {
  const serviceTerms = [
    'service', 'subscription', 'plan', 'insurance', 'membership', 
    'internet', 'streaming', 'phone plan', 'mobile plan', 'utility', 'utilities'
  ];
  
  const expenseText = `${expense.name || ''} ${expense.description || ''} ${expense.category || ''}`.toLowerCase();
  
  return serviceTerms.some(term => expenseText.includes(term));
} 