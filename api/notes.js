const { Pool } = require('pg');

// Vercel automatically provides environment variables for the connected Postgres database
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

async function query(text, params) {
  const start = Date.now();
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    const duration = Date.now() - start;
    // console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
  } finally {
    client.release();
  }
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      // Fetch all notes
      const { rows } = await query('SELECT id, content, timestamp, date_text, time_text FROM notes ORDER BY timestamp DESC');
      res.status(200).json(rows);
    } else if (req.method === 'POST') {
      // Add a new note or batch import
      const notesData = req.body;

      if (Array.isArray(notesData)) { // Batch import / replace all
        await query('BEGIN');
        await query('DELETE FROM notes'); // Clear existing notes first
        if (notesData.length > 0) {
          // Using a loop for parameterized queries to prevent SQL injection
          for (const note of notesData) {
            const { id, content, timestamp, date_text, time_text } = note;
            if (!id || !content || !timestamp) {
              // Rollback transaction if any note is invalid
              await query('ROLLBACK');
              return res.status(400).json({ error: 'Invalid note structure in batch import. Each note must have id, content, and timestamp.' });
            }
            await query(
              'INSERT INTO notes (id, content, timestamp, date_text, time_text) VALUES ($1, $2, $3, $4, $5)',
              [id, content, timestamp, date_text, time_text]
            );
          }
        }
        await query('COMMIT');
        res.status(201).json({ message: 'Batch import successful' });

      } else { // Single note add
        const { id, content, timestamp, date_text, time_text } = notesData;
        if (!id || !content || !timestamp) {
          return res.status(400).json({ error: 'Missing required fields for note (id, content, timestamp).' });
        }
        // Insert or update if ID already exists
        await query(
          'INSERT INTO notes (id, content, timestamp, date_text, time_text) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, timestamp = EXCLUDED.timestamp, date_text = EXCLUDED.date_text, time_text = EXCLUDED.time_text',
          [id, content, timestamp, date_text, time_text]
        );
        res.status(201).json({ message: 'Note added/updated successfully', id });
      }
    } else if (req.method === 'DELETE') {
      // For deleting a single note by ID from query parameter: DELETE /api/notes?id=<NOTE_ID>
      const noteId_queryParam = req.query.id;

      // For deleting all notes via a specific action in the body: DELETE /api/notes with body {"action": "deleteAll"}
      const action_body = req.body ? req.body.action : null;

      if (noteId_queryParam) {
        const result = await query('DELETE FROM notes WHERE id = $1', [noteId_queryParam]);
        if (result.rowCount === 0) {
          return res.status(404).json({ error: 'Note not found' });
        }
        res.status(200).json({ message: 'Note deleted successfully', id: noteId_queryParam });
      } else if (action_body === 'deleteAll') {
        await query('DELETE FROM notes');
        res.status(200).json({ message: 'All notes deleted successfully' });
      } else {
        res.status(400).json({ error: 'Invalid DELETE request. Specify note ID as a query parameter (e.g., ?id=xxx) or action in body (e.g., {"action": "deleteAll"}).' });
      }
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    // Attempt to rollback if in a transaction and an error occurs (relevant for batch POST)
    if (error.message.includes('transaction')) { // Basic check
        try { await query('ROLLBACK'); } catch (rollBackError) { console.error('Rollback failed:', rollBackError); }
    }
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};
