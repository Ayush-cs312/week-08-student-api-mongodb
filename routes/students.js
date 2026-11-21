const express = require('express');
const mongoose = require('mongoose');
const Student = require('../models/Student');

const router = express.Router();

// Express 4 does not catch errors from async handlers by itself, so wrap them.
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Only these fields can be set by a client (ignores id, createdAt, etc.)
const pickFields = (body = {}) => {
  const data = {};
  for (const key of ['name', 'department', 'semester']) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  return data;
};

// Runs for every route containing :id - checks the id format and loads the student.
router.param('id', async (req, res, next, id) => {
  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid student id' });
    }
    req.student = await Student.findById(id);
    if (!req.student) return res.status(404).json({ error: `Student with id ${id} not found` });
    next();
  } catch (err) {
    next(err);
  }
});

// GET /students                      -> all students (newest first)
// GET /students?department=computer  -> filter by department (case-insensitive, partial match)
router.get('/', wrap(async (req, res) => {
  const filter = {};
  if (req.query.department) {
    const term = String(req.query.department).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape regex characters
    filter.department = new RegExp(term, 'i');
  }
  res.json(await Student.find(filter).sort({ createdAt: -1 }));
}));

router.get('/:id', (req, res) => {
  res.json(req.student);
});

router.post('/', wrap(async (req, res) => {
  const student = await Student.create(pickFields(req.body)); // schema validation runs here
  res.status(201).json(student);
}));

router.put('/:id', wrap(async (req, res) => {
  const data = pickFields(req.body);
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'Validation failed', details: ['send at least one of: name, department, semester'] });
  }
  req.student.set(data);
  res.json(await req.student.save()); // validators run on save
}));

router.delete('/:id', wrap(async (req, res) => {
  await req.student.deleteOne();
  res.json({ message: 'Student deleted', student: req.student });
}));

module.exports = router;
