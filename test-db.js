import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBfA6yahUAthL8rgz5knL_1FOHmJecOhFk",
  authDomain: "dashboard-wann.firebaseapp.com",
  projectId: "dashboard-wann",
  storageBucket: "dashboard-wann.firebasestorage.app",
  messagingSenderId: "146127231720",
  appId: "1:146127231720:web:7e9a95f2514d626dd5075d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  const users = await getDocs(collection(db, 'users'));
  users.forEach(u => {
    console.log(u.id, u.data());
  });
  process.exit(0);
}
test();
