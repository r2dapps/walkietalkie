const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Trigger Cloud Function when a new Squad Invite is written to Firebase RTDB (/invites/{targetCallsign}/{inviteId}).
 * Sends a Web Push payload via Firebase Cloud Messaging (FCM) to wake up dead/closed browser apps on Android/iOS.
 */
exports.sendPushNotificationOnInvite = functions.database
  .ref('/invites/{targetCallsign}/{inviteId}')
  .onCreate(async (snapshot, context) => {
    const targetCallsign = context.params.targetCallsign;
    const inviteData = snapshot.val();

    if (!inviteData || !inviteData.fromCallsign || !inviteData.room) {
      console.log('Invalid invite data, skipping push notification.');
      return null;
    }

    const fromCallsign = inviteData.fromCallsign;
    const room = inviteData.room;
    const key = inviteData.key || '';

    console.log(`[FCM Push] Processing push invite from ${fromCallsign} -> ${targetCallsign} for room #${room}`);

    // Lookup FCM Web Push token for target callsign
    const tokenSnapshot = await admin.database().ref(`/pushTokens/${targetCallsign}`).once('value');
    const fcmToken = tokenSnapshot.val();

    if (!fcmToken) {
      console.log(`No FCM push token registered for callsign: ${targetCallsign}`);
      return null;
    }

    const targetUrl = `https://r2dapps.github.io/walkietalkie/#room=${encodeURIComponent(room)}${key ? '&key=' + encodeURIComponent(key) : ''}`;

    const payload = {
      token: fcmToken,
      notification: {
        title: `📡 Radio Call from ${fromCallsign}`,
        body: `Tap to join channel #${room} now on AetherTalk`
      },
      data: {
        url: targetUrl,
        room: room,
        fromCallsign: fromCallsign
      },
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          title: `📡 Radio Call from ${fromCallsign}`,
          body: `Tap to join channel #${room} now on AetherTalk`,
          icon: 'https://r2dapps.github.io/walkietalkie/assets/icon.svg',
          badge: 'https://r2dapps.github.io/walkietalkie/assets/icon.svg',
          vibrate: [200, 100, 200, 100, 200],
          tag: `invite-${room}`,
          renotify: true
        },
        fcmOptions: {
          link: targetUrl
        }
      }
    };

    try {
      const response = await admin.messaging().send(payload);
      console.log(`[FCM Push] Push notification successfully sent to ${targetCallsign}:`, response);
      return response;
    } catch (error) {
      console.error(`[FCM Push] Error sending push notification to ${targetCallsign}:`, error);
      if (error.code === 'messaging/registration-token-not-registered') {
        // Token expired or invalid, remove from RTDB
        await admin.database().ref(`/pushTokens/${targetCallsign}`).remove();
      }
      return null;
    }
  });
