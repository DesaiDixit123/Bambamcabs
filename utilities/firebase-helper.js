const admin = require('firebase-admin');
const serverAccount = require('../bambamcabs.json');
admin.initializeApp({
    credential: admin.credential.cert(serverAccount)
});
const db = admin.firestore();
async function sendNotification(token, payload) {
    admin.messaging().send(payload).then( response => {
        console.log('Sucessfully sent to ' + token);
    }).catch(err => console.log(err));
};
module.exports = { admin , sendNotification };