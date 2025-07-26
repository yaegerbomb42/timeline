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
    } finally {
      client.release();
    }
  };

  db = {
    getAllNotes: async () => {
      const { rows } = await query('SELECT id, content, timestamp, date_text, time_text FROM notes ORDER BY timestamp DESC');
      return rows;
    },
    addNote: async (note) => {
      const { id, content, timestamp, date_text, time_text } = note;
      await query(
        'INSERT INTO notes (id, content, timestamp, date_text, time_text) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, timestamp = EXCLUDED.timestamp, date_text = EXCLUDED.date_text, time_text = EXCLUDED.time_text',
        [id, content, timestamp, date_text, time_text]
      );
      return { id };
    },
    deleteNote: async (id) => {
      const result = await query('DELETE FROM notes WHERE id = $1', [id]);
      return { changes: result.rowCount };
    },
    deleteAllNotes: async () => {
      await query('DELETE FROM notes');
    },
    batchReplaceNotes: async (notes) => {
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
        throw error;
      }
    }
  };
} else {
  // SQLite setup for local development
  db = require('./database');
  console.log('Using SQLite database for local development');
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
        // Validate all notes first
        for (const note of notesData) {
          const { id, content, timestamp } = note;
          if (!id || !content || !timestamp) {
            return res.status(400).json({ error: 'Invalid note structure in batch import. Each note must have id, content, and timestamp.' });
          }
        }
        
        await db.batchReplaceNotes(notesData);
        res.status(201).json({ message: 'Batch import successful' });

      } else { // Single note add
        const { id, content, timestamp, date_text, time_text } = notesData;
        if (!id || !content || !timestamp) {
          return res.status(400).json({ error: 'Missing required fields for note (id, content, timestamp).' });
        }
        
        await db.addNote({ id, content, timestamp, date_text, time_text });
        res.status(201).json({ message: 'Note added/updated successfully', id });
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
        const result = await db.deleteNote(noteId_queryParam);
        if (result.changes === 0) {
          return res.status(404).json({ error: 'Note not found' });
        }
        res.status(200).json({ message: 'Note deleted successfully', id: noteId_queryParam });
      } else if (action_body === 'deleteAll' || action_query === 'deleteAll') {
        await db.deleteAllNotes();
        res.status(200).json({ message: 'All notes deleted successfully' });
      } else {
        res.status(400).json({ error: 'Invalid DELETE request. Specify note ID as a query parameter (e.g., ?id=xxx) or action in body (e.g., {"action": "deleteAll"}) or as a query param (e.g., ?action=deleteAll).' });
      }
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};
