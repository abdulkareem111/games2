// aiUtils.js

require("dotenv").config();
const axios = require("axios");

async function sendPrompt(prompt, systemPrompt, model = "o1") {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const requestBody = {
    model,
    messages: messages,
  };

  if (model !== "o1") {
    // Lower temperature for stable/composable results
    requestBody.temperature = 0.2;
  }

  // Additional settings for "o1" model if needed
  if (model === "o1") {
    requestBody.reasoning_effort = "high";
  }

  // Use Axios with an extended timeout
  let response;
  try {
    response = await axios({
      method: "post",
      url: "https://api.openai.com/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      data: requestBody,
      timeout: 600000, // 10 minutes
    });
  } catch (error) {
    // If the request fails or times out, throw to catch in your route
    throw new Error(
      `OpenAI API error: ${error?.response?.status || 500} ${
        error?.response?.statusText || ""
      } - ${error?.response?.data || error.message}`
    );
  }

  // Response data from OpenAI
  const data = response.data;
  console.log(data.choices[0].message.content);
  return data.choices[0].message.content;
}

module.exports = { sendPrompt };
