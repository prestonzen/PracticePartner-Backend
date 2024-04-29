const axios = require("axios");
const Firestore = require("@google-cloud/firestore");
const session = require("express-session");
const nodemailer = require("nodemailer");

const projectId = process.env.GOOGLE_PROJECT_ID;
const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const key = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");
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
const stripe = require("stripe")(
  "sk_test_51OwpTS01Mx8CmgRTDrqwtjvL6AM18K1Pp2MYILW2d7P9Ebf3mMl9AdCFiDwoTEAx5NEqGJZhdHCtg9ayWTS8hN3l00tSitWqde"
);

const jwt = require("jsonwebtoken");
// const cookieDomain = '.practice-partner-frontend-xi.vercel.app';


exports.signup = async (req, res) => {
  try {
    const { email, password, confirmPassword, name } = req.body;

    const userData = {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      isFree: true,
      freePrompts: 10,
      ...(req.body.additionalData || {}),
      emailVerified: false, // Adding email verification status
    };

    // Add user document to Firestore, associating it with the newly registered user
    await db.collection("users").doc(req.body.email).set(userData);

    return res.status(201).json(userData);
  } catch (error) {
    console.error("Error during user registration:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    // Extract parameters from the request's query string
    const { email, name, password } = req.query;
    const firebaseApiUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyA9zvTNuDpOOkwfLgWuIIuWj_HJOF0jz4I`;

    const response = await axios.post(firebaseApiUrl, {
      email,
      password,
      displayName: name,
      returnSecureToken: true,
    });

    const responseData = response.data;
    console.log("Firebase API response:", responseData);
    const userData = {
      name,
      email,
      password,
      isFree: true,
      freePrompts: 10,
    };
    // Add user document to Firestore, associating it with the newly registered user
    await db.collection("users").doc(email).set(userData);
    console.log("Done");
    return res.status(200).json(responseData);
  } catch (error) {
    // console.error('Error during email verification:', error);
    // return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if required fields are present
    if (!email || !password) {
      return res.status(422).json({
        error: "Unprocessable Entity",
        message: "Email and password are required",
      });
    }

    const userDoc = await db.collection("users").doc(req.body.email).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const firebaseApiUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyA9zvTNuDpOOkwfLgWuIIuWj_HJOF0jz4I`;

    const response = await axios.post(firebaseApiUrl, {
      email,
      password,
      returnSecureToken: true,
    });

    const responseData = response.data;
    console.log("Firebase API response:", responseData);

    let isAdmin = false;
    // console.log(response.data.email);
    if (response.data.email === process.env.ADMIN_EMAIL) {
      isAdmin = true;
      console.log(isAdmin);
    }
    // Ensure userData is correctly structured with required user data
    const userData = {
      email: responseData.email,
      name: responseData.displayName,
      isAdmin: isAdmin,
    };
    // console.log("User data:", userData);

    const token = jwt.sign(userData, process.env.JWT_KEY, { expiresIn: "1h" });
    console.log("JWT Token:", token);

    const loggedinUserData = userDoc.data();
    let isSubscribed=false;
    if (loggedinUserData.freePrompts > 0) {
      isSubscribed = true;
    } else {
      const stripeCustomerId = loggedinUserData.stripeCustomerId;

      if (stripeCustomerId) {
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: "active",
        });
        // console.log(subscriptions);

        if (subscriptions.data.length > 0) {
          // console.log("accessed");
          isSubscribed = true;
        }
        // console.log(isSubscribed);
      }
    }

    // Send JWT to client (e.g., set as HTTP-only cookie)
    res.cookie("jwt", token, {
      httpOnly: true,
      maxAge: 60 * 60 * 1000,
      // domain: cookieDomain,
      secure: true,
      sameSite: "none",
    });

    return res
      .status(200)
      .json({ isAdmin: isAdmin, email: responseData.email, isSubscribed: isSubscribed });
  } catch (error) {
    const userDoc = await db.collection("users").doc(req.body.email).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();

    // Check if the provided password matches the one stored in the database
    if (userData.password !== req.body.password) {
      return res
        .status(401)
        .json({ error: "Unauthorized", message: "Incorrect password" });
    }

    console.error("Error during user sign-in:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.logout = async (req, res) => {
  try {
    // Clear the JWT cookie (if present)
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    console.log("Logged out");
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error during user logout:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// forget password
exports.forgetPassword = (req, res) => {
  if (!req.body.email) {
    return res.status(422).json({ email: "email is required" });
  }
  firebase
    .auth()
    .sendPasswordResetEmail(req.body.email)
    .then(function () {
      return res.status(200).json({ status: "Password Reset Email Sent" });
    })
    .catch(function (error) {
      let errorCode = error.code;
      let errorMessage = error.message;
      if (errorCode == "auth/invalid-email") {
        return res.status(500).json({ error: errorMessage });
      } else if (errorCode == "auth/user-not-found") {
        return res.status(500).json({ error: errorMessage });
      }
    });
};

exports.authenticate = (req, res) => {
  try {
    const token = req.cookies && req.cookies["jwt"];
    let isSubscribed = false;
    if (token) {
      jwt.verify(token, process.env.JWT_KEY, async (err, decodedToken) => {
        if (err) {
          console.log(err.message);
          res.status(401).json({ error: "Unauthorized" });
        } else {
          console.log(decodedToken);
          const userEmail = decodedToken.email;
          const isAdmin = decodedToken.isAdmin;

          try {
            const userDoc = await db.collection("users").doc(userEmail).get();

            if (!userDoc.exists) {
              res.status(404).json({ error: "User not found" });
              return;
            }

            const userData = userDoc.data();

            if (userData.freePrompts > 0) {
              isSubscribed = true;
            } else {
              const stripeCustomerId = userData.stripeCustomerId;

              if (stripeCustomerId) {
                const subscriptions = await stripe.subscriptions.list({
                  customer: stripeCustomerId,
                  status: "active",
                });
                // console.log(subscriptions);

                if (subscriptions.data.length > 0) {
                  // console.log("accessed");
                  isSubscribed = true;
                }
                // console.log(isSubscribed);
              }
            }
            const data = {
              email: userEmail,
              isSubscribed: isSubscribed,
              isAdmin: isAdmin,
            };

            res.status(200).json(data);
          } catch (error) {
            console.error("Error fetching user data:", error);
            res.status(500).json({ error: "Internal Server Error" });
          }
        }
      });
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  } catch (error) {
    console.error("Error during user authentication:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.checkAndStoreUser = async (req, res) => {
  try {
    const userData = req.body;

    const userDoc = await db.collection("users").doc(userData.email).get();

    if (!userDoc.exists) {
      await db.collection("users").doc(userData.email).set(userData);
      // Continue with token generation and response
    }

    let isAdmin = false;
    if (userData.email === process.env.ADMIN_EMAIL) {
      isAdmin = true;
    }

    const userDataG = {
      email: userData.email,
      name: userData.name,
      isAdmin: isAdmin,
      isFree: true,
      freePrompts: 10,
    };

    const token = jwt.sign(userDataG, process.env.JWT_KEY, {
      expiresIn: "1h",
    });
    console.log("JWT Token:", token);

    res.cookie("jwt", token, {
      httpOnly: true,
      maxAge: 60 * 60 * 1000,
      domain: cookieDomain,
      secure: false,
    });

    return res.status(200).json({ isAdmin: isAdmin });
  } catch (error) {
    res.status(500).send({ error: "Internal server error" });
  }
};

exports.testing = async (req, res) => {
  console.log("working");
  res.send({ msg: "working" });
};
