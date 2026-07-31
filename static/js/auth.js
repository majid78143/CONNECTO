// CONNECTO — Auth JS
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  try {
    const token = await user.getIdToken();
    await fetch('/auth/session', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ idToken: token })
    });
  } catch(e) {}
});

async function logout() {
  await fetch('/auth/logout', { method: 'POST' });
  await auth.signOut();
  window.location.href = '/';
}
