# Database Installation Guide

## Step 1: Install Homebrew (macOS Package Manager)

Open Terminal and run:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Note**: This will ask for your admin password. This is the same password you use to log into your Mac.

After installation, you may need to add Homebrew to your PATH:
```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

Verify installation:
```bash
brew --version
```

## Step 2: Install PostgreSQL

```bash
brew install postgresql@16
```

This will take a few minutes to download and install PostgreSQL.

## Step 3: Start PostgreSQL Service

```bash
brew services start postgresql@16
```

Add PostgreSQL to your PATH:
```bash
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Verify PostgreSQL is running:
```bash
psql --version
pg_isready
```

You should see:
- `psql (PostgreSQL) 16.x`
- `/tmp:5432 - accepting connections`

## Step 4: Create and Setup Database

Navigate to your project:
```bash
cd /Users/sandramurphy/Documents/DumpsterTracker
```

Run the setup script:
```bash
./setup-database.sh
```

This script will:
1. Create a database named `dumpstertracker`
2. Apply the schema from your SQL file
3. Set up all tables, functions, and triggers
4. Display a list of created tables

## Step 5: Verify Database Setup

Connect to the database:
```bash
psql -d dumpstertracker
```

Once connected, try these commands:
```sql
-- List all tables
\dt

-- View customers table structure
\d customers

-- View all enums
\dT

-- Test a query
SELECT COUNT(*) FROM customers;

-- Exit
\q
```

## Step 6: (Optional) Install a GUI Tool

For easier database management, you can install:

### Option 1: Postico (Free/Paid, macOS)
```bash
brew install --cask postico
```

### Option 2: pgAdmin (Free, Cross-platform)
```bash
brew install --cask pgadmin4
```

### Option 3: DBeaver (Free, Cross-platform)
```bash
brew install --cask dbeaver-community
```

## Connection Details

Use these details to connect from any database tool:

- **Host**: localhost
- **Port**: 5432
- **Database**: dumpstertracker
- **Username**: (your Mac username, currently: sandramurphy)
- **Password**: (none by default for local development)

## Troubleshooting

### "brew: command not found"
- Make sure you completed Step 1
- Close and reopen Terminal after installing Homebrew
- Run: `eval "$(/opt/homebrew/bin/brew shellenv)"`

### "psql: command not found" after installing PostgreSQL
- Run: `source ~/.zshrc`
- Or add the PATH manually: `export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"`

### PostgreSQL won't start
```bash
# Check status
brew services list

# If it's not running, try:
brew services stop postgresql@16
brew services start postgresql@16

# Check logs if it still fails:
cat /opt/homebrew/var/log/postgresql@16.log
```

### Database creation fails
- Make sure PostgreSQL is running: `pg_isready`
- Check that you have proper permissions
- Try creating manually:
  ```bash
  createdb dumpstertracker
  psql -d dumpstertracker -f "/Users/sandramurphy/dumpstertracker app2"
  ```

### Permission denied errors
- PostgreSQL creates a user with your Mac username automatically
- No password is needed for local development
- If you need to reset:
  ```bash
  dropdb dumpstertracker
  createdb dumpstertracker
  ```

## Quick Reference Commands

```bash
# PostgreSQL Service Management
brew services start postgresql@16    # Start PostgreSQL
brew services stop postgresql@16     # Stop PostgreSQL
brew services restart postgresql@16  # Restart PostgreSQL
brew services list                   # List all services

# Database Commands
createdb <dbname>                    # Create a database
dropdb <dbname>                      # Delete a database
psql -d <dbname>                     # Connect to a database
psql -l                              # List all databases

# Inside psql
\l                                   # List databases
\dt                                  # List tables
\d <table>                          # Describe table
\q                                   # Quit
```

## Next Steps After Database Setup

1. ✅ Database is running
2. ✅ Schema is applied
3. 🔄 Build a backend API (Node.js + Express)
4. 🔄 Connect React Native app to the API
5. 🔄 Replace mock data with real database queries

## Need Help?

If you encounter any issues:
1. Check the error messages carefully
2. Verify each step completed successfully
3. Check PostgreSQL logs: `cat /opt/homebrew/var/log/postgresql@16.log`
4. Make sure you have admin rights on your Mac

---

**Ready?** Start with Step 1 and work your way through. Take your time with each step!
