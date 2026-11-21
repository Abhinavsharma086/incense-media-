const https = require('https');

https.get('https://admin.incensemedia.in/', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const m = data.match(/assets\/index-[^"]+\.js/g);
    console.log('Live bundle on admin.incensemedia.in:', m);
  });
}).on('error', err => console.error(err));
