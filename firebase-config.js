const firebaseConfig = {
      apiKey: "AIzaSyBlYJDuljZoTBQOhjZxhLUUyZgVMQTdgRM",
      authDomain: "ecstu-d8897.firebaseapp.com",
      databaseURL: "https://ecstu-d8897-default-rtdb.firebaseio.com",
      projectId: "ecstu-d8897",
      storageBucket: "ecstu-d8897.appspot.com",
      messagingSenderId: "970831836572",
      appId: "1:970831836572:web:8e6ac5e8a0355e3e03c459"
    };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database(); // Using Realtime Database
