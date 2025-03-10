// Import necessary libraries for web scraping and Gemini API
import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log("Received URL:", url);
    
    // Set headers to prevent timeout
    res.setHeader('Connection', 'keep-alive');
    
    // Use a CORS proxy to avoid CORS issues
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    console.log("Using proxy URL:", proxyUrl);

    try {
      // Step 1: Scrape the website through the proxy
      const scrapedContent = await scrapeWebsite(proxyUrl);
      console.log("Scraping successful");
      
      // Step 2: Analyze with Gemini
      const analysis = await analyzeWithGemini(scrapedContent, url);
      console.log("Analysis successful");
      
      // Return the analysis
      return res.status(200).json({ analysis });
    } catch (scrapeError) {
      console.error("Scraping/analysis error:", scrapeError);
      
      // Fallback to a simpler analysis based just on the URL
      const fallbackAnalysis = await generateFallbackAnalysis(url);
      return res.status(200).json({ 
        analysis: fallbackAnalysis,
        warning: "Used fallback analysis due to scraping issues" 
      });
    }
  } catch (error) {
    console.error("Unhandled error in API route:", error);
    return res.status(500).json({ 
      error: 'Failed to analyze website', 
      details: error.message 
    });
  }
}

// Add a fallback function for when scraping fails
async function generateFallbackAnalysis(url) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const prompt = `
      I couldn't scrape this fitness business website: ${url}
      
      Based just on the URL and domain name, please make educated guesses about:
      1. What type of fitness business this might be
      2. Possible services they might offer
      3. The likely focus of their approach
      
      Format as a paragraph that acknowledges these are educated guesses.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Fallback analysis failed:", error);
    return "This appears to be a fitness business website. Without being able to access the content, I can't provide specific details about their services or approach.";
  }
}

async function scrapeWebsite(url) {
  try {
    // Make a request to the website
    const response = await axios.get(url);
    const html = response.data;
    
    // Parse the HTML using cheerio
    const $ = cheerio.load(html);
    
    // Extract relevant content (this will vary depending on the website structure)
    // For a fitness business, we'll look for common elements
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
    
    // Extract services or offerings (common patterns in fitness sites)
    const services = [];
    $('.service, .offering, .program, .class, .package, .pricing').each((_, el) => {
      services.push($(el).text().trim());
    });
    
    // Return structured scraped content
    return {
      title,
      description,
      mainText,
      services: services.length > 0 ? services : undefined
    };
  } catch (error) {
    console.error('Error scraping website:', error);
    throw new Error('Failed to scrape website');
  }
}

async function analyzeWithGemini(content, url) {
  try {
    // Create a prompt for Gemini
    const prompt = `
      I've scraped the following content from a fitness business website (${url}):
      
      Title: ${content.title}
      Description: ${content.description}
      
      Main content:
      ${content.mainText.substring(0, 5000)} // Limit text length to avoid token limits
      
      ${content.services ? `Services offered:\n${content.services.join('\n')}` : ''}
      
      Based on this content, please provide:
      1. A brief summary of what this fitness business specializes in
      2. Their main offerings or services
      3. Any unique selling points or approaches they mention
      4. The overall focus or philosophy of their fitness approach
      
      Format your response as a concise paragraph that I can use to understand their business model.
    `;
    
    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text;
  } catch (error) {
    console.error('Error analyzing with Gemini:', error);
    throw new Error('Failed to analyze with Gemini');
  }
} 