const OpenAI = require('openai');
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

const openai = new OpenAI({
  apiKey: apiKey,
});
// Function to start a streamed chat
exports.startChat = async (req, res, next) => {
  try {
    // Extract messages from the request body
    const { messages } = req.body;

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

    const userId = 'syb@gmail.com';
    const newChat = {
      question: messages[1].content,
      answer: rslt,
    };
    // console.log(rslt);

    // Add the new prompt to the existing array of prompts
    await db
      .collection('subscriptions')
      .doc(userId)
      .update({
        chats: Firestore.FieldValue.arrayUnion(newChat),
      });

    // Send the response back to the client
    res.json({ message: rslt });
    // console.log('Session data:', req.user.name);
    console.log(store.session);
  } catch (error) {
    next(error);
  }
};

exports.getChat = async (req, res, next) => {
  try {
    // Extract user ID from request parameters
    // const userId = req.params.userId;
    const userId = 'syb@gmail.com';

    // Retrieve chat data for the user from Firestore
    const chatDoc = await db.collection('subscriptions').doc(userId).get();

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
