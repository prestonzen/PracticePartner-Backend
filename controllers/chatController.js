const OpenAI = require('openai');

// Provide your OpenAI API key here
const apiKey = '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';

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
      model: 'gpt-4-turbo-preview',
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

    // Send the response back to the client
    res.json({ message: responseContent });
  } catch (error) {
    next(error);
  }
};
