const OpenAI = require('openai');
require("dotenv").config();
const { Configuration, OpenAIApi } = require("openai");

 

exports.generateImage = async (req, res, next) => {
  try {
    const { prompt } = req.body;
    const numberOfImages = 4; // Number of images to generate

   
const { OPENAI_API_KEY } = process.env;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});



    // Initialize an array to store the generated images
    let images = [];
    try {  
      const response = await openai.images.generate({
        prompt: prompt,
        model: 'dall-e-2',
        n: 4,
        // size: "512x512",
      });
     
      for (let i = 0; i < numberOfImages; i++) {
        console.log(response.data[i].url);
        images.push(response.data[i].url);
      }
      // Push the generated image to the array
     
    } catch (openaiError) {
      // Handle OpenAI errors
      console.error('OpenAI API error:', openaiError.message);
      throw openaiError; // Rethrow the error to be caught by the global error handler
    }
    // Make the request to the OpenAI API for each image
   

    // Send the array of generated images back to the client
    res.json(images);
  } catch (error) {
    next(error); // Forward the error to the global error handler
  }
};
