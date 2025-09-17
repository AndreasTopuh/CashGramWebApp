const fetch = require('node-fetch');

async function testRegistration() {
  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: '085717797065',
        password: '12345',
        name: 'Test User'
      })
    });

    const data = await response.json();
    console.log('Registration Response:', data);
    
    if (response.ok) {
      console.log('Registration successful!');
    } else {
      console.log('Registration failed:', data.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testRegistration();