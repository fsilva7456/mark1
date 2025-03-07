// DOM elements
const userInput = document.getElementById('userInput');
const submitBtn = document.getElementById('submitBtn');
const resultDisplay = document.getElementById('resultDisplay');
const loadingIndicator = document.getElementById('loadingIndicator');

// Your Gemini API key - this should be stored securely in a production environment
const API_KEY = 'YOUR_GEMINI_API_KEY';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// Event listener for the submit button
submitBtn.addEventListener('click', async () => {
    const text = userInput.value.trim();
    
    if (!text) {
        resultDisplay.textContent = 'Please enter some text to process.';
        return;
    }
    
    try {
        // Show loading indicator
        loadingIndicator.classList.remove('hidden');
        resultDisplay.textContent = '';
        
        // Call the Gemini API
        const response = await processWithGemini(text);
        
        // Display the result
        resultDisplay.innerHTML = formatResponse(response);
    } catch (error) {
        resultDisplay.textContent = `Error: ${error.message}`;
        console.error('API Error:', error);
    } finally {
        // Hide loading indicator
        loadingIndicator.classList.add('hidden');
    }
});

// Function to call the Gemini API
async function processWithGemini(text) {
    const requestBody = {
        contents: [{
            parts: [{
                text: text
            }]
        }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800
        }
    };
    
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API request failed');
    }
    
    return await response.json();
}

// Function to format the API response for display
function formatResponse(response) {
    try {
        const textContent = response.candidates[0].content.parts[0].text;
        // Convert line breaks to <br> tags and maintain formatting
        return textContent.replace(/\n/g, '<br>');
    } catch (error) {
        console.error('Error formatting response:', error);
        return 'Error processing the response from Gemini.';
    }
} 