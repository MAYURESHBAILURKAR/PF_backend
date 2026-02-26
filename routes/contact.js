const express = require('express')
const Joi = require('joi')
const nodemailer = require('nodemailer')
const { Contact } = require('../models/User')

const router = express.Router()

// Validation schema
const contactSchema = Joi.object({
  name: Joi.string().max(100).required(),
  email: Joi.string().email().required(),
  message: Joi.string().min(20).max(2000).required(),
})

// Configure transporter (Gmail example — swap for SendGrid/Resend in prod)
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Use Gmail App Password, not your actual password
    },
  })
}

// POST /api/contact
router.post('/', async (req, res) => {
  const { error, value } = contactSchema.validate(req.body)
  if (error) {
    return res.status(400).json({ message: error.details[0].message })
  }

  const { name, email, message } = value

  // Save to MongoDB
  await Contact.create({ name, email, message })

  // Send email notification (if email env vars are configured)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const transporter = createTransporter()
      await transporter.sendMail({
        from: `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_TO || process.env.EMAIL_USER,
        replyTo: email,
        subject: `New Contact: ${name}`,
        html: `
          <div style="font-family: monospace; padding: 24px; max-width: 600px;">
            <h2 style="color: #c8ff57; margin-bottom: 16px;">New Contact Form Submission</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">From</td>
                <td style="padding: 8px 0;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">Email</td>
                <td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; vertical-align: top;">Message</td>
                <td style="padding: 8px 0; white-space: pre-wrap;">${message}</td>
              </tr>
            </table>
          </div>
        `,
      })
    } catch (emailErr) {
      // Don't fail the request if email fails — contact is saved to DB
      return res.status(400).json({ message: 'Error occured, Try sending mail directly, But not to worry your details are saved by the Team and will contact you soon' })
      console.error('Email send failed:', emailErr.message)
    }
  }

  res.status(201).json({ message: 'Message received! I\'ll get back to you soon.' })
})

module.exports = router
