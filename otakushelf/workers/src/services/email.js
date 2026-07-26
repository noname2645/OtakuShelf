export async function sendMail({ from, to, subject, html }, env) {
  const apiKey = env.BREVO_API_KEY
  if (!apiKey) {
    console.warn('[Email] No BREVO_API_KEY configured — skipping email')
    return false
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { name: 'OtakuShelf', email: from || env.EMAIL_FROM || 'noreply@otakushelf.com' },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`[Email] Brevo error (${res.status}): ${text}`)
    return false
  }

  return true
}

export function buildEmailHtml(title, body, options = {}) {
  const { icon = '', isOtp = false, otpCode = '' } = options
  const otpSection = isOtp ? `
    <div style="text-align:center;margin:30px 0">
      <div style="font-size:32px;letter-spacing:8px;font-weight:700;color:#FFD700;background:#1a1d24;padding:20px 30px;border-radius:12px;display:inline-block;font-family:monospace">
        ${otpCode}
      </div>
      <p style="color:#888;font-size:13px;margin-top:12px">This code expires in 10 minutes</p>
    </div>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0b0e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0b0e;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#12141a;border-radius:16px;overflow:hidden">
        <tr><td style="padding:40px 35px 20px;text-align:center">
          <h1 style="color:#fff;font-size:24px;margin:0 0 5px;font-weight:600">OtakuShelf</h1>
          <p style="color:#666;font-size:13px;margin:0 0 25px">Your Anime Universe</p>
          <div style="background:linear-gradient(135deg,#FFD700,#FFA500);border-radius:8px;padding:12px 25px;display:inline-block;margin-bottom:25px">
            <span style="font-size:18px">${icon}</span>
            <span style="font-weight:700;font-size:16px;color:#000;margin-left:8px">${title}</span>
          </div>
          <div style="color:#ccc;font-size:15px;line-height:1.7;text-align:left">
            ${body}
          </div>
          ${otpSection}
        </td></tr>
        <tr><td style="padding:20px 35px;text-align:center;border-top:1px solid #1e2128">
          <p style="color:#555;font-size:12px;margin:0">OtakuShelf &mdash; Your Anime Universe</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
