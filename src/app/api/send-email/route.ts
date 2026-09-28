import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { DEFAULT_SENDER_EMAIL, DEFAULT_SENDER_FULL } from '@/lib/email-templates';

export async function POST(request: Request) {
  try {
    const { to, subject, body, ticketId, reportId } = await request.json();

    if (!to || !to.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'A valid recipient email address is required.' },
        { status: 400 }
      );
    }

    const senderEmail = process.env.SMTP_USER || DEFAULT_SENDER_EMAIL;
    const senderFrom = process.env.EMAIL_FROM || DEFAULT_SENDER_FULL;
    const replyTo = process.env.EMAIL_REPLY_TO || senderEmail;

    // Server log for auditing & transparency
    console.log(`[Email Dispatch Request] From: ${senderFrom} | To: ${to} | Ticket: ${ticketId || 'N/A'}`);

    // 1. Check SMTP / Nodemailer Configuration (e.g. Gmail App Password, Google Workspace, Outlook, cPanel)
    const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
    const smtpHost = process.env.SMTP_HOST || (smtpPass ? 'smtp.gmail.com' : undefined);

    if (smtpPass && smtpHost) {
      try {
        const port = Number(process.env.SMTP_PORT) || 465;
        const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;

        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port,
          secure,
          auth: {
            user: senderEmail,
            pass: smtpPass,
          },
        });

        // Convert body plain text with linebreaks to clean html
        const htmlBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">
${body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
          </div>
        `;

        const info = await transporter.sendMail({
          from: senderFrom,
          to,
          replyTo,
          subject,
          text: body,
          html: htmlBody,
        });

        console.log(`[SMTP Success] Email dispatched to ${to}. MessageId: ${info.messageId}`);

        return NextResponse.json({
          success: true,
          provider: 'smtp',
          messageId: info.messageId,
          recipient: to,
          sender: senderEmail,
          ticketId,
          timestamp: new Date().toISOString(),
        });
      } catch (smtpError: any) {
        console.error('[SMTP Error]:', smtpError);
        return NextResponse.json(
          {
            success: false,
            error: `SMTP delivery failed: ${smtpError.message || 'Authentication or network error'}.`,
            details: smtpError.toString(),
          },
          { status: 500 }
        );
      }
    }

    // 2. Check Resend API Key
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: senderFrom,
            to: [to],
            reply_to: replyTo,
            subject,
            text: body,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('[Resend Error Response]:', data);
          return NextResponse.json(
            {
              success: false,
              error: data.message || data.error || 'Resend failed to deliver email. Check domain verification or API key.',
            },
            { status: response.status }
          );
        }

        console.log(`[Resend Success] Email dispatched to ${to}. ID: ${data.id}`);

        return NextResponse.json({
          success: true,
          provider: 'resend',
          messageId: data.id,
          recipient: to,
          sender: senderEmail,
          ticketId,
          timestamp: new Date().toISOString(),
        });
      } catch (resendError: any) {
        console.error('[Resend Exception]:', resendError);
        return NextResponse.json(
          {
            success: false,
            error: `Resend request error: ${resendError.message}`,
          },
          { status: 500 }
        );
      }
    }

    // 3. Fallback when credentials are not yet configured
    return NextResponse.json(
      {
        success: false,
        code: 'MISSING_CREDENTIALS',
        sender: senderEmail,
        error: `Email server credentials for ${senderEmail} are not yet configured in .env.local (SMTP_PASS or RESEND_API_KEY). You can use "Open in Mail App" to send immediately from your local email client.`,
      },
      { status: 422 }
    );
  } catch (error: any) {
    console.error('Send email API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process email request.' },
      { status: 500 }
    );
  }
}
