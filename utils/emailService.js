// utils/emailService.js
import nodemailer from 'nodemailer';

const sendEmail = async (to, subject, html, options = {}) => {
  try {
    // 1. Configure the transporter (moved outside for reuse)
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com', // Fallback to Gmail
      port: parseInt(process.env.EMAIL_PORT || '587'), // Fallback to Gmail's TLS port
      secure: process.env.EMAIL_SECURE === 'true' ? true : false, // Use TLS (or STARTTLS)
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      //  Optional:
      tls: {
        ciphers: 'SSLv3' //  (Optional, but sometimes needed for older servers)
      }
    });

    // 2. Mail options
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER, // Fallback to user
      to: to,
      subject: subject,
      html: html,
      ...options // Allow for additional options (cc, bcc, attachments)
    };

    // 3. Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: %s`, info.messageId); // Log the message ID

    return info; // Return the info object (for potential further use)

  } catch (error) {
    console.error('Error sending email:', error);
    //  Handle the error appropriately (e.g., log it, retry, etc.)
    throw error; //  Or you might choose not to throw and just log
  }
};

export default sendEmail;