#!/usr/bin/env python3
import http.server
import socketserver
import webbrowser
import os
from threading import Timer

PORT = 8080

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

def open_browser():
    webbrowser.open(f'http://localhost:{PORT}/DumpsterTracker.html')

# Change to the script's directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print("=" * 60)
    print("🚀 DumpsterTracker Server Starting...")
    print("=" * 60)
    print(f"\n✅ Server running at: http://localhost:{PORT}")
    print(f"✅ App URL: http://localhost:{PORT}/DumpsterTracker.html")
    print("\n📝 Press Ctrl+C to stop the server\n")
    print("=" * 60)
    
    # Open browser after 1 second
    Timer(1, open_browser).start()
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped")
