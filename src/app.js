const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const { sessionMiddleware } = require('../middlewares/sessionMiddleware');
// const firebaseConfig = require('../config/firebase');
const Firestore = require('@google-cloud/firestore');
const errorMiddleware = require('../middlewares/errorMiddleware');
const stripe = require('stripe')(
  'sk_test_51OwpTS01Mx8CmgRTDrqwtjvL6AM18K1Pp2MYILW2d7P9Ebf3mMl9AdCFiDwoTEAx5NEqGJZhdHCtg9ayWTS8hN3l00tSitWqde'
);
const session = require('express-session');
const store = new session.MemoryStore();
const app = express();
const cookieParser = require('cookie-parser');
// Routes
const authRoutes = require('../routes/authRoutes');
const imageRoutes = require('../routes/imageRoutes');
const chatRoutes = require('../routes/chatRoutes');
const userManagementRoutes = require('../routes/userManagementRoutes');
const authMiddleware = require('../middlewares/sessionMiddleware');

const FRONTEND_URL='https://practice-partner-frontend-xi.vercel.app'
// app.use(
//   session({
//     secret: 'e04e8fab-c337-48bb-be63-d1c23b891be6', // Replace with your actual session secret
//     resave: false,
//     saveUninitialized: false,
//     store: store,
//   })
// );
// app.use(authMiddleware);
app.use(cookieParser());
// app.use((req, res, next) => {
//   console.log(store);
// });
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
const db = new Firestore({
  projectId: 'practice-partner-ab0ef',
  keyFilename:
    './practice-partner-ab0ef-firebase-adminsdk-9ic5b-9a4bf13548.json',
});

// Middlewares
app.use(bodyParser.json());

// app.use((req, res, next) => {
//   res.setHeader('Access-Control-Allow-Origin',
//   '*',
//   //  'https://practicepartner.ai'
//   // 'https://practice-partner-frontend-xi.vercel.app'
// );
//   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//   next();
// });

const corsOptions = {
  credentials: true,
  origin: FRONTEND_URL, // Allow requests from this origin
  methods: ['GET,POST'], // Allow only GET and POST requests
  allowedHeaders: 'Content-Type,Authorization', // Allow only these headers
};

app.use(cors(corsOptions));

// Routes
app.use('/api', authRoutes);
app.use('/api', imageRoutes);
app.use('/api', chatRoutes);
app.use('/api', userManagementRoutes);

// PORT
const port = 3000;

app.post('/create-stripe-session-subscription', async (req, res) => {
  const userEmail = req.body.email; // Replace with actual user email
  console.log(userEmail);
  let customer;
  const auth0UserId = userEmail;

  // Try to retrieve an existing customer by email
  const existingCustomers = await stripe.customers.list({
    email: userEmail,
    limit: 1,
  });

  //   console.log(existingCustomers);

  if (existingCustomers.data.length > 0) {
    // Customer already exists
    customer = existingCustomers.data[0];

    // Check if the customer already has an active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      // Customer already has an active subscription, send them to biiling portal to manage subscription

      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: FRONTEND_URL,
      });
      return res.status(409).json({ redirectUrl: stripeSession.url });
    }
  } else {
    // No customer found, create a new one
    customer = await stripe.customers.create({
      email: userEmail,
      metadata: {
        userId: auth0UserId, // Replace with actual Auth0 user ID
      },
    });

    console.log('Created Customer:', customer);

    await db.collection('users').doc(userEmail).set(
      {
        stripeCustomerId: customer.id,
        // Other user data if needed
      },
      { merge: true }
    );
  }

  //   console.log(customer);
  const prices = await stripe.prices.list({
    lookup_keys: [req.body.lookup_key],
    expand: ['data.product'],
  });
  // Now create the Stripe checkout session with the customer ID
  const session = await stripe.checkout.sessions.create({
    success_url: FRONTEND_URL,
    cancel_url: `${FRONTEND_URL}/plan`,
    // payment_method_types: ["card"],
    mode: 'subscription',
    billing_address_collection: 'auto',
    line_items: [
      {
        price: prices.data[0].id,
        quantity: 1,
      },
    ],
    metadata: {
      userId: auth0UserId,
    },
    // customer_email: userEmail,
    customer: customer.id, // Use the customer ID here
  });

  res.json({ id: session.id });
});

app.post('/webhook', async (req, res) => {
  console.log('webhooooook');
  const payload = req.body;
  const payloadString = JSON.stringify(payload, null, 2);
  const sig = req.headers['stripe-signature'];
  let event;
  const secret =
    'whsec_5be2d538e7f87b06c7cf4a89bda684903e06b0a5039ce3955da0da97abe8b124';
  const header = stripe.webhooks.generateTestHeaderString({
    payload: payloadString,
    secret,
  });

  try {
    event = stripe.webhooks.constructEvent(payloadString, header, secret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object;

    // On payment successful, get subscription and customer details
    const subscription = await stripe.subscriptions.retrieve(
      event.data.object.subscription
    );
    const customer = await stripe.customers.retrieve(
      event.data.object.customer
    );

    if (invoice.billing_reason === 'subscription_create') {
      // Handle the first successful payment
      const subscriptionDocument = {
        userId: customer?.metadata?.userId,
        subId: event.data.object.subscription,
        endDate: new Date(subscription.current_period_end * 1000),
      };

      try {
        const userEmail = event.data.object.customer_email;
        console.log(userEmail);
        const docRef = db.collection('users').doc(userEmail);
        // 4242 4242 4242 4242
        await docRef.set(subscriptionDocument);
        console.log(`A document was added to Firestore`);
      } catch (error) {
        console.error('Error adding document: ', error);
        return res.status(500).send('Error adding document to Firestore');
      }

      console.log(
        `First subscription payment successful for Invoice ID: ${customer.email} ${customer?.metadata?.userId}`
      );
    } else if (
      invoice.billing_reason === 'subscription_cycle' ||
      invoice.billing_reason === 'subscription_update'
    ) {
      // Handle recurring subscription payments
      const filter = { userId: customer?.metadata?.userId };
      const updateDoc = {
        endDate: new Date(subscription.current_period_end * 1000),
        recurringSuccessful_test: true,
      };
      const updateRef = await db.collection('users');
      const querySnapshot = await updateRef
        .where('userId', '==', customer?.metadata?.userId)
        .get();
      querySnapshot.forEach(async (doc) => {
        try {
          await doc.ref.update(updateDoc);
          console.log(`Document updated: ${doc.id}`);
        } catch (error) {
          console.error(`Error updating document ${doc.id}: ${error}`);
        }
      });

      // try {

      //   await subscriptionsRef
      //     .where('userId', '==', customer?.metadata?.userId)
      //     .update(updateDoc);
      //   console.log(`Successfully updated the document in Firestore`);
      // } catch (error) {
      //   console.error('Error updating document: ', error);
      //   return res.status(500).send('Error updating document in Firestore');
      // }

      console.log(
        `Recurring subscription payment successful for Invoice ID: ${invoice.id}`
      );
    }

    console.log(
      new Date(subscription.current_period_end * 1000),
      subscription.status,
      invoice.billing_reason
    );
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    if (subscription.cancel_at_period_end) {
      console.log(`Subscription ${subscription.id} was canceled.`);
      // Handle canceled subscription
    } else {
      console.log(`Subscription ${subscription.id} was restarted.`);
      // Handle restarted subscription
    }
  }

  res.status(200).end();
});

// app.listen(3001, () => {
//   console.log("Server is running on port 3001");
// });

// Starting a server
app.listen(port, () => {
  console.log(`app is running at ${port}`);
});

//
