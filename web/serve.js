const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const server = http.createServer((req, res) => {
    let filePath = './public' + (req.url === '/' ? '/index.html' : req.url);
    const extname = path.extname(filePath);
    
    const contentTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
    };
    
    const contentType = contentTypes[extname] || 'text/plain';
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ Server running!`);
    console.log(`   Open: http://localhost:${PORT}`);
    console.log(`   Press Ctrl+C to stop\n`);
});
