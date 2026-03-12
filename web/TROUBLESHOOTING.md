# Troubleshooting Guide

## Common Issues

### 1. Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### 2. Database Connection Failed
- Make sure PostgreSQL is running: `brew services start postgresql` (Mac)
- Check credentials in `.env` file
- Create database: `createdb dumpstertracker`

### 3. Module Not Found
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### 4. Google Maps Not Loading
- Verify API key in `.env` file
- Enable "Maps JavaScript API" in Google Cloud Console
- Restart dev server after changing `.env`

### 5. TypeScript Errors
```bash
# Clear TypeScript cache
rm -rf dist
npm run build
```

## Development Commands

```bash
# Start both frontend and backend
npm run dev

# Start only backend
npm run server

# Start only frontend
npm run client

# Build for production
npm run build

# Run production build
npm start
```

## Logs Location

- Server logs: Console output
- Database logs: Check PostgreSQL logs
- Browser logs: Chrome DevTools Console

## Need Help?

Check the browser console and server terminal for error messages.
