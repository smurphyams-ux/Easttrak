const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Server Works!</h1>');
});

server.listen(5173, '0.0.0.0', () => {
  console.log('✅ Server running at:');
  console.log('   http://localhost:5173');
  console.log('   http://127.0.0.1:5173');
  console.log('\nPress Ctrl+C to stop');
});

server.on('error', (err) => {
  console.error('❌ Error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.log('\nPort 5173 is in use. Kill it with:');
    console.log('lsof -ti:5173 | xargs kill -9');
  }
});
