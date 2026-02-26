const express = require('express')
const Joi = require('joi')
const Blog = require('../models/Blog')
const authMiddleware = require('../middleware/auth')

const router = express.Router()

// Validation schemas
const blogSchema = Joi.object({
  title: Joi.string().max(200).required(),
  slug: Joi.string().pattern(/^[a-z0-9-]+$/).required(),
  content: Joi.string().required(),
  tags: Joi.array().items(Joi.string()).default([]),
  image: Joi.string().uri().allow('').default(''),
  author: Joi.string().default('Mayuresh Bailurkar'),
  published: Joi.boolean().default(true),
})

// GET /api/blogs — get all published posts
router.get('/', async (req, res) => {
  const { limit = 20, page = 1, tag, sort = '-date' } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  const filter = { published: true }
  if (tag) filter.tags = { $in: [tag] }

  const [blogs, total] = await Promise.all([
    Blog.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .select('-__v'),
    Blog.countDocuments(filter),
  ])

  res.json({ blogs, total, page: Number(page), pages: Math.ceil(total / limit) })
})

// GET /api/blogs/:slug — get single post by slug
router.get('/:slug', async (req, res) => {
  const blog = await Blog.findOne({ slug: req.params.slug, published: true })
  if (!blog) return res.status(404).json({ message: 'Post not found' })
  res.json(blog)
})

// POST /api/blogs — create (protected)
router.post('/', authMiddleware, async (req, res) => {
  const { error, value } = blogSchema.validate(req.body)
  if (error) return res.status(400).json({ message: error.details[0].message })

  const existing = await Blog.findOne({ slug: value.slug })
  if (existing) return res.status(409).json({ message: 'A post with this slug already exists' })

  const blog = await Blog.create({ ...value, author: req.user.username })
  res.status(201).json(blog)
})

// PUT /api/blogs/:id — update (protected)
router.put('/:id', authMiddleware, async (req, res) => {
  const { error, value } = blogSchema.validate(req.body, {
    allowUnknown: true
  })

  if (error) return res.status(400).json({ message: error.details[0].message })

  const blog = await Blog.findByIdAndUpdate(req.params.id, value, {
    new: true,
    runValidators: true,
  })
  if (!blog) return res.status(404).json({ message: 'Post not found' })
  res.json(blog)
})

// DELETE /api/blogs/:id — delete (protected)
router.delete('/:id', authMiddleware, async (req, res) => {
  const blog = await Blog.findByIdAndDelete(req.params.id)
  if (!blog) return res.status(404).json({ message: 'Post not found' })
  res.json({ message: 'Post deleted successfully' })
})

module.exports = router
