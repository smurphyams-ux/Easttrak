const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>DumpsterTracker</title>
        <style>
          body { 
            font-family: system-ui; 
            padding: 40px; 
            max-width: 800px; 
            margin: 0 auto; 
          }
          h1 { color: #22c55e; }
          .box { 
            background: #f3f4f6; 
            padding: 20px; 
            border-radius: 8px; 
            margin-top: 20px; 
          }
        </style>
      </head>
      <body>
        <h1>✅ Server is Working!</h1>
        <p>This is a basic Node.js HTTP server running on port 3000.</p>
        <div class="box">
          <h2>What this means:</h2>
          <ul>
            <li>✅ Node.js is installed and working</li>
            <li>✅ Port 3000 is accessible</li>
            <li>✅ Your browser can connect to localhost</li>
          </ul>
          <p><strong>Now try running:</strong> npm run dev</p>
        </div>
      </body>
    </html>
  `);
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Server running at http://localhost:${PORT}`);
  console.log(`   Also try: http://127.0.0.1:${PORT}`);
  console.log(`\n   Press Ctrl+C to stop\n`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.log(`\nPort ${PORT} is in use. Trying port ${PORT + 1}...`);
    server.listen(PORT + 1);
  }
});
