// Envoi de SMS et WhatsApp via Twilio (https://www.twilio.com).
// Variables d'environnement : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
// TWILIO_SMS_FROM (ex. +33757000000 ou un nom d'expéditeur), TWILIO_WHATSAPP_FROM (ex. +14155238886).

function configure(canal) {
  const base = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN;
  if (!base) return false;
  if (canal === 'sms') return Boolean(process.env.TWILIO_SMS_FROM);
  if (canal === 'whatsapp') return Boolean(process.env.TWILIO_WHATSAPP_FROM);
  return false;
}

async function envoyer(canal, telephone, contenu) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = canal === 'whatsapp'
    ? `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`
    : process.env.TWILIO_SMS_FROM;
  const to = canal === 'whatsapp' ? `whatsapp:${telephone}` : telephone;

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: from, To: to, Body: contenu }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Twilio ${res.status} : ${data.message || 'erreur inconnue'}`);
  return data.sid;
}

module.exports = { configure, envoyer };
