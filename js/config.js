// This app's own Firebase project (ultrasound-ebd93), kept apart from the
// Planner app's. firestore.rules decides who may read and write the data.
// These values aren't secret: they only say which project to talk to.
//
// Set it to null to keep everything on each device only.
export const firebaseConfig = {
  apiKey: 'AIzaSyDVDAUFdJzlx9btlgCoWHg5gzWqGlDJo7Q',
  authDomain: 'ultrasound-ebd93.firebaseapp.com',
  projectId: 'ultrasound-ebd93',
  storageBucket: 'ultrasound-ebd93.firebasestorage.app',
  messagingSenderId: '850787619252',
  appId: '1:850787619252:web:36ad2ae583a22efdc1e2e1',
};
