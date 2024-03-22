const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
// const firebaseConfig = require('../config/firebase');
const Firestore = require('@google-cloud/firestore');
const errorMiddleware = require('../middlewares/errorMiddleware');
const stripe = require("stripe")('/*stripe_key*/');
const app = express();

const db = new Firestore({
  projectId: 'practice-partner-ab0ef',
  keyFilename: './practice-partner-ab0ef-firebase-adminsdk-9ic5b-9a4bf13548.json',
});


//dummy data add & read from firestore
app.get('/', async (req, res) => {
  try {

//     const docRef = db.collection('users').doc('alovelace');

// await docRef.set({
//   first: 'Ada',
//   last: 'Lovelace',
//   born: 1815
// });

// const snapshot = await db.collection('subscriptions').get();
    const snapshot = await db.collection('users').get();
    const users = [];
    snapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        data: doc.data()
      });
    });
    res.json(users); // Send the data as JSON response
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' }); // Send an error response
  }
});

// Routes
const authRoutes = require('../routes/authRoutes');
const imageRoutes = require('../routes/imageRoutes');
const chatRoutes = require('../routes/chatRoutes');

// Middlewares
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://practicepartner.ai');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

const corsOptions = {
  origin: ['http://localhost:3001', 'https://practicepartner.kaizenapps.com', 'https://practicepartner.ai', 'https://married-dolls-cashiers-puts.trycloudflare.com'], // Allow requests from this origin
  methods: 'GET,POST', // Allow only GET and POST requests
  allowedHeaders: 'Content-Type,Authorization', // Allow only these headers
};

app.use(cors(corsOptions));

// Routes
app.use('/api', authRoutes);
app.use('/api', imageRoutes);
app.use('/api', chatRoutes);

// PORT
const port = 3000;

app.post("/create-stripe-session-subscription", async (req, res) => {
  const userEmail = req.body.mail; // Replace with actual user email
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
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      // Customer already has an active subscription, send them to biiling portal to manage subscription

      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: "http://localhost:3001/",
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
  }

  //   console.log(customer);
  const prices = await stripe.prices.list({
    lookup_keys: [req.body.lookup_key],
    expand: ['data.product'],
  });
  // Now create the Stripe checkout session with the customer ID
  const session = await stripe.checkout.sessions.create({
    success_url: "http://localhost:3001/",
    cancel_url: "http://localhost:3001/plan",
    // payment_method_types: ["card"],
    mode: "subscription",
    billing_address_collection: "auto",
    line_items: [
      {
        // price_data: {
        //   currency: "usd",
        //   product_data: {
        //     name: "Quarterly Subscription",
        //     description: "Unlimited!",
        //   },
        //   unit_amount: 1,
        //   recurring: {
        //     interval: "month",
        //   },
        // },
        price:prices.data[0].id,
        quantity: 1,
      },
    ],
    metadata: {
      userId: auth0UserId,
    },
    // customer_email: "hello@tricksumo.com",
    customer: customer.id, // Use the customer ID here
  });

  res.json({ id: session.id });
});

// Order fulfilment route
// =====================================================================================
// =====================================================================================
// =====================================================================================

// webhook for subscription
app.post("/webhook", async (req, res) => {
  const subscriptionsRef = await db.collection('subscriptions').get();

  const payload = req.body;
  const payloadString = JSON.stringify(payload, null, 2);
  const sig = req.headers["stripe-signature"];
  let event;
  const secret= "/*webhook_key*/";
  const header = stripe.webhooks.generateTestHeaderString({
    payload: payloadString,
    secret,
  });

  try {
    event = stripe.webhooks.constructEvent(payloadString, header,secret );
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object;

    // On payment successful, get subscription and customer details
    const subscription = await stripe.subscriptions.retrieve(
      event.data.object.subscription
    );
    const customer = await stripe.customers.retrieve(
      event.data.object.customer
    );

    if (invoice.billing_reason === "subscription_create") {
      // Handle the first successful payment
      const subscriptionDocument = {
        userId: customer?.metadata?.userId,
        subId: event.data.object.subscription,
        endDate: new Date(subscription.current_period_end * 1000),
      };

      try {
        const docRef = db.collection('subscriptions').doc('alovelace');
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
      invoice.billing_reason === "subscription_cycle" ||
      invoice.billing_reason === "subscription_update"
    ) {
      // Handle recurring subscription payments
      const filter = { userId: customer?.metadata?.userId };
      const updateDoc = {
        endDate: new Date(subscription.current_period_end * 1000),
        recurringSuccessful_test: true,
      };
      const updateRef = await db.collection('subscriptions');
      const querySnapshot = await updateRef.where('userId', '==', customer?.metadata?.userId).get();
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

  if (event.type === "customer.subscription.updated") {
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

process.on("SIGINT", () => {
  client.close().then(() => {
    console.log("MongoDB disconnected on app termination");
    process.exit(0);
  });
});

// Starting a server
app.listen(port, () => {
  console.log(`app is running at ${port}`);
});

//
