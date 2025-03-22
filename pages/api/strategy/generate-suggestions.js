import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('🔍 [DEBUG] Suggestion API - Request received:', JSON.stringify(req.body));
    const { question, businessContext, previousAnswers, questionIndex } = req.body;
    
    // Skip suggestion generation for name question
    if (questionIndex === 0) {
      console.log('🔍 [DEBUG] Skipping suggestions for name question (index 0)');
      return res.status(200).json({ suggestions: [] });
    }
    
    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('🔍 [DEBUG] API key present:', !!apiKey, 'length:', apiKey ? apiKey.length : 0);
    if (!apiKey) {
      console.error('❌ [ERROR] Missing Gemini API key');
      return res.status(500).json({ error: 'Server configuration error: Missing API key' });
    }
    
    // Configure API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Create prompt based on question type
    let promptContext = "";
    
    // Add context from previous answers if available
    if (previousAnswers && previousAnswers.length > 0) {
      promptContext += "Previous answers:\n";
      for (let i = 0; i < previousAnswers.length; i++) {
        if (previousAnswers[i] && i > 0) { // Skip first question (name)
          promptContext += `Question ${i}: ${previousAnswers[i]}\n`;
        }
      }
      promptContext += "\n";
    }
    
    const prompt = `
      ${promptContext}
      You are an expert marketing consultant helping a ${businessContext} create a marketing strategy.
      
      Please provide 3 different high-quality, CONCISE suggestions for this question:
      "${question}"
      
      The suggestions should be:
      1. Specific to a ${businessContext}
      2. Varied to present different options
      3. VERY BRIEF (25-40 words maximum per suggestion)
      4. Professional and ready to use
      
      Format your response as a JSON array with exactly 3 suggestions:
      ["short suggestion 1", "short suggestion 2", "short suggestion 3"]
    `;
    
    console.log('🔍 [DEBUG] Prompt being sent to Gemini API:', prompt);
    console.log('🔍 [DEBUG] Generating suggestions with Gemini API...');
    
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 1024,
        },
      });
      
      console.log('✅ [DEBUG] Gemini API call successful');
      const response = result.response;
      const text = response.text();
      console.log('🔍 [DEBUG] Raw API response text:', text);
      
      // Extract JSON array from response
      let suggestions;
      try {
        // Look for JSON array in the response
        console.log('🔍 [DEBUG] Attempting to parse JSON from response');
        const jsonMatch = text.match(/\[\s*".*"\s*,\s*".*"\s*,\s*".*"\s*\]/s) || 
                          text.match(/```json\n([\s\S]*?)\n```/) ||
                          text.match(/```\n([\s\S]*?)\n```/);
        
        if (jsonMatch) {
          console.log('✅ [DEBUG] JSON pattern matched:', jsonMatch[0]);
          const jsonString = jsonMatch[0].replace(/```json\n|```\n|```/g, '');
          console.log('🔍 [DEBUG] Cleaned JSON string:', jsonString);
          suggestions = JSON.parse(jsonString);
        } else {
          console.log('ℹ️ [DEBUG] No JSON pattern matched, trying to parse entire response');
          suggestions = JSON.parse(text);
        }
        
        console.log('✅ [DEBUG] Parsed suggestions:', JSON.stringify(suggestions));
        
        // Ensure we have exactly 3 suggestions
        if (!Array.isArray(suggestions) || suggestions.length < 3) {
          console.log('⚠️ [DEBUG] Invalid suggestions format or count:', JSON.stringify(suggestions));
          throw new Error('Invalid suggestions format');
        }
        
        // Limit to first 3 suggestions
        suggestions = suggestions.slice(0, 3);
        
        console.log('✅ [DEBUG] Returning final suggestions:', JSON.stringify(suggestions));
        return res.status(200).json({ suggestions });
      } catch (parseError) {
        console.error('❌ [ERROR] Failed to parse suggestions:', parseError);
        console.log('⚠️ [DEBUG] Attempting text-based extraction fallback');
        
        // Fallback: extract text-based suggestions from the response
        const lines = text.split('\n').filter(line => 
          line.trim().length > 0 && 
          !line.includes('```') &&
          !line.includes('[') &&
          !line.includes(']')
        );
        
        console.log('🔍 [DEBUG] Filtered text lines:', lines);
        
        const extractedSuggestions = lines.slice(0, 3).map(line => {
          return line.replace(/^\d+\.\s*/, '')  // Remove numbering
                    .replace(/^["']|["']$/g, ''); // Remove quotes
        });
        
        console.log('🔍 [DEBUG] Extracted suggestions:', extractedSuggestions);
        
        if (extractedSuggestions.length >= 3) {
          console.log('✅ [DEBUG] Using text-extracted suggestions');
          return res.status(200).json({ suggestions: extractedSuggestions });
        }
        
        // Last resort fallback
        console.log('⚠️ [DEBUG] Using last resort fallback suggestions');
        return res.status(200).json({ 
          suggestions: [
            "Option 1: Consider your unique strengths and positioning in the market.",
            "Option 2: Think about what specific problems you solve for your clients.",
            "Option 3: Focus on what differentiates you from competitors."
          ] 
        });
      }
    } catch (apiError) {
      console.error('❌ [ERROR] Gemini API call failed:', apiError);
      throw apiError; // Re-throw to be caught by outer try-catch
    }
  } catch (error) {
    console.error('❌ [ERROR] Error generating suggestions:', error);
    return res.status(500).json({ 
      error: 'Failed to generate suggestions', 
      message: error.message
    });
  }
} 