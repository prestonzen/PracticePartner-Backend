const OpenAI = require('openai');
const jwt = require('jsonwebtoken');
const Firestore = require('@google-cloud/firestore');
const { store } = require('../middlewares/sessionMiddleware');
const { MemoryStore } = require('express-session');

const db = new Firestore({
  projectId: 'practice-partner-ab0ef',
  keyFilename:
    './practice-partner-ab0ef-firebase-adminsdk-9ic5b-9a4bf13548.json',
});



// Provide your OpenAI API key here
const apiKey = process.env.OPENAI_API_KEY;
const jwt_key = process.env.JWT_KEY;

const openai = new OpenAI({
  apiKey: apiKey,
});
// Function to start a streamed chat
exports.startChat = async (req, res, next) => {
  try {
    // Extract messages from the request body
    const { messages } = req.body;
    const cookie = req.cookies['jwt'];

    // Ensure messages is an array and not empty
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error(
        "'messages' must be a non-empty array of message objects."
      );
    }

    // Check if each message object has 'role' and 'content' properties
    for (const message of messages) {
      if (!message.role || !message.content) {
        throw new Error(
          "Each message object must have 'role' and 'content' properties."
        );
      }
    }

    // Decode the JWT token to get the userId
    // const token = await req.cookies['jwt'];
    console.log(cookie);
    const decodedCookie = jwt.verify(cookie, jwt_key);
    // Replace 'your_secret_key' with your actual JWT secret key

    // Extract the userId from the decoded token
    const userId = decodedCookie.email;

    // Call OpenAI API to generate chat completion
    const completion = await openai.chat.completions.create({
      messages,
      model: 'gpt-3.5-turbo-0125',
      response_format: { type: 'json_object' },
    });

    // Check if completion.choices exists before accessing it
    if (!completion.choices) {
      throw new Error(
        "Invalid response from OpenAI API: 'completion.choices' is undefined."
      );
    }

    // Extract the content of the first message in the completion
    const responseContent = completion.choices[0].message.content;
    const parsedMessage = JSON.parse(responseContent);
    // console.log(parsedMessage);
    //save to db
    let rslt = '';
    // ans = responseContent.message;
    const iterateObject = (obj) => {
      Object.keys(obj).forEach((key) => {
        const value = obj[key];
        rslt += ' ';
        // console.log(`${key}:`);
        if (typeof value === 'object' && value !== null) {
          // If the value is an object, recursively iterate over it
          iterateObject(value);
        } else {
          // Otherwise, log the value
          // setRslt(prevState => prevState + value);
          rslt += value;
          // console.log(value);
        }
      });
    };
    iterateObject(parsedMessage);

    const newChat = {
      question: messages[1].content,
      answer: rslt,
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
    }else{

    // Add the new chat to the user's chats array in the database
    await db.collection('users').doc(userId).update({
      chats: Firestore.FieldValue.arrayUnion(newChat),
      freePrompts: currentFreePrompts - 1,
    });

    // Send the response back to the client
    res.json({ message: rslt });
  }
  } catch (error) {
    next(error);
  }
};


exports.getChat = async (req, res, next) => {
  try {
    // Extract user ID from request parameters
    // const userId = req.params.userId;

    const cookie = req.cookies['jwt'];
    const decodedCookie = jwt.verify(cookie, jwt_key);
    const userId = decodedCookie.email;

    // Retrieve chat data for the user from Firestore
    const chatDoc = await db.collection('users').doc(userId).get();

    // Check if the user document exists
    if (!chatDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Extract chat data from the user document
    const chatData = chatDoc.data();

    // Check if chat data exists in the user document
    if (!chatData.chats || chatData.chats.length === 0) {
      return res
        .status(404)
        .json({ message: 'Chat data not found for the user' });
    }

    // Extract and return chat data from the user document
    const chats = chatData.chats;
    return res.json({ chats });
  } catch (error) {
    next(error);
  }
};
