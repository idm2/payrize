import { NextResponse } from "next/server"

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

const countryCodeMap: Record<string, string> = {
  "Australia": "AU",
  "United States": "US",
  "Canada": "CA",
  "United Kingdom": "GB",
  "New Zealand": "NZ",
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get("country")
  const search = searchParams.get("search")

  console.log("API Request:", { country, search }) // Debug log

  if (!country || !search || search.length < 2) {
    console.log("Invalid parameters") // Debug log
    return NextResponse.json({ suburbs: [] })
  }

  try {
    const countryCode = countryCodeMap[country as keyof typeof countryCodeMap]
    if (!countryCode) {
      return NextResponse.json({ suburbs: [] })
    }

    // Call Google Places Autocomplete API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?` +
      `input=${encodeURIComponent(search)}` +
      `&types=(regions)` + // This will return localities and sublocalities
      `&components=country:${countryCode}` +
      `&key=${GOOGLE_API_KEY}`
    )

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Google Places API error: ${data.status}`)
    }

    // Process and clean up the predictions
    const suburbs = (data.predictions || [])
      .map((prediction: any) => {
        // Split the description into parts (usually suburb, state, country)
        const parts = prediction.description.split(',')
        // Return just the suburb name (first part)
        return parts[0].trim()
      })
      // Remove duplicates
      .filter((suburb: string, index: number, self: string[]) => 
        self.indexOf(suburb) === index
      )

    console.log("API Response:", { suburbs }) // Debug log
    return NextResponse.json({ suburbs })

  } catch (error) {
    console.error("Error in suburbs API:", error)
    return NextResponse.json(
      { 
        suburbs: [], 
        error: error instanceof Error ? error.message : "Unknown error" 
      }, 
      { status: 500 }
    )
  }
}

