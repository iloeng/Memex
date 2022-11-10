import firebase from 'firebase/app'

const firebaseConfig = {
    apiKey: process.env.FIREBASE_MEMEX_API_KEY,
    authDomain: process.env.FIREBASE_MEMEX_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_MEMEX_DATABSE_URL,
    projectId: process.env.FIREBASE_MEMEX_PROJECT_ID,
    messagingSenderId: process.env.FIREBASE_MEMEX_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_MEMEX_APP_ID,
    measurementId: process.env.FIREBASE_MEMEX_MEASUREMENT_ID,
    storageBucket: process.env.FIREBASE_MEMEX_STORAGE_BUCKET,
}

export const getFirebase = () => {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig)

        firebase
            .firestore()
            .settings({ cacheSizeBytes: 1000000 * 10, merge: true })
        firebase
            .firestore()
            .enablePersistence({ synchronizeTabs: true })
            .catch((error) => {
                console.warn(
                    'Could not enable Firestore offline persistence. Reason: ',
                    error.code,
                    error,
                )
            })
    }

    return firebase
}
