const http = require('http');

const data = JSON.stringify({
  email: 'teacher@brainz.edu',
  password: 'Password123!'
});

const req = http.request({
  hostname: '127.0.0.1',
  port: 8080,
  path: '/auth/v1/token?grant_type=password',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    'apikey': 'local-institutional-anon-key'
  }
}, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('HTTP', res.statusCode, body));
});

req.on('error', err => console.error('Req error:', err));
req.write(data);
req.end();
