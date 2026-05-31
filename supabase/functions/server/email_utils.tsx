// Email utility functions to be shared across modules
// This file exports the sendEmail function used by order confirmations, quotations, invoices, etc.

// Send email using nodemailer with SMTP
export async function sendEmail(to: string, subject: string, html: string, attachments?: any[]) {
  console.log('=== SEND EMAIL FUNCTION ===');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('Attachments:', attachments?.length || 0);
  
  try {
    // Get email configuration
    const { get } = await import('./kv_custom.tsx');
    const config = await get('email_config') || {
      smtpHost: 'smtp.office365.com',
      smtpPort: 587,
      smtpSecure: false,
      senderEmail: 'info@costplus100.com.au',
      senderName: 'Costplus100'
    };

    // Get SMTP credentials from environment
    const smtpPassword = Deno.env.get('SMTP_PASSWORD');
    const smtpUser = Deno.env.get('SMTP_USER') || config.senderEmail;
    const smtpHost = Deno.env.get('SMTP_HOST') || config.smtpHost;
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || String(config.smtpPort));

    if (!smtpPassword) {
      throw new Error('SMTP_PASSWORD environment variable not configured. Please add it to Supabase Edge Functions secrets.');
    }

    console.log('SMTP Config:', {
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      hasPassword: !!smtpPassword
    });

    // Import nodemailer
    const nodemailer = await import('npm:nodemailer@6.9.7');

    // Create transporter
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: config.smtpSecure || false,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    console.log('Transporter created, verifying...');

    // Verify connection
    try {
      await transporter.verify();
      console.log('SMTP connection verified successfully');
    } catch (verifyError) {
      console.error('SMTP verification failed:', verifyError);
      throw new Error(`SMTP verification failed: ${verifyError.message}`);
    }

    // Send email
    const mailOptions = {
      from: `"${config.senderName}" <${smtpUser}>`,
      to,
      subject,
      html,
      attachments,
    };

    console.log('Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      hasAttachments: !!attachments && attachments.length > 0
    });

    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully:', {
      messageId: info.messageId,
      response: info.response
    });

    return info;
  } catch (error) {
    console.error('Send email error:', error);
    throw error;
  }
}
