const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

const sendEmail = async (options) => {
    console.log('📧 Preparing to send email...');
    console.log('  To:', options.email);
    console.log('  Subject:', options.subject);

    // OPTION 1: Brevo (Sendinblue) API - HTTP-based, works when SMTP is blocked
    if (process.env.BREVO_API_KEY) {
        console.log('🚀 Using Brevo (Sendinblue) API (HTTP)...');

        try {
            const axios = require('axios');

            const emailData = {
                sender: {
                    name: 'LegalMate',
                    email: process.env.FROM_EMAIL?.match(/<(.+)>/)?.[1] || 'legalmate.services@gmail.com'
                },
                to: [{ email: options.email }],
                subject: options.subject,
                htmlContent: options.html || `<p>${options.message || 'Email from LegalMate'}</p>`,
                textContent: options.message || (options.html ? options.html.replace(/<[^>]*>/g, '') : 'Email from LegalMate')
            };

            const response = await axios.post(
                'https://api.brevo.com/v3/smtp/email',
                emailData,
                {
                    headers: {
                        'api-key': process.env.BREVO_API_KEY,
                        'Content-Type': 'application/json',
                        'accept': 'application/json'
                    }
                }
            );

            console.log('✅ Email sent successfully via Brevo:', response.data);
            return { messageId: response.data.messageId };
        } catch (error) {
            console.error('❌ Brevo Error:', error.response?.data || error.message);
            // Don't fallback, throw error so we know Brevo failed
            throw error;
        }
    }

    // OPTION 2: SendGrid (HTTP API - Works even if SMTP ports are blocked)
    if (process.env.SENDGRID_API_KEY) {
        console.log('🚀 Using SendGrid API (HTTP)...');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        const msg = {
            to: options.email,
            from: process.env.FROM_EMAIL || 'legalmate.services@gmail.com', // Must be verified in SendGrid
            subject: options.subject,
            text: options.message,
            html: options.html,
        };

        try {
            await sgMail.send(msg);
            console.log('✅ Email sent successfully via SendGrid');
            return { messageId: 'sendgrid-id' };
        } catch (error) {
            console.error('❌ SendGrid Error:', error);
            if (error.response) {
                console.error(error.response.body);
            }
            // Fallback to SMTP if SendGrid fails? No, usually if API key is there, we want to use it.
            throw error;
        }
    }

    // OPTION 2: Nodemailer (SMTP - May be blocked by cloud providers)
    console.log('  SMTP Config:', {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 465,
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.EMAIL_USER ? '***' : 'Missing',
    });

    // Use explicit config if available, otherwise fallback to service: 'gmail'
    const transportConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 5000, // 5 seconds timeout
        greetingTimeout: 5000,
        socketTimeout: 5000,
    };

    const transporter = nodemailer.createTransport(transportConfig);

    const message = {
        from: process.env.FROM_EMAIL || 'LegalMate Services <legalmate.services@gmail.com>',
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
    };

    try {
        const info = await transporter.sendMail(message);
        console.log('✅ Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Error sending email:', error);
        throw error;
    }
};

module.exports = sendEmail;
