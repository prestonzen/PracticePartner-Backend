const axios = require('axios');

exports.generateImage = async (req, res, next) => {
  try {
    const { prompt } = req.body;
    const apiKey = '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';
    const numberOfImages = 4; // Number of images to generate

    // Set up the request headers with the Authorization header
    const headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    };

    // Initialize an array to store the generated images
    let images = [];

    // Set up the request payload
    const data = {
      prompt: prompt,
      model: 'dall-e-3',
    };

    // Make the request to the OpenAI API for each image
    for (let i = 0; i < numberOfImages; i++) {
      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        data,
        { headers }
      );

      // Push the generated image to the array
      images.push(response.data);
    }

    // Send the array of generated images back to the client
    res.json(images);
  } catch (error) {
    next(error);
  }
};
