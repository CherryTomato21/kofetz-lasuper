import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCzll7MMH1xzorqaPoL9ehkd02zB5skq0I",
  authDomain: "kofetz-lasuper.firebaseapp.com",
  projectId: "kofetz-lasuper",
  storageBucket: "kofetz-lasuper.firebasestorage.app",
  messagingSenderId: "639661103858",
  appId: "1:639661103858:web:527add1b63a4f15fcd4e6b"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
