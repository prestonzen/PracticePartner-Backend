const OpenAI = require("openai");
require("dotenv").config();
const { Configuration, OpenAIApi } = require("openai");
const Firestore = require("@google-cloud/firestore");
const jwt = require('jsonwebtoken');

const projectId = process.env.GOOGLE_PROJECT_ID;
const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const key = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
const db = new Firestore({
  projectId: projectId,
  credentials: {
    client_email: email,
    private_key: key,
  },
});
// const db = new Firestore({
//   projectId: 'practice-partner-ab0ef',
//   keyFilename:
//     './practice-partner-ab0ef-firebase-adminsdk-9ic5b-9a4bf13548.json',
// });

exports.generateImage = async (req, res, next) => {
  try {
    const { prompt } = req.body;
    const numberOfImages = 4; // Number of images to generate

    const { OPENAI_API_KEY } = process.env;

    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
    const jwt_key = process.env.JWT_KEY;

    // Initialize an array to store the generated images
    let images = [];
    try {
      const response = await openai.images.generate({
        prompt: prompt,
        model: "dall-e-2",
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
      console.error("OpenAI API error:", openaiError.message);
      throw openaiError; // Rethrow the error to be caught by the global error handler
    }
    // Make the request to the OpenAI API for each image

    // Send the array of generated images back to the client
    const cookie = req.cookies['jwt'];
    const decodedCookie = jwt.verify(cookie, jwt_key);
    const userId = decodedCookie.email;

    //---------------------post prompt to user collection-------------------------
    const newPrompt = {
      prompt: prompt,
      img1: images[0],
      img2: images[1],
      img3: images[2],
      img4: images[3],
    };

    const userDoc = await db.collection('users').doc(userId).get();
    const currentFreePrompts = userDoc.data().freePrompts;

    if (userDoc.data().isFree && currentFreePrompts <= 0) {
      await db
      .collection("users")
      .doc(userId)
      .update({
        isFree: false,
      });
      res.status(401).json({ error: 'Insufficient free prompts' });
    } else{
    // Add the new prompt to the existing array of prompts
    if(userDoc.data().isFree){
    await db
      .collection("users")
      .doc(userId)
      .update({
        prompts: Firestore.FieldValue.arrayUnion(newPrompt),
        freePrompts: currentFreePrompts - 1,
      });
    }else{
      await db
      .collection("users")
      .doc(userId)
      .update({
        prompts: Firestore.FieldValue.arrayUnion(newPrompt)
      });
    }
    res.json(images);
    }
  } catch (error) {
    next(error); // Forward the error to the global error handler
  }
};



exports.getImage = async (req, res, next) => {
  try {
    const cookie = req.cookies['jwt'];
    const decodedCookie = jwt.verify(cookie, jwt_key);
    const userId = decodedCookie.email; // Replace with the actual user ID

    // Fetch the user's data from the database
    const imgDoc = await db.collection("users").doc(userId).get();

    // Check if the user exists in the database
    if (!imgDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    // Extract the prompts array from the user's data
    const { prompts } = imgDoc.data();

    // Check if prompts exist for the user
    if (!prompts || prompts.length === 0) {
      return res.status(404).json({ message: "No prompts found for the user" });
    }

    // Extract image URLs from the prompts array
    const images = prompts.map(prompt => ({
      prompt:prompt.prompt,
      img1: prompt.img1,
      img2: prompt.img2,
      img3: prompt.img3,
      img4: prompt.img4
    }));
    
    // Send the array of images back to the client
    res.json(images);
  } catch (error) {
    next(error); // Forward the error to the global error handler
  }
};
