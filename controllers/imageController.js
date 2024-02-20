const axios = require('axios');

exports.generateImage = async (req, res, next) => {
  try {
    const { prompt } = req.body;
    const apiKey = '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';

    // Set up the request headers with the Authorization header
    const headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    };

    // Set up the request payload
    const data = {
      prompt: prompt,
      model: 'dall-e-3',
    };

    // Make the request to the OpenAI API
    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      data,
      { headers }
    );

    // Send the response back to the client
    res.json(response.data);
  } catch (error) {
    next(error);
  }
};
