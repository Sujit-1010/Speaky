const nodemailer = require('nodemailer');

const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || '';
const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
const supportEmail = process.env.SUPPORT_EMAIL || smtpUser;

let transporter = null;

if (smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });

    // Verify transporter once on startup for clearer diagnostics
    transporter.verify((err, success) => {
        if (err) {
            console.error('Mailer verify failed:', err && err.message ? err.message : err);
        } else {
            console.log('Mailer verified and ready to send:', success);
        }
    });
} else {
    console.warn('Mailer not configured: missing SMTP_USER or SMTP_PASS env vars');
}

async function sendTournamentRegistrationEmail({ to, userName, tournament, password, registrationId }) {
    if (!transporter) {
        const msg = 'Email transporter not configured. Set SMTP_USER/SMTP_PASS and restart the server.';
        console.error(msg);
        throw new Error(msg);
    }
    if (!to) {
        throw new Error('Missing recipient email address');
    }
    if (!tournament) {
        throw new Error('Missing tournament details for email');
    }

    const subject = `🎮 Tournament Registration Confirmed – ${tournament.name}`;
    const dateText = tournament.start_date ? new Date(tournament.start_date).toLocaleString() : 'TBA';
    const rulesText = tournament.rules || 'Follow the instructions shared by your organizer.';

    const text = [
        `Hello ${userName || ''},`,
        `Congratulations! You have successfully registered for the tournament.`,
        `--- Tournament Details ---`,
        `Tournament Name: ${tournament.name}`,
        `Tournament ID: ${tournament.tournament_id}`,
        `Tournament Password: ${password}`,
        `Date & Time: ${dateText}`,
        `Rules: ${rulesText}`,
        `Support Email: ${supportEmail}`,
        `Registration ID: ${registrationId}`,
        `Keep this information safe. You will need the Tournament ID and Password to enter the lobby.`,
        `Thank you for joining and best of luck!`,
        `Regards,`,
        `Tournament Management Team`,
    ].join('\n');

    const html = `
    <p>Hello ${userName || ''},</p>
    <p>Congratulations! You have successfully registered for the tournament.</p>
    <p>--- Tournament Details ---</p>
    <ul>
      <li><strong>Tournament Name:</strong> ${tournament.name}</li>
      <li><strong>Tournament ID:</strong> ${tournament.tournament_id}</li>
      <li><strong>Tournament Password:</strong> ${password}</li>
      <li><strong>Date &amp; Time:</strong> ${dateText}</li>
      <li><strong>Rules:</strong> ${rulesText}</li>
      <li><strong>Support Email:</strong> ${supportEmail}</li>
      <li><strong>Registration ID:</strong> ${registrationId}</li>
    </ul>
    <p>Keep this information safe. You will need the Tournament ID and Password to enter the lobby.</p>
    <p>Thank you for joining and best of luck!</p>
    <p>Regards,<br/>Tournament Management Team</p>
  `;

    try {
        const info = await transporter.sendMail({
            from: smtpUser,
            to,
            subject,
            text,
            html,
            replyTo: supportEmail || smtpUser,
        });
        console.log('Tournament email sent:', info && info.messageId ? info.messageId : info);
        return info;
    } catch (err) {
        console.error('Error sending tournament email:', err && err.message ? err.message : err);
        throw err;
    }
}

async function sendJudgeInviteEmail({ to, judgeName, tournament, inviteUrl }) {
    if (!transporter) {
        const msg = 'Email transporter not configured. Set SMTP_USER/SMTP_PASS and restart the server.';
        console.error(msg);
        throw new Error(msg);
    }
    if (!to || !tournament || !inviteUrl) {
        throw new Error('Missing fields for judge invite email');
    }
    const subject = `Judge Invite – ${tournament.name}`;
    const text = [
        `Hello ${judgeName || ''},`,
        `You are invited to judge the tournament "${tournament.name}".`,
        `Organizer: ${tournament.organizer || 'N/A'}`,
        `Open the link to access the judge panel in read-only mode:`,
        `${inviteUrl}`,
        `Support Email: ${supportEmail}`,
    ].join('\n');
    const html = `
    <p>Hello ${judgeName || ''},</p>
    <p>You are invited to judge the tournament <strong>${tournament.name}</strong>.</p>
    <p>Organizer: ${tournament.organizer || 'N/A'}</p>
    <p><a href="${inviteUrl}">Open Judge Panel</a> (read-only)</p>
    <p>Support: ${supportEmail}</p>
  `;
    const info = await transporter.sendMail({ from: smtpUser, to, subject, text, html, replyTo: supportEmail || smtpUser });
    return info;
}

async function sendTimeSlotEmail({ to, userName, tournament, groupNumber, roomCode, timeSlot }) {
    if (!transporter) {
        const msg = 'Email transporter not configured. Set SMTP_USER/SMTP_PASS and restart the server.';
        console.error(msg);
        throw new Error(msg);
    }
    if (!to || !tournament || !timeSlot) {
        throw new Error('Missing fields for time slot email');
    }
    const subject = `Your time slot – ${tournament.name}`;
    const text = [
        `Hello ${userName || ''},`,
        `Here are your details:`,
        `Tournament: ${tournament.name}`,
        `Group: ${groupNumber || 'TBA'}`,
        `Lobby: ${roomCode || 'TBA'}`,
        `Time: ${new Date(timeSlot).toLocaleString()}`,
        `Support Email: ${supportEmail}`,
    ].join('\n');
    const html = `
    <p>Hello ${userName || ''},</p>
    <p>Here are your schedule details:</p>
    <ul>
      <li><strong>Tournament:</strong> ${tournament.name}</li>
      <li><strong>Group:</strong> ${groupNumber || 'TBA'}</li>
      <li><strong>Lobby:</strong> ${roomCode || 'TBA'}</li>
      <li><strong>Time:</strong> ${new Date(timeSlot).toLocaleString()}</li>
      <li><strong>Support:</strong> ${supportEmail}</li>
    </ul>
  `;
    const info = await transporter.sendMail({ from: smtpUser, to, subject, text, html, replyTo: supportEmail || smtpUser });
    return info;
}

async function sendVerificationEmail({ to, userName, verificationUrl }) {
    if (!transporter) {
        const msg = 'Email transporter not configured. Set SMTP_USER/SMTP_PASS and restart the server.';
        console.error(msg);
        throw new Error(msg);
    }
    if (!to || !verificationUrl) {
        throw new Error('Missing recipient or verification URL for email');
    }
    const subject = 'Verify your email address - SpeakUp';
    const text = [
        `Hello ${userName || ''},`,
        `Thank you for registering with SpeakUp!`,
        `Please confirm your email address by clicking the link below:`,
        `${verificationUrl}`,
        `This link will expire in 24 hours. If you did not sign up for an account, please ignore this email.`,
        `Support: ${supportEmail}`,
    ].join('\n');
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px;">
      <h2 style="color: #a855f7; margin-top: 0;">Welcome to SpeakUp!</h2>
      <p>Hello ${userName || ''},</p>
      <p>Thank you for signing up. Please verify your email address to activate your account and start practicing.</p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${verificationUrl}" style="background: linear-gradient(to right, #9333ea, #2563eb); color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Verify Email Address</a>
      </div>
      <p style="font-size: 13px; color: #94a3b8;">Or copy and paste this link into your browser:</p>
      <p style="font-size: 13px; color: #60a5fa; word-break: break-all;">${verificationUrl}</p>
      <p style="font-size: 12px; color: #64748b; margin-top: 30px; border-top: 1px solid #1e293b; padding-top: 15px;">This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
    </div>
    `;
    const info = await transporter.sendMail({ from: smtpUser, to, subject, text, html, replyTo: supportEmail || smtpUser });
    return info;
}

module.exports = {
    sendTournamentRegistrationEmail,
    sendJudgeInviteEmail,
    sendTimeSlotEmail,
    sendVerificationEmail,
};

