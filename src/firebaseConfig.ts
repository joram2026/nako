export interface FirebaseAppletConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
}

export const firebaseConfig: FirebaseAppletConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || "paylon-766c0",
  appId: process.env.FIREBASE_APP_ID || "1:833184728081:web:4c255e06ad429fa940ddb0",
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCMYK5YYczaMxFx8EutLD4HNXVO2nu6Jn4",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "paylon-766c0.firebaseapp.com",
  firestoreDatabaseId: process.env.FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-longpay-2d2973a8-89cc-4824-992f-b98cf1352817",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "paylon-766c0.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "833184728081",
  measurementId: "",
  oAuthClientId: "833184728081-g809upj19eb2lq71uermcqfh16jvgqme.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

export default firebaseConfig;
