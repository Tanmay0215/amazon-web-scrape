const puppeteer = require('puppeteer')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const fs = require('fs')
const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')

const app = express()
const port = 5000

dotenv.config()
app.use(express.json())
app.use(cors())

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

async function scrapeAmazonProduct(url) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  const page = await browser.newPage()

  try {
    await page.goto(url, { waitUntil: 'networkidle2' })

    const productData = {
      productName: await page
        .$eval('#productTitle', (el) => el.textContent.trim())
        .catch(() => 'N/A'),
      rating: {
        stars: await page
          .$eval('.a-icon-star .a-icon-alt', (el) => el.textContent)
          .catch(() => 'N/A'),
        totalRatings: await page
          .$eval('#acrCustomerReviewText', (el) => el.textContent.trim())
          .catch(() => 'N/A'),
      },
      price: {
        selling: await page
          .$eval('.a-price-whole', (el) => el.textContent.trim())
          .catch(() => 'N/A'),
        discount: await page
          .$eval('.savingsPercentage', (el) => el.textContent.trim())
          .catch(() => 'N/A'),
      },
      bankOffers: await page.$$eval('.bank-offer-promo', (els) =>
        els.map((el) => el.textContent.trim().replace(/\s+/g, ' '))
      ),
      aboutItem: await page.$$eval('#feature-bullets ul li', (els) =>
        els.map((el) => el.textContent.trim())
      ),
      productInfo: await page.$$eval('#productDetailsTable tr', (rows) =>
        Object.fromEntries(
          rows
            .map((row) => {
              const [key, value] = Array.from(row.querySelectorAll('td'))
              return [key?.textContent.trim(), value?.textContent.trim()]
            })
            .filter(Boolean)
        )
      ),
      images: await page.$$eval('#main-image-container img', (imgs) =>
        imgs.map((img) => img.src).filter((src) => !src.includes('play-icon'))
      ),
      manufacturerImages: await page
        .$$eval('#manufacturer-image-container img', (imgs) =>
          imgs.map((img) => img.src)
        )
        .catch(() => []),
      aiReviewSummary: '',
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const prompt = `Generate a concise customer review summary for this product: ${
      productData.productName
    } with features: ${productData.aboutItem.join(', ')}`
    const result = await model.generateContent(prompt)
    productData.aiReviewSummary = (await result.response).text()

    return productData
  } catch (error) {
    console.error('Error scraping product:', error)
    throw error
  } finally {
    await browser.close()
  }
}

app.post('/api/scrape', async (req, res) => {
  const { url } = req.body

  if (!url) {
    return res.status(400).json({ error: 'URL is required' })
  }

  try {
    const productData = await scrapeAmazonProduct(url)
    res.json(productData)
  } catch (error) {
    console.error('Error handling scrape request:', error)
    res.status(500).json({ error: 'Failed to scrape product data' })
  }
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
