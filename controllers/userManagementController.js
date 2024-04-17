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
exports.getUsers = async (req, res, next) => {
    try {
      const snapshot = await db.collection('subscriptions').get();
    // const snapshot = await db.collection('users').get();
    const users = [];
    snapshot.forEach((doc) => {
        const endDateTimestamp = doc.data().endDate;
  const endDate = endDateTimestamp.toDate();

      users.push({
        mail: doc.id,
        startDate: "1",
        expirationDate: endDate,
        subscriptionTerm: "Q",
        paymentStatus: "2"
      });
    });
    const activeUsers=3;
    const inactiveUsers=1;
    res.json({ users, activeUsers, inactiveUsers }); // Send the data as JSON response
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' }); // Send an error response
  }
     
  };