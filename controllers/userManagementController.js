const Firestore = require("@google-cloud/firestore");

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


exports.getUsers = async (req, res, next) => {
  try {
    const snapshot = await db.collection('users').get();

    if (snapshot.empty) {
      return res.json({ users:[], activeUsers: 0, inactiveUsers: 0 });
    }

    const users = [];
    let activeUsers = 0;
    let inactiveUsers = 0;

    snapshot.forEach((doc) => {
      const userData = doc.data();

      // Assuming there is a field in the user document indicating their subscription status
      // const isActiveUser = userData.active === true;
      // var start = new Date(1970, 0, 1);
      // var end = new Date(1970, 0, 1);
      // start.setSeconds(userData.startDate);
      // end.setSeconds(userData.endDate);
      let startDate, endDate;
      if(userData.startDate){
      const startDateSeconds = userData.startDate._seconds;
      const endDateSeconds = userData.endDate._seconds;
      startDate = new Date(startDateSeconds * 1000);
      endDate = new Date(endDateSeconds * 1000);
      startDate = startDate.toISOString().split('T')[0];
      endDate = endDate.toISOString().split('T')[0];
      }
      users.push({
        mail: userData.email,
        startDate: userData.startDate ? startDate : "", // Adjust as needed
        expirationDate: userData.startDate ? endDate : "", // Adjust as needed
        subscriptionTerm: userData.startDate ? userData.subscriptionTerm : "", // Adjust as needed
        paymentStatus: userData.startDate ? userData.paymentStatus : "", // Adjust as needed
      });

      // Count active and inactive users
      // if (isActiveUser) {
        activeUsers++;
      // } else {
      //   inactiveUsers++;
      // }
    });

    res.json({ users, activeUsers, inactiveUsers }); // Send the data as JSON response
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' }); // Send an error response
  }
};


exports.subscribeEmail = async (req, res) => {
    const { email } = req.body;

    // Basic validation
    if (!email) {
        return res.status(400).json({ error: 'Invalid email address' });
    }

    // Check if email is already subscribed
    const subscriberRef = db.collection('newsletterSubscribers').doc(email);
    const subscriberDoc = await subscriberRef.get();

    if (subscriberDoc.exists) {
        return res.status(400).json({ error: 'Email address already subscribed' });
    }

    // Add email to subscribers collection in Firestore
    await subscriberRef.set({ email });

    // Send response
    res.status(200).json({ message: 'Successfully subscribed to newsletter' });
};