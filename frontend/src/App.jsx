import React, { useState } from 'react'

function App() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!url) {
      setError('Please enter a URL')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:5000/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch data')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError('Error: ' + err.message)
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-6 text-blue-600">
        Amazon Product Scraper
      </h1>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col md:flex-row gap-4 mb-6 justify-center items-center"
      >
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter Amazon product URL"
          className="flex-grow px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Scraping...' : 'Fetch Data'}
        </button>
      </form>

      {error && <div className="text-red-600 mb-4 text-center">{error}</div>}

      {loading && (
        <div className="text-center font-medium text-gray-600">
          Loading product data...
        </div>
      )}

      {result && (
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Result:</h2>

          <div className="flex">
            <h3 className="text-xl font-semibold mb-3">{result.productName}</h3>
            <div className="flex flex-col gap-1 mb-4">
              <img src={result.images[1]} alt="" />
              <span className="font-medium">
                Rating: {result.rating?.stars}
              </span>
              <span className="font-medium">
                Price: ₹{result.price?.selling}
              </span>
            </div>
          </div>
          <h4 className="text-lg font-semibold mb-2 text-gray-800">
            AI Review Summary:
          </h4>
          <p className="bg-gray-50 p-4 rounded mb-4 italic text-gray-700">
            {result.aiReviewSummary}
          </p>
          <h4 className="text-lg font-semibold mb-2 text-gray-800">
            Full Data:
          </h4>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default App
