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
      console.log("Starting website scrape...");
      const scrapedContent = await scrapeWebsite(proxyUrl);
      console.log("Scrape results:", {
        title: scrapedContent.title,
        descriptionLength: scrapedContent.description.length,
        textLength: scrapedContent.mainText.length,
        servicesFound: scrapedContent.services ? scrapedContent.services.length : 0
      });
      
      if (!scrapedContent.mainText || scrapedContent.mainText.length < 100) {
        console.log("Insufficient content scraped, falling back");
        throw new Error("Insufficient content scraped");
      }
      
      // Step 2: Analyze with Gemini
      const analysis = await analyzeWithGemini(scrapedContent, url);
      console.log("Analysis successful");
      
      // Return the analysis
      return res.status(200).json({ analysis });
    } catch (scrapeError) {
      console.error("Scraping/analysis error details:", {
        message: scrapeError.message,
        stack: scrapeError.stack
      });
      
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
    // Extract domain name and potential keywords from the URL
    const domain = new URL(url).hostname.replace('www.', '');
    const domainParts = domain.split('.');
    const keywords = domainParts[0].split(/[^a-zA-Z0-9]/).filter(word => word.length > 2);
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const prompt = `
      I need to analyze a fitness business based only on its URL: ${url}
      
      The domain name is: ${domain}
      Potential keywords from the domain: ${keywords.join(', ')}
      
      Please provide:
      1. A detailed analysis of what type of fitness business this likely is
      2. What services they probably offer based on common industry patterns
      3. Their potential target demographic and business approach
      4. Suggestions for content they might want to create
      
      Make your response detailed and specific to the fitness industry, while acknowledging these are educated guesses based only on the URL.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Fallback analysis failed:", error);
    return `Based on your domain, you appear to operate a fitness business. Without being able to access your website content directly, I can provide general recommendations for fitness businesses:\n\n- Most successful fitness businesses focus on a specific niche rather than trying to appeal to everyone\n- Your content strategy should include transformation stories, educational content about your approach, and regular engagement with your community\n- Consider creating content that addresses common pain points like lack of time, motivation struggles, and confusion about fitness techniques`;
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