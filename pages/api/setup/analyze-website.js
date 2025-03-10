import axios from 'axios';
import * as cheerio from 'cheerio';
import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, userId } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log("Processing website:", url, "for user:", userId);
    
    try {
      // Scrape the website with detailed error handling
      console.log("Starting website scraping...");
      const scrapedData = await scrapeWebsite(url);
      console.log("Scraping successful, data length:", 
        scrapedData.mainText ? scrapedData.mainText.length : 0, 
        "characters, title:", scrapedData.title);
      
      // Store in Supabase with better error handling
      console.log("Storing data in Supabase...");
      const { data, error } = await supabase
        .from('website_data')
        .upsert({
          user_id: userId,
          url: url,
          title: scrapedData.title,
          description: scrapedData.description,
          content: scrapedData.mainText,
          services: scrapedData.services,
          last_analyzed: new Date().toISOString()
        }, {
          onConflict: 'user_id',
          returning: 'minimal'
        });
        
      if (error) {
        console.error("Supabase error details:", error);
        throw new Error(`Database error: ${error.message || 'Unknown error'}`);
      }
      
      console.log("Data successfully stored in Supabase");
      return res.status(200).json({ 
        success: true, 
        message: "Website analyzed and stored successfully" 
      });
    } catch (innerError) {
      console.error("Detailed error:", {
        message: innerError.message,
        stack: innerError.stack,
        url: url
      });
      throw innerError; // Re-throw to be caught by outer try/catch
    }
  } catch (error) {
    console.error("Error in website analysis:", {
      message: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      error: 'Failed to analyze website', 
      details: error.message,
      errorType: error.name
    });
  }
}

async function scrapeWebsite(url) {
  try {
    // Normalize URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Let's try with different proxies/methods and use the first one that works
    const methods = [
      tryDirectScraping,
      tryWithCorsProxy,
      tryWithAllOrigins,
      tryWithSimpleMetaData
    ];
    
    let lastError = null;
    
    // Try each method in sequence
    for (const method of methods) {
      try {
        console.log(`Trying scraping method: ${method.name}...`);
        const result = await method(url);
        console.log(`Method ${method.name} successful!`);
        return result;
      } catch (error) {
        console.error(`Method ${method.name} failed:`, error.message);
        lastError = error;
        // Continue to next method
      }
    }
    
    // If we get here, all methods failed
    throw lastError || new Error('All scraping methods failed');
  } catch (error) {
    console.error('Error in scrapeWebsite:', error);
    throw new Error(`Failed to scrape website: ${error.message}`);
  }
}

// Different scraping approaches to try
async function tryDirectScraping(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    return extractContent(response.data);
  } catch (error) {
    throw new Error(`Direct scraping failed: ${error.message}`);
  }
}

async function tryWithCorsProxy(url) {
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const response = await axios.get(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    return extractContent(response.data);
  } catch (error) {
    throw new Error(`CORS proxy scraping failed: ${error.message}`);
  }
}

async function tryWithAllOrigins(url) {
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const response = await axios.get(proxyUrl, {
      timeout: 10000
    });
    
    return extractContent(response.data);
  } catch (error) {
    throw new Error(`AllOrigins proxy scraping failed: ${error.message}`);
  }
}

async function tryWithSimpleMetaData(url) {
  // If all scraping fails, at least try to get basic data
  try {
    // Extract domain name for basic info
    const domain = new URL(url).hostname.replace('www.', '');
    const domainParts = domain.split('.');
    
    return {
      title: domain,
      description: `Website for ${domain}`,
      mainText: `This is a website with domain ${domain}. We couldn't scrape detailed content but will use this basic information.`,
      services: []
    };
  } catch (error) {
    throw new Error(`Even simple metadata extraction failed: ${error.message}`);
  }
}

// Extract content from HTML (used by multiple methods)
function extractContent(html) {
  const $ = cheerio.load(html);
  
  // Extract relevant content
  const title = $('title').text() || '';
  const description = $('meta[name="description"]').attr('content') || '';
  
  // Extract main content text
  let mainText = '';
  $('p, h1, h2, h3, h4, h5, h6, li').each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      mainText += text + '\n';
    }
  });
  
  // If we couldn't get any meaningful content, throw an error
  if (!mainText || mainText.length < 50) {
    // Try harder to get content - pull ALL text from body
    mainText = $('body').text().replace(/\s+/g, ' ').trim();
    
    if (!mainText || mainText.length < 50) {
      throw new Error('Could not extract meaningful content from page');
    }
  }
  
  // Extract services or offerings
  const services = [];
  $('.service, .offering, .program, .class, .package, .pricing, .product, .course, .workshop').each((_, el) => {
    services.push($(el).text().trim());
  });
  
  return {
    title,
    description,
    mainText: mainText.substring(0, 10000), // Limit text length
    services: services.length > 0 ? services : []
  };
} 