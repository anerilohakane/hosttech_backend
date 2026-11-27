async function testVercel() {
  try {
    const res = await fetch('https://pgappbackend.vercel.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'vendor@hosttech.com',
        password: 'Vendor@HostTech2026',
      }),
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Data:', data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testVercel();
