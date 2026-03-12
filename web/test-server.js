import http from 'http';


const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head><title>Test Server</title></head>
      <body>
        <h1>✅ Server is working!</h1>
        <p>If you can see this, Node.js is working correctly.</p>
        <p>Now try running: npm run dev</p>
      </body>
    </html>
  `);
});

const PORT = 5173;
server.listen(PORT, () => {
  console.log(`✓ Test server running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
});
