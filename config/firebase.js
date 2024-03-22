const firebase = require('firebase/app');
require('firebase/auth');
require('firebase/firestore');

firebaseConfig = {
  apiKey: 'AIzaSyA9zvTNuDpOOkwfLgWuIIuWj_HJOF0jz4I',
  authDomain: 'practice-partner-ab0ef.firebaseapp.com',
  projectId: 'practice-partner-ab0ef',
  storageBucket: 'practice-partner-ab0ef.appspot.com',
  messagingSenderId: '702693034779',
  appId: '1:702693034779:web:4621980ae26b0c0c1761be',
  measurementId: 'G-9L323818DZ',
};
firebase.initializeApp(firebaseConfig);
// const firestore = firebase.firestore();

module.exports = firebase;
