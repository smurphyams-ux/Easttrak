#!/bin/bash

# Database Setup Script for Dumpster Tracker
# This script creates and initializes the PostgreSQL database

echo "🚀 Setting up Dumpster Tracker Database..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed."
    echo "Please install it first:"
    echo "  brew install postgresql@16"
    echo "  brew services start postgresql@16"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready &> /dev/null; then
    echo "❌ PostgreSQL is not running."
    echo "Starting PostgreSQL..."
    brew services start postgresql@16
    sleep 2
fi

# Database name
DB_NAME="dumpstertracker"

# Check if database exists
if psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "⚠️  Database '$DB_NAME' already exists."
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping existing database..."
        dropdb $DB_NAME
    else
        echo "Exiting without changes."
        exit 0
    fi
fi

# Create database
echo "Creating database '$DB_NAME'..."
createdb $DB_NAME

if [ $? -eq 0 ]; then
    echo "✅ Database created successfully!"
else
    echo "❌ Failed to create database."
    exit 1
fi

# Apply schema
SCHEMA_FILE="/Users/sandramurphy/dumpstertracker app2"

if [ ! -f "$SCHEMA_FILE" ]; then
    echo "❌ Schema file not found: $SCHEMA_FILE"
    exit 1
fi

echo "Applying schema from '$SCHEMA_FILE'..."
psql -d $DB_NAME -f "$SCHEMA_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Schema applied successfully!"
else
    echo "❌ Failed to apply schema."
    exit 1
fi

# Test the setup
echo ""
echo "Testing database setup..."
psql -d $DB_NAME -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' LIMIT 5;"

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Connection details:"
echo "  Database: $DB_NAME"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  User: $(whoami)"
echo ""
echo "To connect manually:"
echo "  psql -d $DB_NAME"
echo ""
