import OpenAI from "openai"
import type { AlternativeProduct } from "@/lib/utils"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function findAlternatives(expense: {
  name: string
  amount: number
  description: string
  category: string
}): Promise<AlternativeProduct[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set")
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an assistant that provides price comparisons for products and services." },
        {
          role: "user",
          content: `Find alternative options for: ${expense.name} costing ${expense.amount} in the ${expense.category} category. Description: ${expense.description}. Provide product name, description, price, and link to service.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" },
    })

    const content = response.choices[0].message.content
    if (!content) {
      throw new Error("No content in OpenAI response")
    }

    const parsedContent = JSON.parse(content)
    if (!Array.isArray(parsedContent.alternatives)) {
      throw new Error("Invalid response format from OpenAI")
    }

    return parsedContent.alternatives.map((alt: any) => ({
      name: alt.name,
      description: alt.description,
      price: Number.parseFloat(alt.price.replace(/[^0-9.]/g, "")),
      url: alt.url,
    }))
  } catch (error) {
    console.error("Error in findAlternatives:", error)
    throw error
  }
}

