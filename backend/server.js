require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Url = require('./models/Url');
const { generateUniqueCode } = require('./utils/hashUtils');
const { validateShortCode } = require('./utils/validationUtils');

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// CORS configuration for production
const corsOptions = {
  origin: [
    'http://localhost:5173', // Local development
    'https://url-shortener-frontend.onrender.com', // Production frontend
    /\.onrender\.com$/ // Allow all Render subdomains
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Root endpoint - Backend status and database connection
app.get('/', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  
  res.json({
    message: 'URL Shortener Backend is running! 🚀',
    status: 'OK',
    database: {
      status: dbStatus,
      name: 'MongoDB Atlas - URL Database'
    },
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'URL Shortener API is running' });
});

// Shorten URL endpoint
app.post('/api/shorten', async (req, res) => {
  try {
    const { originalUrl } = req.body;
    
    if (!originalUrl) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Check if URL already exists
    const existingUrl = await Url.findOne({ originalUrl });
    if (existingUrl) {
      return res.json({
        originalUrl: existingUrl.originalUrl,
        shortUrl: existingUrl.shortUrl,
        shortCode: existingUrl.shortCode
      });
    }

    // Generate unique short code with collision handling
    const checkExists = async (code) => {
      const existing = await Url.findOne({ shortCode: code });
      return !!existing;
    };
    
    const shortCode = await generateUniqueCode(originalUrl, checkExists);
    const shortUrl = `${process.env.BASE_URL || `http://localhost:${PORT}`}/${shortCode}`;
    
    // Save to database
    const newUrl = new Url({
      originalUrl,
      shortCode,
      shortUrl
    });
    
    await newUrl.save();
    
    res.json({
      originalUrl,
      shortUrl,
      shortCode
    });
  } catch (error) {
    console.error('Error shortening URL:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Redirect to original URL - Simplified without server cache
app.get('/:shortCode', async (req, res) => {
  try {
    // Step 3: Extract Code from URL
    const { shortCode } = req.params;
    
    // Step 4: Check Code Format
    if (!validateShortCode(shortCode)) {
      return res.status(400).json({ 
        error: 'Invalid short code format',
        details: 'Code must be 6 characters using Base62 (A-Z, a-z, 0-9)'
      });
    }
    
    // Step 5: Look in Database
    const url = await Url.findOne({ shortCode });
    
    if (url) {
      // Increment click count
      url.clicks += 1;
      await url.save();
      
      // Step 6: Return Result - HTTP 301 Redirect
      res.redirect(301, url.originalUrl);
    } else {
      // Step 5: Not found in DB - 404 Not Found
      res.status(404).json({ 
        error: 'URL not found',
        details: 'Short code may have expired or never existed'
      });
    }
  } catch (error) {
    console.error('Error redirecting:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// New endpoint to get URL info (for browser cache check)
app.get('/api/url/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    
    // Validate format
    if (!validateShortCode(shortCode)) {
      return res.status(400).json({ 
        error: 'Invalid short code format',
        details: 'Code must be 6 characters using Base62 (A-Z, a-z, 0-9)'
      });
    }
    
    // Look in database
    const url = await Url.findOne({ shortCode });
    
    if (url) {
      // Increment click count
      url.clicks += 1;
      await url.save();
      
      res.json({
        originalUrl: url.originalUrl,
        shortCode: url.shortCode,
        clicks: url.clicks
      });
    } else {
      res.status(404).json({ 
        error: 'URL not found',
        details: 'Short code may have expired or never existed'
      });
    }
  } catch (error) {
    console.error('Error fetching URL info:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all URLs
app.get('/api/urls', async (req, res) => {
  try {
    const urls = await Url.find().sort({ createdAt: -1 });
    res.json(urls);
  } catch (error) {
    console.error('Error fetching URLs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});