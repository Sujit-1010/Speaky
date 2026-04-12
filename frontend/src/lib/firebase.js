import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyCxUTfUhpMfyadunt94VR6A10wVeWYfbOs",
    authDomain: "speakup-fafe8.firebaseapp.com",
    projectId: "speakup-fafe8",
    storageBucket: "speakup-fafe8.firebasestorage.app",
    messagingSenderId: "451745252894",
    appId: "1:451745252894:web:7e818c42c801dfa106100f",
    measurementId: "G-KH779RHXWE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function signInWithGooglePopup() {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken(true);
    return { idToken, user: result.user };
}

export { app, auth, signInWithGooglePopup };
