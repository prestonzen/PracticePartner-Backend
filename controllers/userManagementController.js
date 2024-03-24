const Firestore = require("@google-cloud/firestore");

const db = new Firestore({
  projectId: "practice-partner-ab0ef",
  keyFilename:
    "./practice-partner-ab0ef-firebase-adminsdk-9ic5b-9a4bf13548.json",
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