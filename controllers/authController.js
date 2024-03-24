const axios = require('axios');
const Firestore = require('@google-cloud/firestore');
const { store } = require('../middlewares/sessionMiddleware');
const session = require('express-session');
const db = new Firestore({
  projectId: 'practice-partner-ab0ef',
  keyFilename:
    './practice-partner-ab0ef-firebase-adminsdk-9ic5b-9a4bf13548.json',
});

const jwt = require('jsonwebtoken');

exports.signup = async (req, res) => {
  try {
    const { email, password, confirmPassword, name } = req.body;

    // Check if required fields are present
    if (!email || !password || !confirmPassword || !name) {
      return res.status(422).json({
        error: 'Unprocessable Entity',
        message: 'Name, email, password, and confirm password are required',
      });
    }

    // Check if password and confirm password match
    if (password !== confirmPassword) {
      return res.status(422).json({
        error: 'Unprocessable Entity',
        message: 'Password and confirm password do not match',
      });
    }

    const firebaseApiUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyA9zvTNuDpOOkwfLgWuIIuWj_HJOF0jz4I`;

    const response = await axios.post(firebaseApiUrl, {
      email,
      password,
      displayName: name,
      returnSecureToken: true,
    });

    const responseData = response.data;
    console.log('Firebase API response:', responseData);

    const userData = {
      name: req.body.name,
      email: req.body.name,
      password: req.body.password,
      ...(req.body.additionalData || {}),
    };

    // Add user document to Firestore, associating it with the newly registered user
    await db.collection('users').doc(req.body.email).set(userData);

    return res.status(201).json(responseData);
  } catch (error) {
    console.error('Error during user registration:', error);

    return res.status(500).json({ error: 'Internal Server Error' });
  }
  // console.log('done');
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if required fields are present
    if (!email || !password) {
      return res.status(422).json({
        error: 'Unprocessable Entity',
        message: 'Email and password are required',
      });
    }

    const firebaseApiUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyA9zvTNuDpOOkwfLgWuIIuWj_HJOF0jz4I`;

    const response = await axios.post(firebaseApiUrl, {
      email,
      password,
      returnSecureToken: true,
    });

    const responseData = response.data;
    console.log('Firebase API response:', responseData);

    // Fetch user data from Firestore based on the email
    const userDoc = await db.collection('users').doc(req.body.email).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure userData is correctly structured with required user data
    const userData = {
      email: responseData.email,
      name: responseData.displayName,
    };
    console.log('User data:', userData);

    // Store user data in session
    req.session.user = userData;
    // console.log('Session data:', req.sessionID);
    // const sessionData = store.sessions[req.sessionID];
    // console.log('Session data:', sessionData)
    store.session = await req.session;
    // console.log(store);
    // console.log(req.session.user.name);
    const token = jwt.sign(userData, 'e04e8fab-c337-48bb-be63-d1c23b891be6', {
      expiresIn: '1h',
    });
    console.log('JWT Token:', token);
    const cookieDomain = 'localhost';

    // Send JWT to client (e.g., set as HTTP-only cookie)
    res.cookie('jwt', token, {
      httpOnly: true,
      maxAge: 60 * 60 * 1000,
      domain: 'localhost',
      secure: false,
    });

    return res.status(200).json({ message: 'Login successful' });
  } catch (error) {
    console.error('Error during user sign-in:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// @desc    Logout User from the
// @route   GET /api/users/logout
exports.logout = async (req, res) => {
  try {
    // Clear user data from the session
    req.session.destroy();

    // Clear the JWT cookie (if present)
    res.clearCookie('jwt', { domain: 'localhost' }); // Assuming same domain for cookies
    console.log('Logged out');
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error during user logout:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// verify email
exports.verifyEmail = (req, res) => {
  firebase
    .auth()
    .currentUser.sendEmailVerification()
    .then(function () {
      return res.status(200).json({ status: 'Email Verification Sent!' });
    })
    .catch(function (error) {
      let errorCode = error.code;
      let errorMessage = error.message;
      if (errorCode === 'auth/too-many-requests') {
        return res.status(500).json({ error: errorMessage });
      }
    });
};

// forget password
exports.forgetPassword = (req, res) => {
  if (!req.body.email) {
    return res.status(422).json({ email: 'email is required' });
  }
  firebase
    .auth()
    .sendPasswordResetEmail(req.body.email)
    .then(function () {
      return res.status(200).json({ status: 'Password Reset Email Sent' });
    })
    .catch(function (error) {
      let errorCode = error.code;
      let errorMessage = error.message;
      if (errorCode == 'auth/invalid-email') {
        return res.status(500).json({ error: errorMessage });
      } else if (errorCode == 'auth/user-not-found') {
        return res.status(500).json({ error: errorMessage });
      }
    });
};
