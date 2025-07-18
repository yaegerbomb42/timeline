# Database Setup Guide

## Overview
The Ultra 3D Timeline application now uses a database instead of localStorage for data persistence. This ensures your timeline data is always saved and accessible regardless of where you access the application.

## Database Options

### Local Development (SQLite)
For the easiest setup, the application automatically uses SQLite when no PostgreSQL connection is available:

1. **No configuration needed** - SQLite database file (`timeline.db`) is created automatically
2. **Zero setup** - Just run `npm run dev` and start using the application
3. **File-based storage** - Data persists in a local file

### Production (PostgreSQL)
For production deployment (e.g., on Vercel), the application automatically switches to PostgreSQL when the `POSTGRES_URL` environment variable is set.

#### Vercel Postgres Setup:
1. Go to your Vercel project dashboard
2. Navigate to the "Storage" tab
3. Click "Create Database" and select "Postgres"
4. Vercel will automatically set the `POSTGRES_URL` environment variable
5. Deploy your application - the database will be created automatically

#### Manual PostgreSQL Setup:
Set the `POSTGRES_URL` environment variable with your database connection string:
```bash
export POSTGRES_URL="postgresql://username:password@hostname:port/database?sslmode=require"
```

## Running the Application

### Development Mode
```bash
npm install
npm run dev
```
The application will start on `http://localhost:3000` with SQLite database.

### Production Mode
Deploy to Vercel or any Node.js hosting platform. The application will automatically use PostgreSQL if `POSTGRES_URL` is configured, otherwise it falls back to SQLite.

## Features

✅ **Automatic database detection** - Uses PostgreSQL in production, SQLite in development
✅ **Automatic table creation** - Database schema is created on first run
✅ **Data migration** - Existing localStorage data is automatically migrated to database
✅ **Cross-device sync** - Access your timeline from any device
✅ **Persistent storage** - Data survives browser clearing and device changes
✅ **Admin controls** - Export/import data, bulk operations
✅ **Search functionality** - Search through all your notes
✅ **Real-time updates** - Changes are immediately saved to database

## API Endpoints

The application provides REST API endpoints for external integration:

- `GET /api/notes` - Fetch all notes
- `POST /api/notes` - Add a new note
- `DELETE /api/notes?id=<note_id>` - Delete a specific note
- `DELETE /api/notes` with `{"action": "deleteAll"}` - Clear all notes

## Troubleshooting

### SQLite Issues
- Ensure the application has write permissions in the directory
- The `timeline.db` file will be created automatically

### PostgreSQL Issues
- Verify the `POSTGRES_URL` environment variable is set correctly
- Check that the database server is accessible
- Ensure SSL settings match your database requirements

### Migration Issues
- If localStorage migration fails, you can export your old data using the admin panel
- Import the exported JSON file after the database is set up