const http = require('http');

http.get('http://127.0.0.1:8080/rest/v1/profiles?id=eq.a0000000-0000-0000-0000-000000000002&select=*,houses(id,name,points)', {
  headers: {
    'apikey': 'local-institutional-anon-key'
  }
}, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('HTTP', res.statusCode, body));
}).on('error', err => console.error(err));
