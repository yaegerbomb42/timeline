const Database = require('better-sqlite3');
const path = require('path');

// Database configuration
const DB_PATH = path.join(process.cwd(), 'timeline.db');

// Initialize SQLite database
const db = new Database(DB_PATH);

// Enable foreign keys and WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create the notes table if it doesn't exist
const createNotesTable = () => {
    const createTable = `
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            date_text TEXT,
            time_text TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    try {
        db.exec(createTable);
        console.log('Notes table created or already exists');
    } catch (error) {
        console.error('Error creating notes table:', error);
        throw error;
    }
};

// Initialize the database
createNotesTable();

// Database operations
const dbOperations = {
    // Get all notes
    getAllNotes: () => {
        const stmt = db.prepare('SELECT id, content, timestamp, date_text, time_text FROM notes ORDER BY timestamp DESC');
        return stmt.all();
    },

    // Add a single note
    addNote: (note) => {
        const { id, content, timestamp, date_text, time_text } = note;
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO notes (id, content, timestamp, date_text, time_text) 
            VALUES (?, ?, ?, ?, ?)
        `);
        return stmt.run(id, content, timestamp, date_text, time_text);
    },

    // Delete a note by ID
    deleteNote: (id) => {
        const stmt = db.prepare('DELETE FROM notes WHERE id = ?');
        return stmt.run(id);
    },

    // Delete all notes
    deleteAllNotes: () => {
        const stmt = db.prepare('DELETE FROM notes');
        return stmt.run();
    },

    // Batch insert notes (replace all)
    batchReplaceNotes: (notes) => {
        const deleteAll = db.prepare('DELETE FROM notes');
        const insertNote = db.prepare(`
            INSERT INTO notes (id, content, timestamp, date_text, time_text) 
            VALUES (?, ?, ?, ?, ?)
        `);

        const transaction = db.transaction((notesToInsert) => {
            deleteAll.run();
            for (const note of notesToInsert) {
                const { id, content, timestamp, date_text, time_text } = note;
                insertNote.run(id, content, timestamp, date_text, time_text);
            }
        });

        return transaction(notes);
    }
};

// Graceful shutdown
process.on('exit', () => db.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));

module.exports = dbOperations;