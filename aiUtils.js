// Make sure you're running Node 18+ or have a fetch polyfill installed (e.g., node-fetch)
async function sendPrompt(prompt, systemPrompt) {
    // Build messages array for the Chat Completion API
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });
  
    // Prepare the request body
    const requestBody = {
      model: "o1", // Replace with "o1" if that is your intended model
      messages: messages,
    };
  
    // Make the POST request to OpenAI's Chat Completion API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, // ensure this env variable is set
      },
      body: JSON.stringify(requestBody),
    });
  
    // Handle errors
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }
  
    // Parse and return the response content
    const data = await response.json();
    return data.choices[0].message.content;
  }
  
  module.exports = { sendPrompt };
  