// Database setup - use PostgreSQL if POSTGRES_URL is available, otherwise use SQLite
const usePostgreSQL = !!process.env.POSTGRES_URL;
let db, query;

if (usePostgreSQL) {
  // PostgreSQL setup for production (Vercel)
  const { Pool } = require('pg');
  
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false // Required for Vercel Postgres
    }
  });

  pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });

  // Initialize PostgreSQL tables
  (async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          date_text TEXT,
          time_text TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('PostgreSQL notes table initialized');
    } catch (error) {
      console.error('Error initializing PostgreSQL table:', error);
    }
  })();

  query = async (text, params) => {
    const start = Date.now();
    const client = await pool.connect();
    try {
      const res = await client.query(text, params);
      const duration = Date.now() - start;
      return res;
    } catch (error) {
      console.error('PostgreSQL query error:', error);
      throw error;
    } finally {
      client.release();
    }
  };

  db = {
    getAllNotes: async () => {
      try {
        const { rows } = await query('SELECT id, content, timestamp, date_text, time_text FROM notes ORDER BY timestamp DESC');
        return rows;
      } catch (error) {
        throw new Error('Failed to fetch notes from database.');
      }
    },
    addNote: async (note) => {
      const { id, content, timestamp, date_text, time_text } = note;
      try {
        await query(
          'INSERT INTO notes (id, content, timestamp, date_text, time_text) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, timestamp = EXCLUDED.timestamp, date_text = EXCLUDED.date_text, time_text = EXCLUDED.time_text',
          [id, content, timestamp, date_text, time_text]
        );
        return { id };
      } catch (error) {
        throw new Error('Failed to add or update note in database.');
      }
    },
    deleteNote: async (id) => {
      try {
        const result = await query('DELETE FROM notes WHERE id = $1', [id]);
        return { changes: result.rowCount };
      } catch (error) {
        throw new Error('Failed to delete note from database.');
      }
    },
    deleteAllNotes: async () => {
      try {
        await query('DELETE FROM notes');
      } catch (error) {
        throw new Error('Failed to delete all notes from database.');
      }
    },
    batchReplaceNotes: async (notes) => {
      try {
        await query('BEGIN');
        try {
          await query('DELETE FROM notes');
          if (notes.length > 0) {
            for (const note of notes) {
              const { id, content, timestamp, date_text, time_text } = note;
              await query(
                'INSERT INTO notes (id, content, timestamp, date_text, time_text) VALUES ($1, $2, $3, $4, $5)',
                [id, content, timestamp, date_text, time_text]
              );
            }
          }
          await query('COMMIT');
        } catch (error) {
          await query('ROLLBACK');
          throw new Error('Failed to batch replace notes in database.');
        }
      } catch (error) {
        throw error;
      }
    }
  };
} else {
  // SQLite setup for local development
  const dbOps = require('./database');
  db = {
    getAllNotes: async () => {
      try {
        return dbOps.getAllNotes();
      } catch (error) {
        throw new Error('Failed to fetch notes from local database.');
      }
    },
    addNote: async (note) => {
      try {
        return dbOps.addNote(note);
      } catch (error) {
        throw new Error('Failed to add or update note in local database.');
      }
    },
    deleteNote: async (id) => {
      try {
        return dbOps.deleteNote(id);
      } catch (error) {
        throw new Error('Failed to delete note from local database.');
      }
    },
    deleteAllNotes: async () => {
      try {
        return dbOps.deleteAllNotes();
      } catch (error) {
        throw new Error('Failed to delete all notes from local database.');
      }
    },
    batchReplaceNotes: async (notes) => {
      try {
        return dbOps.batchReplaceNotes(notes);
      } catch (error) {
        throw new Error('Failed to batch replace notes in local database.');
      }
    }
  };
  console.log('Using SQLite database for local development');
}

// Utility functions for validation and sanitization
const MAX_CONTENT_LENGTH = 2000;
const MAX_ID_LENGTH = 128;
function isValidISODate(str) {
  return typeof str === 'string' && !isNaN(Date.parse(str));
}
function sanitizeString(str) {
  // Remove script/style tags and encode < >
  if (typeof str !== 'string') return '';
  return str.replace(/<script.*?>.*?<\/script>/gi, '')
            .replace(/<style.*?>.*?<\/style>/gi, '')
            .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function validateNote(note) {
  if (!note || typeof note !== 'object') return 'Note must be an object.';
  if (!note.id || typeof note.id !== 'string' || note.id.length > MAX_ID_LENGTH) return 'Invalid or missing id.';
  if (!note.content || typeof note.content !== 'string' || note.content.length > MAX_CONTENT_LENGTH) return 'Invalid or missing content.';
  if (!note.timestamp || typeof note.timestamp !== 'string' || !isValidISODate(note.timestamp)) return 'Invalid or missing timestamp.';
  return null;
}
function sanitizeNote(note) {
  return {
    ...note,
    id: sanitizeString(note.id),
    content: sanitizeString(note.content),
    date_text: note.date_text ? sanitizeString(note.date_text) : undefined,
    time_text: note.time_text ? sanitizeString(note.time_text) : undefined
  };
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      // Fetch all notes
      const notes = await db.getAllNotes();
      res.status(200).json(notes);
    } else if (req.method === 'POST') {
      // Add a new note or batch import
      console.log('POST body:', req.body);
      const notesData = req.body;
      if (Array.isArray(notesData)) { // Batch import / replace all
        // Validate and sanitize all notes first
        for (let i = 0; i < notesData.length; i++) {
          const note = notesData[i];
          const validationError = validateNote(note);
          if (validationError) {
            return res.status(400).json({ error: `Invalid note at index ${i}: ${validationError}` });
          }
          notesData[i] = sanitizeNote(note);
        }
        try {
          await db.batchReplaceNotes(notesData);
          res.status(201).json({ message: 'Batch import successful' });
        } catch (error) {
          console.error('Batch import error:', error);
          res.status(500).json({ error: error.message || 'Failed to batch import notes.' });
        }
      } else { // Single note add
        const { id, content, timestamp, date_text, time_text } = notesData;
        const validationError = validateNote(notesData);
        if (validationError) {
          return res.status(400).json({ error: validationError });
        }
        const sanitizedNote = sanitizeNote({ id, content, timestamp, date_text, time_text });
        try {
          await db.addNote(sanitizedNote);
          res.status(201).json({ message: 'Note added/updated successfully', id: sanitizedNote.id });
        } catch (error) {
          console.error('Add note error:', error);
          res.status(500).json({ error: error.message || 'Failed to add or update note.' });
        }
      }
    } else if (req.method === 'DELETE') {
      // For deleting a single note by ID from query parameter: DELETE /api/notes?id=<NOTE_ID>
      console.log('DELETE query:', req.query);
      console.log('DELETE body:', req.body);
      const noteId_queryParam = req.query.id;
      // For deleting all notes via a specific action in the body: DELETE /api/notes with body {"action": "deleteAll"}
      // Also allow via query param: /api/notes?action=deleteAll
      const action_body = req.body ? req.body.action : null;
      const action_query = req.query.action;
      if (noteId_queryParam) {
        try {
          const result = await db.deleteNote(noteId_queryParam);
          if (result.changes === 0) {
            return res.status(404).json({ error: 'Note not found' });
          }
          res.status(200).json({ message: 'Note deleted successfully', id: noteId_queryParam });
        } catch (error) {
          console.error('Delete note error:', error);
          res.status(500).json({ error: error.message || 'Failed to delete note.' });
        }
      } else if (action_body === 'deleteAll' || action_query === 'deleteAll') {
        try {
          await db.deleteAllNotes();
          res.status(200).json({ message: 'All notes deleted successfully' });
        } catch (error) {
          console.error('Delete all notes error:', error);
          res.status(500).json({ error: error.message || 'Failed to delete all notes.' });
        }
      } else {
        res.status(400).json({ error: 'Invalid DELETE request. Specify note ID as a query parameter (e.g., ?id=xxx) or action in body (e.g., {"action": "deleteAll"}) or as a query param (e.g., ?action=deleteAll).' });
      }
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.message });
  }
};
