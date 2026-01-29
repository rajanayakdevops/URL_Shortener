import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

// Browser cache utilities
const CACHE_KEY = 'urlShortenerCache'
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

const getFromCache = (shortCode) => {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    const cached = cache[shortCode]
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.originalUrl
    }
    
    // Remove expired entry
    if (cached) {
      delete cache[shortCode]
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    }
    
    return null
  } catch (error) {
    console.error('Cache read error:', error)
    return null
  }
}

const setToCache = (shortCode, originalUrl) => {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    cache[shortCode] = {
      originalUrl,
      timestamp: Date.now()
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error('Cache write error:', error)
  }
}

function App() {
  const [originalUrl, setOriginalUrl] = useState('')
  const [shortenedUrls, setShortenedUrls] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchUrls()
    
    // Cache existing URLs in browser
    const cacheExistingUrls = async () => {
      try {
        const response = await axios.get('/api/urls')
        response.data.forEach(url => {
          setToCache(url.shortCode, url.originalUrl)
        })
      } catch (error) {
        console.error('Error caching existing URLs:', error)
      }
    }
    
    cacheExistingUrls()
  }, [])

  const fetchUrls = async () => {
    try {
      const response = await axios.get('/api/urls')
      setShortenedUrls(response.data)
    } catch (error) {
      console.error('Error fetching URLs:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!originalUrl) return

    setLoading(true)
    try {
      const response = await axios.post('/api/shorten', { originalUrl })
      const newUrl = response.data
      
      // Cache the new URL in browser
      setToCache(newUrl.shortCode, newUrl.originalUrl)
      
      setShortenedUrls([newUrl, ...shortenedUrls])
      setOriginalUrl('')
    } catch (error) {
      console.error('Error shortening URL:', error)
    }
    setLoading(false)
  }

  return (
    <div className="App">
      <div className="container">
        <h1>URL Shortener</h1>
        
        <form onSubmit={handleSubmit} className="url-form">
          <input
            type="url"
            value={originalUrl}
            onChange={(e) => setOriginalUrl(e.target.value)}
            placeholder="Enter URL to shorten"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Shortening...' : 'Shorten URL'}
          </button>
        </form>

        <div className="urls-list">
          {shortenedUrls.map((url, index) => (
            <div key={index} className="url-item">
              <div className="original-url">
                <strong>Original:</strong> {url.originalUrl}
              </div>
              <div className="short-url">
                <strong>Shortened:</strong> 
                <a href={url.shortUrl} target="_blank" rel="noopener noreferrer">
                  {url.shortUrl}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App