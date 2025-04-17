// routes/testEmail.js
import express from 'express';
import sendEmail from '../utils/emailService.js';

const router = express.Router();

router.post('/send-test-email', async (req, res) => {
  const { to, subject, message } = req.body;

  try {
    const html = `<h2>${subject}</h2><p>${message}</p>`;
    const result = await sendEmail(to, subject, html);
    res.status(200).json({ success: true, messageId: result.messageId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
