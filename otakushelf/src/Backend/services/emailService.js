import axios from 'axios';

const parseFromAddress = (fromStr) => {
  const match = fromStr.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
  if (match) return { name: match[1]?.trim() || '', email: match[2] };
  return { name: '', email: fromStr };
};

let emailSenderPromise = null;

const getEmailSender = async () => {
  if (!emailSenderPromise) {
    emailSenderPromise = (async () => {
      return {
        sendMail: async ({ from, to, subject, html }) => {
          const sender = parseFromAddress(from);
          try {
            const res = await axios.post('https://api.brevo.com/v3/smtp/email', {
              sender: { name: sender.name, email: sender.email },
              to: [{ email: to }],
              subject,
              htmlContent: html,
            }, {
              headers: {
                'api-key': process.env.BREVO_API_KEY || process.env.EMAIL_PASS,
                'Content-Type': 'application/json',
              },
              timeout: 15000,
            });
            console.log(`✅ Email sent via Brevo API to ${to}`);
            return res.data;
          } catch (apiErr) {
            const detail = apiErr.response?.data?.message || apiErr.message;
            console.error(`❌ Brevo API email failed: ${detail}`);
            throw new Error(`Failed to send email: ${detail}`);
          }
        },
      };
    })();
  }
  return await emailSenderPromise;
};

const buildEmailHtml = ({ title, greeting = 'Hey there, Otaku!', isOtp = false, otpCode = '', body, icon = '🔐' }) => `
  <div style="background:#0a0b0e;padding:32px 16px;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table align="center" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;margin:0 auto;border-collapse:separate;border-spacing:0">
      <tr>
        <td style="padding:0 0 24px;text-align:center">
          <table cellpadding="0" cellspacing="0" style="margin:0 auto">
            <tr>
              <td style="background:linear-gradient(135deg,#ff6b6b,#ff4757);border-radius:12px;padding:8px 18px;font-size:13px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:1.5px">
                ${icon} ${title}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="background:#12141a;border:1px solid rgba(255,255,255,0.06);border-radius:20px;padding:40px 36px 32px">
          <div style="text-align:center;margin-bottom:28px;line-height:1">
            <span style="font-family:'Outfit',sans-serif;font-size:32px;font-weight:800;color:#f1f5f9;letter-spacing:-0.5px">Otaku</span><span style="font-family:'Outfit',sans-serif;font-size:32px;font-weight:800;color:#FFD700;letter-spacing:-0.5px">Shelf</span>
          </div>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#e2e8f0">${greeting}</p>
          <div style="font-size:14px;line-height:1.8;color:#94a3b8">${body}</div>
          ${isOtp && otpCode ? `
          <div style="background:rgba(255,107,107,0.06);border:1px solid rgba(255,107,107,0.15);border-radius:14px;padding:24px;margin:28px 0;text-align:center">
            <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#ff6b6b;text-transform:uppercase;letter-spacing:2px">Verification Code</p>
            <div style="font-family:'Space Grotesk','Courier New',monospace;font-size:32px;font-weight:700;color:#fff;letter-spacing:12px;margin:0">${otpCode}</div>
            <p style="margin:14px 0 0;font-size:12px;color:#64748b">Expires in 10 minutes</p>
          </div>` : ''}
          <div style="border-top:1px solid rgba(255,255,255,0.04);margin:28px 0 16px"></div>
          <p style="margin:0;font-size:11px;line-height:1.6;color:rgba(255,255,255,0.25);text-align:center;text-transform:uppercase;letter-spacing:0.5px">
            OtakuShelf &mdash; Your Anime Universe
          </p>
        </td>
      </tr>
    </table>
  </div>
`;

const sendSecurityEmail = async (email, type, data = {}) => {
  try {
    let subject = '🔐 OtakuShelf — Security Alert';
    let title = 'Security Alert';
    let body = '';
    let icon = '🔐';
    let isOtp = false;
    let otpCode = '';

    if (type === 'otp') {
      subject = `${data.action} Verification Code`;
      title = `${data.action} Verification`;
      icon = '🔑';
      isOtp = true;
      otpCode = data.otp;
      body = 'Enter this code to authorize the action. Never share this code with anyone.';
    } else if (type === 'mfa_enabled') {
      subject = '2FA Successfully Enabled';
      title = 'Two-Factor Authentication Enabled';
      icon = '🛡️';
      body = 'Two-Factor Authentication has been successfully enabled on your <strong>OtakuShelf</strong> account. Your account is now more secure.';
    } else if (type === 'mfa_disabled') {
      subject = '2FA Successfully Disabled';
      title = 'Two-Factor Authentication Disabled';
      icon = '⚠️';
      body = 'Two-Factor Authentication has been disabled on your <strong>OtakuShelf</strong> account. If you did not make this change, please contact support immediately.';
    } else if (type === 'password_changed') {
      subject = 'Password Changed Successfully';
      title = 'Password Changed';
      icon = '🔒';
      body = 'The password for your <strong>OtakuShelf</strong> account was recently changed. If you did not make this change, please contact support immediately.';
    } else if (type === 'account_deleted') {
      subject = 'Account Deleted';
      title = 'Account Deleted';
      icon = '👋';
      body = 'Your account and all associated data have been permanently removed. We\'re sad to see you go! If you change your mind, you can always create a new account.';
    }

    await (await getEmailSender()).sendMail({
      from: `"OtakuShelf" <${process.env.EMAIL_FROM || 'noreply@otakushelf.com'}>`,
      to: email,
      subject,
      html: buildEmailHtml({ title, body, icon, isOtp, otpCode }),
    });
    return true;
  } catch (err) {
    console.error('Email sending failed:', err);
    return false;
  }
};

export { getEmailSender, buildEmailHtml, sendSecurityEmail };
