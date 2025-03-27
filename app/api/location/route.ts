import { NextRequest, NextResponse } from "next/server";

// Mock user location for development - will be replaced with real location API
const MOCK_USER_LOCATION = {
  latitude: 40.7128,
  longitude: -74.0060,
  city: "New York",
  state: "NY",
  country: "USA"
};

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Handles POST requests to get nearest location for a product or service
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { searchTerm, userLocation } = data;
    
    if (!searchTerm) {
      return NextResponse.json(
        { error: "Search term is required" },
        { status: 400 }
      );
    }
    
    // Use provided user location or fallback to mock location
    const location = userLocation || MOCK_USER_LOCATION;
    
    // For demo/dev, if no API key is available, return mock data
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn("No Google Maps API key found, using mock data");
      return NextResponse.json({
        locations: [generateMockLocation(searchTerm, location)]
      });
    }
    
    // Make request to Google Places API
    const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchTerm)}&location=${location.latitude},${location.longitude}&radius=10000&key=${GOOGLE_MAPS_API_KEY}`;
    
    const placesResponse = await fetch(placesUrl);
    const placesData = await placesResponse.json();
    
    if (placesData.status !== "OK") {
      console.error("Google Places API error:", placesData.status);
      // Fallback to mock data on API error
      return NextResponse.json({
        locations: [generateMockLocation(searchTerm, location)]
      });
    }
    
    // Process and return the nearest locations
    const locations = placesData.results.slice(0, 3).map((place: any) => ({
      name: place.name,
      address: place.formatted_address,
      distance: calculateDistance(
        location.latitude, 
        location.longitude,
        place.geometry.location.lat,
        place.geometry.location.lng
      ),
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      placeId: place.place_id
    }));
    
    return NextResponse.json({ locations });
    
  } catch (error) {
    console.error("Error in location API:", error);
    return NextResponse.json(
      { error: "Failed to retrieve location data" },
      { status: 500 }
    );
  }
}

/**
 * Generate mock location data for development/testing
 */
function generateMockLocation(searchTerm: string, userLocation: any) {
  // Create realistic mock location data based on search term
  const storeName = searchTerm.includes("Coles") ? "Coles" : 
                   searchTerm.includes("Woolworths") ? "Woolworths" :
                   searchTerm.includes("IGA") ? "IGA" :
                   searchTerm.includes("Aldi") ? "Aldi" : "Local Store";
  
  // Randomize the address slightly
  const streetNumber = Math.floor(Math.random() * 100) + 1;
  const streets = ["Main St", "High St", "Park Rd", "Market St", "Station Rd"];
  const street = streets[Math.floor(Math.random() * streets.length)];
  
  return {
    name: storeName,
    address: `${streetNumber} ${street}, ${userLocation.city}, ${userLocation.state}`,
    distance: (Math.random() * 5).toFixed(1) + " km",
    latitude: userLocation.latitude + (Math.random() - 0.5) * 0.01,
    longitude: userLocation.longitude + (Math.random() - 0.5) * 0.01,
    placeId: "mock-place-id-" + Math.random().toString(36).substring(2, 10)
  };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  
  return distance.toFixed(1) + " km";
} 