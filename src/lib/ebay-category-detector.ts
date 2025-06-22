// src/lib/ebay-category-detector.ts
// Smart eBay category detection based on product content

interface EbayCategory {
  categoryId: string
  categoryName: string
  confidence: number
}

class EbayCategoryDetector {
  // Common eBay category mappings
  private categoryMappings = {
    // Electronics
    phone: { id: '15032', name: 'Cell Phones & Smartphones' },
    smartphone: { id: '15032', name: 'Cell Phones & Smartphones' },
    tablet: { id: '171485', name: 'iPad/Tablet/eBook Accessories' },
    laptop: { id: '177', name: 'PC Laptops & Netbooks' },
    computer: { id: '58058', name: 'Desktops & All-In-Ones' },
    headphones: { id: '167435', name: 'Headphones' },
    speaker: { id: '14946', name: 'Speakers & Subwoofers' },
    camera: { id: '625', name: 'Digital Cameras' },

    // Fashion
    shoes: { id: '63889', name: 'Athletic Shoes' },
    sneakers: { id: '63889', name: 'Athletic Shoes' },
    boots: { id: '53120', name: 'Boots' },
    dress: { id: '63861', name: 'Dresses' },
    shirt: { id: '1059', name: 'Casual Shirts' },
    jeans: { id: '11554', name: 'Jeans' },
    jacket: { id: '57988', name: 'Coats & Jackets' },
    watch: { id: '31387', name: 'Wristwatches' },
    jewelry: { id: '281', name: 'Fine Jewelry' },

    // Home & Garden
    furniture: { id: '3197', name: 'Furniture' },
    lamp: { id: '112581', name: 'Lamps, Lighting & Ceiling Fans' },
    kitchen: { id: '20625', name: 'Small Kitchen Appliances' },
    appliance: { id: '20625', name: 'Small Kitchen Appliances' },
    tool: { id: '631', name: 'Hand Tools' },

    // Sports & Fitness
    bike: { id: '7294', name: 'Cycling Equipment' },
    bicycle: { id: '7294', name: 'Cycling Equipment' },
    fitness: { id: '15273', name: 'Fitness, Running & Yoga' },
    sports: { id: '888', name: 'Sporting Goods' },

    // Books & Media
    book: { id: '267', name: 'Books' },
    dvd: { id: '11232', name: 'DVDs & Blu-ray Discs' },
    game: { id: '1249', name: 'Video Games' },
    music: { id: '11233', name: 'Music' },

    // Toys & Hobbies
    toy: { id: '220', name: 'Toys & Hobbies' },
    doll: { id: '237', name: 'Dolls & Bears' },
    puzzle: { id: '233', name: 'Puzzles' },

    // Automotive
    car: { id: '6028', name: 'eBay Motors' },
    auto: { id: '6028', name: 'eBay Motors' },
    motorcycle: { id: '6024', name: 'Motorcycles' },

    // Health & Beauty
    cosmetics: { id: '26395', name: 'Makeup' },
    skincare: { id: '26336', name: 'Skin Care' },
    perfume: { id: '31411', name: 'Fragrances' },
    supplement: { id: '177', name: 'Vitamins & Lifestyle Supplements' },
  }

  detectCategory(productData: {
    title: string
    description: string
    features?: string
  }): EbayCategory {
    const content =
      `${productData.title} ${productData.description} ${productData.features || ''}`.toLowerCase()

    let bestMatch: EbayCategory = {
      categoryId: '267', // Default to "Everything Else"
      categoryName: 'Everything Else',
      confidence: 0,
    }

    // Check for keyword matches
    for (const [keyword, category] of Object.entries(this.categoryMappings)) {
      if (content.includes(keyword)) {
        const confidence = this.calculateConfidence(keyword, content)

        if (confidence > bestMatch.confidence) {
          bestMatch = {
            categoryId: category.id,
            categoryName: category.name,
            confidence,
          }
        }
      }
    }

    // Apply business logic for category refinement
    bestMatch = this.refineCategory(bestMatch, content)

    console.log('🏷️ eBay category detected:', bestMatch)
    return bestMatch
  }

  private calculateConfidence(keyword: string, content: string): number {
    // Base confidence from keyword match
    let confidence = 0.5

    // Increase confidence if keyword appears in title
    if (content.substring(0, 100).includes(keyword)) {
      confidence += 0.3
    }

    // Increase confidence if keyword appears multiple times
    const matches = (content.match(new RegExp(keyword, 'g')) || []).length
    confidence += Math.min(matches * 0.1, 0.3)

    // Increase confidence for exact matches
    if (content.includes(` ${keyword} `) || content.startsWith(`${keyword} `)) {
      confidence += 0.2
    }

    return Math.min(confidence, 1.0)
  }

  private refineCategory(
    category: EbayCategory,
    content: string
  ): EbayCategory {
    // Refine electronics categories
    if (category.categoryId === '15032' && content.includes('android')) {
      return {
        categoryId: '9355',
        categoryName: 'Android Cell Phones & Smartphones',
        confidence: category.confidence + 0.1,
      }
    }

    if (category.categoryId === '15032' && content.includes('iphone')) {
      return {
        categoryId: '9394',
        categoryName: 'Apple iPhone Cell Phones & Smartphones',
        confidence: category.confidence + 0.1,
      }
    }

    // Refine fashion categories by gender
    if (
      category.categoryName.includes('Shoes') ||
      category.categoryName.includes('Athletic')
    ) {
      if (content.includes('men') || content.includes('male')) {
        return {
          categoryId: '15709',
          categoryName: 'Athletic Shoes for Men',
          confidence: category.confidence + 0.1,
        }
      }

      if (
        content.includes('women') ||
        content.includes('female') ||
        content.includes('ladies')
      ) {
        return {
          categoryId: '95672',
          categoryName: 'Athletic Shoes for Women',
          confidence: category.confidence + 0.1,
        }
      }
    }

    return category
  }

  // Get suggested categories for manual selection
  getSuggestedCategories(productData: any): EbayCategory[] {
    const primary = this.detectCategory(productData)
    const suggestions: EbayCategory[] = [primary]

    // Add alternative suggestions based on content
    const content =
      `${productData.title} ${productData.description}`.toLowerCase()

    // Electronics alternatives
    if (content.includes('electronic') || content.includes('digital')) {
      suggestions.push({
        categoryId: '293',
        categoryName: 'Consumer Electronics',
        confidence: 0.4,
      })
    }

    // Fashion alternatives
    if (content.includes('fashion') || content.includes('style')) {
      suggestions.push({
        categoryId: '11450',
        categoryName: 'Clothing, Shoes & Accessories',
        confidence: 0.4,
      })
    }

    // Home alternatives
    if (content.includes('home') || content.includes('house')) {
      suggestions.push({
        categoryId: '11700',
        categoryName: 'Home & Garden',
        confidence: 0.4,
      })
    }

    return suggestions.slice(0, 3) // Return top 3 suggestions
  }
}

export const ebayCategoryDetector = new EbayCategoryDetector()

// Helper function for easy use in API routes
export function detectEbayCategory(productData: any): string {
  const result = ebayCategoryDetector.detectCategory(productData)
  return result.categoryId
}

export function getEbayCategorySuggestions(productData: any): EbayCategory[] {
  return ebayCategoryDetector.getSuggestedCategories(productData)
}
