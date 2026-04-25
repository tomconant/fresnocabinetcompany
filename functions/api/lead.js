const DEFAULT_TO_EMAIL = 'info@fresnocabinetcompany.com';
const DEFAULT_FROM_NAME = 'Fresno Cabinet Company';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clean(value) {
  return String(value || '').trim();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizePhone(value) {
  return clean(value);
}

function buildHtmlBody(fields) {
  const rows = [
    ['Name', fields.name],
    ['Email', fields.email],
    ['Phone', fields.phone || 'Not provided'],
    ['Project Type', fields.projectType || 'Not provided'],
    ['Project Location', fields.location || 'Not provided'],
    ['Source Page', fields.sourcePage || 'Unknown'],
    ['Submitted At', new Date().toISOString()],
  ];

  const rowsHtml = rows
    .map(([label, value]) => `
      <tr>
        <td style="padding:10px 12px;border:1px solid #ddd;font-weight:700;background:#f8f6f2;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:10px 12px;border:1px solid #ddd;vertical-align:top;">${escapeHtml(value)}</td>
      </tr>`)
    .join('');

  return `
    <div style="font-family:Arial,sans-serif;color:#171410;line-height:1.5;">
      <h2 style="margin:0 0 16px;">New Website Lead</h2>
      <table style="border-collapse:collapse;width:100%;max-width:720px;margin:0 0 18px;">
        ${rowsHtml}
      </table>
      <h3 style="margin:0 0 8px;">Project Details</h3>
      <div style="padding:14px 16px;border:1px solid #ddd;background:#fffdf8;white-space:pre-wrap;max-width:720px;">${escapeHtml(fields.message)}</div>
    </div>`;
}

function buildTextBody(fields) {
  return [
    'New Website Lead',
    '',
    `Name: ${fields.name}`,
    `Email: ${fields.email}`,
    `Phone: ${fields.phone || 'Not provided'}`,
    `Project Type: ${fields.projectType || 'Not provided'}`,
    `Project Location: ${fields.location || 'Not provided'}`,
    `Source Page: ${fields.sourcePage || 'Unknown'}`,
    `Submitted At: ${new Date().toISOString()}`,
    '',
    'Project Details:',
    fields.message,
  ].join('\n');
}

async function sendViaZeptoMail(env, fields) {
  const apiKey = env.ZEPTOMAIL_API_KEY;
  const fromEmail = env.ZEPTOMAIL_FROM_EMAIL;
  const toEmail = env.LEAD_NOTIFICATION_EMAIL || DEFAULT_TO_EMAIL;
  const fromName = env.ZEPTOMAIL_FROM_NAME || DEFAULT_FROM_NAME;

  if (!apiKey) {
    throw new Error('Missing ZEPTOMAIL_API_KEY secret.');
  }
  if (!fromEmail) {
    throw new Error('Missing ZEPTOMAIL_FROM_EMAIL variable.');
  }

  const subjectPrefix = env.LEAD_EMAIL_SUBJECT_PREFIX || 'New Website Lead';
  const sourceLabel = fields.sourcePage === 'index.html' ? 'Homepage Quote' : 'Contact Form';
  const subject = `${subjectPrefix} - ${sourceLabel} - ${fields.name}`;

  const payload = {
    from: {
      address: fromEmail,
      name: fromName,
    },
    to: [
      {
        email_address: {
          address: toEmail,
          name: 'Fresno Cabinet Company',
        },
      },
    ],
    subject,
    htmlbody: buildHtmlBody(fields),
    textbody: buildTextBody(fields),
  };

  const response = await fetch('https://api.zeptomail.com/v1.1/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `zoho-enczapikey ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`ZeptoMail request failed with ${response.status}: ${responseText}`);
  }

  return responseText;
}

export async function onRequestPost(context) {
  try {
    const formData = await context.request.formData();

    const website = clean(formData.get('website'));
    if (website) {
      return json({ ok: true, skipped: true });
    }

    const fields = {
      name: clean(formData.get('name')),
      email: clean(formData.get('email')),
      phone: normalizePhone(formData.get('phone')),
      projectType: clean(formData.get('project_type')),
      location: clean(formData.get('location')),
      message: clean(formData.get('message')),
      sourcePage: clean(formData.get('source_page')) || 'unknown',
    };

    if (!fields.name) {
      return json({ ok: false, error: 'Please enter your name.' }, 400);
    }
    if (!fields.email || !isValidEmail(fields.email)) {
      return json({ ok: false, error: 'Please enter a valid email address.' }, 400);
    }
    if (!fields.message) {
      return json({ ok: false, error: 'Please tell us about your project.' }, 400);
    }
    if (fields.sourcePage === 'contact.html' && !fields.phone) {
      return json({ ok: false, error: 'Please enter your phone number.' }, 400);
    }

    await sendViaZeptoMail(context.env, fields);

    return json({ ok: true });
  } catch (error) {
    console.error('Lead form error:', error);
    return json({ ok: false, error: 'There was a problem sending your request. Please try again.' }, 500);
  }
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Allow': 'POST, OPTIONS'
    }
  });
}
