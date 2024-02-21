const axios = require('axios');

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

    return res.status(201).json(responseData);
  } catch (error) {
    console.error('Error during user registration:', error);

    return res.status(500).json({ error: 'Internal Server Error' });
  }
  // console.log('done');
};

// login
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

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error during user sign-in:', error);

    let errorMessage = 'Internal Server Error';
    if (error.response && error.response.data && error.response.data.error) {
      errorMessage = error.response.data.error.message;
    }

    return res.status(500).json({ error: errorMessage });
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
