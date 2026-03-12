const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head><title>Test Server</title></head>
      <body>
        <h1 style="color: green;">✅ SERVER IS WORKING!</h1>
        <p>If you can see this, Node.js and the server are functioning.</p>
        <p>URL: http://localhost:5173</p>
      </body>
    </html>
  `);
});

server.listen(5173, () => {
  console.log('\n✅ Test server started successfully!');
  console.log('Open your browser to: http://localhost:5173');
  console.log('Press Ctrl+C to stop\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('❌ Port 5173 is already in use');
    console.log('Run this to kill it: lsof -ti:5173 | xargs kill -9');
  } else {
    console.error('❌ Server error:', err.message);
  }
});
