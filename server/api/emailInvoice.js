
import express from 'express';
import nodemailer from 'nodemailer';
import { jsPDF } from 'jspdf';

const router = express.Router();

// Helper to generate PDF as Buffer
function generateInvoicePDF(invoice, paidInfo) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text('TrashGoAway.com L.L.C', 15, 18);
  doc.setFontSize(11);
  doc.text('2466 Emmons Rd, Jackson, MI 49201', 15, 26);
  doc.text('PH: 517-803-3000   PH: 248-388-1000', 15, 32);
  doc.text('info@trashgoaway.com   www.trashgoaway.com', 15, 38);
  doc.setFontSize(15);
  doc.text(`Invoice #${invoice.invoice_id || invoice.id}`, 15, 50);
  doc.setFontSize(12);
  let y = 60;
  const addLine = (label, value) => {
    doc.text(`${label}: ${value}`, 15, y);
    y += 8;
  };
  addLine('Date Ordered', invoice.date_ordered ? String(invoice.date_ordered).slice(0, 10) : '');
  addLine('Reserved Date', invoice.reserve_date ? String(invoice.reserve_date).slice(0, 10) : '');
  addLine('Trailer #', invoice.trailer_number || '');
  addLine('Trailer Size', invoice.trailer_size || '');
  addLine('Address', invoice.service_address || invoice.address || '');
  addLine('Client', invoice.customer_name || invoice.client || '');
  addLine('Phone', invoice.phone_number || invoice.phone || '');
  addLine('Source', invoice.source || '');
  addLine('Comments', invoice.comment || invoice.comments || invoice.notes || '');
  addLine('Payment Amount', invoice.amount ? `$${invoice.amount}` : '');
  if (paidInfo && paidInfo.paid) addLine('PAID', `on ${paidInfo.date}`);
  return doc.output('arraybuffer');
}

router.post('/', async (req, res) => {
  const { invoice, paidInfo, to } = req.body;
  if (!invoice || !to) return res.status(400).json({ error: 'Missing invoice or recipient email' });

  // Generate PDF
  const pdfBuffer = Buffer.from(generateInvoicePDF(invoice, paidInfo));

  // Configure Nodemailer (replace with your SMTP credentials)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: 'info@trashgoaway.com',
    to,
    subject: 'Your Paid Invoice from TrashGoAway.com',
    text:
      `Dear ${invoice.customer_name || invoice.client || 'Customer'},\n\n` +
      `Thank you for choosing TrashGoAway.com for your dumpster rental needs!\n\n` +
      `Your paid invoice is attached to this email. We appreciate your business and are always here for you whenever you need a dumpster.\n\n` +
      `If you have any questions or need another dumpster in the future, please don't hesitate to contact us.\n\n` +
      `Thank you again for your trust in TrashGoAway.com.\n\n` +
      `Best regards,\n` +
      `The TrashGoAway.com Team\n` +
      `PH: 517-803-3000 | PH: 248-388-1000\n` +
      `info@trashgoaway.com\n` +
      `www.trashgoaway.com\n\n` +
      `---\n` +
      `If the PDF is not attached, please reply and we will resend it.\n`,
    attachments: [
      {
        filename: `Invoice_${invoice.invoice_id || invoice.id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send email', details: err.message });
  }
});

export default router;
