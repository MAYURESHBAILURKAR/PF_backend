const express = require('express')
const jwt = require('jsonwebtoken')
const Joi = require('joi')
const { User } = require('../models/User')
const authMiddleware = require('../middleware/auth')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production'
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d'

// Validation schema
const loginSchema = Joi.object({
  username: Joi.string().min(3).required(),
  password: Joi.string().min(6).required(),
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { error, value } = loginSchema.validate(req.body)
  if (error) {
    return res.status(400).json({ message: error.details[0].message })
  }

  const { username, password } = value
  const user = await User.findOne({ username }).select('+password')

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid username or password' })
  }

  const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  })

  res.json({
    token,
    user: { id: user._id, username: user.username, role: user.role },
  })
})

// GET /api/auth/me — verify current token
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    user: { id: req.user._id, username: req.user.username, role: req.user.role },
  })
})

// POST /api/auth/seed — create initial admin (disable after first use!)
router.post('/register', async (req, res) => {
  // console.log(req.body);

  const existing = await User.findOne({ username: req.body.username })
  console.log(existing);
  
  if (existing) {
    return res.status(400).json({ message: 'Admin user already exists' })
  }
  const admin = await User.create({ username: req.body.username, password: req.body.password, email: req.body.email })
  res.status(201).json({ message: 'Admin created', username: admin.username })
})

module.exports = router
