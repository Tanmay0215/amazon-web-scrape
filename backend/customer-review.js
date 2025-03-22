const puppeteer = require('puppeteer')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const fs = require('fs')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

async function fetchCustomerReviews(url) {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(url, { waitUntil: 'networkidle2' })

  // Click on the "See all reviews" link if available
  try {
    const seeAllReviewsSelector = '.a-link-emphasis.a-text-bold'
    if (await page.$(seeAllReviewsSelector)) {
      await page.click(seeAllReviewsSelector)
      await page.waitForNavigation({ waitUntil: 'networkidle2' })
    }
  } catch (err) {
    console.log('No "See all reviews" link found.')
  }

  // Extract reviews
  const reviews = []
  let hasNextPage = true

  while (hasNextPage) {
    const pageReviews = await page.$$eval('.review', (reviewElements) =>
      reviewElements.map((review) => ({
        rating: review.querySelector('.a-icon-alt')?.textContent || '',
        title:
          review.querySelector('.review-title span')?.textContent.trim() || '',
        content:
          review
            .querySelector('.review-text-content span')
            ?.textContent.trim() || '',
        author:
          review.querySelector('.a-profile-name')?.textContent.trim() || '',
        date: review.querySelector('.review-date')?.textContent.trim() || '',
      }))
    )

    reviews.push(...pageReviews)

    // Check if there is a "Next" button and navigate to the next page
    const nextButtonSelector = '.a-last a'
    hasNextPage = await page.$(nextButtonSelector)
    if (hasNextPage) {
      console.log('Navigating to the next page of reviews...')
      await Promise.all([
        page.click(nextButtonSelector),
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
      ])
    }
  }

  await browser.close()
  return reviews
}

async function generateAIReviewSummary(reviews) {
  // Combine reviews into a single text block for analysis
  const reviewTexts = reviews
    .slice(0, 50)
    .map((r) => `${r.title}: ${r.content}`)
    .join('\n')

  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

  const prompt = `Analyze these product reviews and create a concise summary highlighting:
1. Overall sentiment (positive/neutral/negative)
2. Most praised features
3. Common complaints
4. Key insights for potential buyers

Reviews:\n${reviewTexts}`

  try {
    const result = await model.generateContent(prompt)
    return (await result.response).text()
  } catch (error) {
    console.error('AI summary generation failed:', error)
    return 'Summary unavailable'
  }
}

// Main function to fetch reviews and generate a summary
async function getProductAnalysis(productUrl) {
  console.log('Fetching customer reviews...')
  const reviews = await fetchCustomerReviews(productUrl)

  console.log(`Fetched ${reviews.length} reviews. Generating AI summary...`)

  const summary = await generateAIReviewSummary(reviews)

  const analysis = {
    totalReviews: reviews.length,
    averageRating:
      reviews.reduce(
        (acc, r) => acc + parseFloat(r.rating.split(' ')[0] || 0),
        0
      ) / (reviews.length || 1),
    aiSummary: summary,
    sampleReviews: reviews.slice(0, 5), // Include first 5 sample reviews
  }

  // Save to JSON file
  fs.writeFileSync(
    'product-reviews-analysis.json',
    JSON.stringify(analysis, null, 2)
  )

  console.log('Analysis saved to product-reviews-analysis.json')
  return analysis
}

// Example usage
;(async () => {
  const productUrl = 'https://www.amazon.in/Scotch-Brite-Heavy-Duty-Gloves-Medium/dp/B00NBM0WD4/ref=sr_1_3?_encoding=UTF8&s=home-improvement&sr=1-3' // Replace with your product URL
  const analysis = await getProductAnalysis(productUrl)

  console.log('Product Analysis:', analysis)
})()
