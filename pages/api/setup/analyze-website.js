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

    console.log("Processing website:", url);
    
    // Scrape the website
    const scrapedData = await scrapeWebsite(url);
    
    // Store in Supabase
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
      console.error("Error storing website data:", error);
      throw error;
    }
    
    return res.status(200).json({ 
      success: true, 
      message: "Website analyzed and stored successfully" 
    });
  } catch (error) {
    console.error("Error in website analysis:", error);
    return res.status(500).json({ 
      error: 'Failed to analyze website', 
      details: error.message 
    });
  }
}

async function scrapeWebsite(url) {
  try {
    // Normalize URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Use a CORS proxy to bypass CORS restrictions
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    
    // Make a request to the website
    const response = await axios.get(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000 // 10 second timeout
    });
    
    const html = response.data;
    
    // Parse the HTML using cheerio
    const $ = cheerio.load(html);
    
    // Extract relevant content
    const title = $('title').text();
    const description = $('meta[name="description"]').attr('content') || '';
    
    // Extract main content text
    let mainText = '';
    $('p, h1, h2, h3, h4, h5, h6, li').each((_, el) => {
      const text = $(el).text().trim();
      if (text) {
        mainText += text + '\n';
      }
    });
    
    // Extract services or offerings
    const services = [];
    $('.service, .offering, .program, .class, .package, .pricing, .product, .course, .workshop').each((_, el) => {
      services.push($(el).text().trim());
    });
    
    return {
      title,
      description,
      mainText,
      services: services.length > 0 ? services : []
    };
  } catch (error) {
    console.error('Error scraping website:', error);
    throw new Error(`Failed to scrape website: ${error.message}`);
  }
} 