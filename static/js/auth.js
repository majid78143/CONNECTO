// CONNECTO — Auth JS
// NOTE: Session sync is handled in firebase-config.js — no duplicate handler here

async function logout() {
  await fetch('/auth/logout', { method: 'POST' });
  await auth.signOut();
  window.location.href = '/';
}
