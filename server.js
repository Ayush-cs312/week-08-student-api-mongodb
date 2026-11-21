require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const studentRoutes = require('./routes/students');

const app = express();

app.use(express.json()); // middleware: parses JSON request bodies into req.body

app.get('/', (req, res) => {
  res.json({ message: 'Student Management API (MongoDB)', endpoints: '/students' });
});

// If the database is not connected, answer with 503 instead of hanging.
app.use('/students', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
  }
  next();
});

app.use('/students', studentRoutes);

// Unknown route -> JSON 404
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Error-handling middleware (must have 4 arguments)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: Object.values(err.errors).map((e) => e.message),
    });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Validation failed', details: [`${err.path} has an invalid value`] });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is missing. Copy .env.example to .env and add your connection string.');
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
  mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}

// Connect and listen only when run directly (tests import the app instead)
if (require.main === module) start();

module.exports = app;
