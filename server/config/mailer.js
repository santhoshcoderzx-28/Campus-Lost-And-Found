// Transactional email over SMTP (Gmail app password in this project).
// If SMTP is not configured the message is printed to the log instead, so the
// verification and reset flows still work on a machine without mail access.
const nodemailer = require('nodemailer');

const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.MAIL_FROM || (user ? `Campus Lost & Found <${user}>` : '');
const configured = Boolean(user && pass);

const transport = configured
  ? nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })
  : null;

async function sendMail({ to, subject, text, html }) {
  if (!configured) {
    console.log(`[mail:dev] to=${to} subject=${subject}`);
    console.log(`[mail:dev] ${text}`);
    return { delivered: false, reason: 'smtp-not-configured' };
  }
  await transport.sendMail({ from, to, subject, text, html });
  return { delivered: true };
}

function verificationEmail({ name, link }) {
  return {
    subject: 'Verify your Campus Lost & Found email',
    text: `Hi ${name || 'there'},\n\nConfirm your email address to finish setting up your account:\n${link}\n\nThis link expires in 24 hours. If you did not create an account, ignore this email.`,
    html: `<p>Hi ${name || 'there'},</p><p>Confirm your email address to finish setting up your account:</p><p><a href="${link}">Verify my email</a></p><p>This link expires in 24 hours. If you did not create an account, ignore this email.</p>`,
  };
}

function resetEmail({ name, link }) {
  return {
    subject: 'Reset your Campus Lost & Found password',
    text: `Hi ${name || 'there'},\n\nUse this link to set a new password:\n${link}\n\nThis link expires in 1 hour. If you did not ask for this, ignore this email.`,
    html: `<p>Hi ${name || 'there'},</p><p>Use this link to set a new password:</p><p><a href="${link}">Reset my password</a></p><p>This link expires in 1 hour. If you did not ask for this, ignore this email.</p>`,
  };
}

module.exports = { sendMail, verificationEmail, resetEmail, configured };
