import { NextResponse } from "next/server"
import OpenAI from "openai"
import type { Expense, AlternativeProduct } from "@/lib/utils"
import { searchAlternatives as braveFindAlternatives } from "@/lib/brave"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { expense } = await request.json()
    
    if (!expense?.description || !expense?.amount) {
      return NextResponse.json(
        { error: "Description and amount are required" },
        { status: 400 }
      )
    }

    // Collect alternatives from multiple sources
    const [aiAlternatives, braveAlternatives] = await Promise.allSettled([
      findAlternativesWithOpenAI(expense),
      braveFindAlternatives(expense)
    ])

    // Combine and deduplicate alternatives
    let combinedAlternatives: AlternativeProduct[] = []
    
    // Add OpenAI alternatives
    if (aiAlternatives.status === 'fulfilled') {
      combinedAlternatives = [...aiAlternatives.value]
    }
    
    // Add Brave Search alternatives
    if (braveAlternatives.status === 'fulfilled') {
      // Check for potential duplicates based on similar names
      braveAlternatives.value.forEach(braveAlt => {
        // Skip if it looks like a duplicate (similar name or URL)
        const isDuplicate = combinedAlternatives.some(existing => 
          // Similar name (case insensitive)
          existing.name.toLowerCase().includes(braveAlt.name.toLowerCase()) ||
          braveAlt.name.toLowerCase().includes(existing.name.toLowerCase()) ||
          // Similar URL
          (existing.url && braveAlt.url && 
           (existing.url.includes(braveAlt.url) || braveAlt.url.includes(existing.url)))
        )
        
        if (!isDuplicate) {
          combinedAlternatives.push(braveAlt)
        }
      })
    }
    
    // If we didn't find any alternatives with either method
    if (combinedAlternatives.length === 0) {
      throw new Error("No alternatives found from any source")
    }
    
    // Sort by highest savings first
    combinedAlternatives.sort((a, b) => b.savings - a.savings)
    
    // Return the top 3-5 alternatives
    return NextResponse.json(combinedAlternatives.slice(0, 5))

  } catch (error) {
    console.error("Error finding alternatives:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to find alternatives" },
      { status: 500 }
    )
  }
}

/**
 * Find alternatives using OpenAI's GPT-4
 */
async function findAlternativesWithOpenAI(expense: Expense): Promise<AlternativeProduct[]> {
  const prompt = `
    Find 3 cheaper alternatives for the following expense:
    Name: ${expense.name}
    Description: ${expense.description}
    Current Price: $${expense.amount} ${expense.frequency}
    Category: ${expense.category}
    Location: ${expense.location || 'Not specified'}

    For each alternative, provide:
    1. Name of the product/service (be precise and include brand name)
    2. Brief description highlighting key features that match the original expense needs
    3. Price (must be accurate, realistic, and lower than the current price of $${expense.amount})
    4. URL to the official product page (must be a real, functioning URL)
    5. Estimated savings compared to current expense

    IMPORTANT:
    - Research actual, current pricing - don't make up prices
    - Focus on finding 3 SPECIFIC alternatives with REAL pricing - not general suggestions
    - Include only established providers with verifiable prices
    - For internet providers, include actual plan names and speeds 
    - For subscription services, include actual tier names
    - Don't suggest any products or services that don't have published prices
    - Ensure all alternatives are currently available in ${expense.location || 'the market'}

    Return a JSON object with this exact format:
    {
      "alternatives": [
        {
          "name": "string",
          "description": "string",
          "price": number,
          "url": "string",
          "savings": number
        }
      ]
    }

    Ensure:
    - Return exactly 3 alternatives
    - All prices are lower than ${expense.amount}
    - All savings are positive numbers
    - All URLs are valid and point to real product pages
    - Sort by highest savings first
  `

  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: "You are a cost-optimization expert with deep knowledge of current market prices for various products and services. You provide factual, accurate alternatives with real pricing data, not estimates or guesses. When suggesting alternatives, focus on real, specific products with verifiable pricing information. Always research current prices rather than relying on outdated information."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.2, // Lower temperature for more factual responses
  })

  const response = completion.choices[0].message.content
  if (!response) {
    throw new Error("No response from OpenAI")
  }

  try {
    const parsedResponse = JSON.parse(response)
    if (!Array.isArray(parsedResponse.alternatives)) {
      throw new Error("Invalid response format: alternatives is not an array")
    }
    
    // Add source identifier to each alternative
    return parsedResponse.alternatives.map((alt: any, index: number) => ({
      ...alt,
      id: `openai-${index}`,
      source: "OpenAI"
    }))
  } catch (parseError) {
    console.error("Error parsing OpenAI response:", parseError)
    console.log("Raw response:", response)
    throw new Error("Failed to parse alternatives from OpenAI response")
  }
}

