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

function fakeSuccess() {
  return json({ ok: true });
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

function countLinks(text) {
  const matches = String(text || '').match(
    /\b(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|info|biz|co|io|ru|cn|top|xyz|click|site|online)\b)/gi
  );
  return matches ? matches.length : 0;
}

function hasExcessiveRepeatingText(text) {
  const value = String(text || '').toLowerCase();

  if (/(.)\1{8,}/.test(value)) return true;

  const words = value
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length < 12) return false;

  const counts = {};
  for (const word of words) {
    counts[word] = (counts[word] || 0) + 1;
    if (word.length > 3 && counts[word] >= 6) return true;
  }

  return false;
}

function getSpamScore(formData, fields, request) {
  let score = 0;

  const hiddenTrapFields = [
    'website',
    'company',
    'url',
    'homepage',
    'address2',
    'fax',
    'confirm_email'
  ];

  for (const trap of hiddenTrapFields) {
    if (clean(formData.get(trap))) {
      score += 50;
    }
  }

  const combinedText = [
    fields.name,
    fields.email,
    fields.phone,
    fields.projectType,
    fields.location,
    fields.message,
    fields.sourcePage
  ].join(' ');

  const message = fields.message || '';
  const name = fields.name || '';
  const email = fields.email || '';
  const emailDomain = email.includes('@') ? email.split('@').pop() : '';

  const spamPatterns = [
    // Known spammer / fake-name pattern
    [/robert\s*phype/i, 20],

    // SEO / backlink spam
    [/\bseo\b|search engine optimization|backlinks?|link[-\s]?building|guest\s+post|domain authority|organic traffic|website traffic|google ranking|rank(?:ing)?\s+(?:your|on|higher)|first page of google/i, 10],

    // Marketing/service spam
    [/web(?:site)? design|web development|app development|digital marketing|marketing agency|social media marketing|lead generation|cold email|email marketing|content marketing/i, 8],

    // Obvious junk industries
    [/casino|gambling|crypto|bitcoin|forex|payday loan|debt relief|debt consolidation|viagra|cialis|porn|escort|adult dating/i, 20],

    // Generic spam language
    [/dear\s+(sir|madam|admin|webmaster)|hello\s+(sir|admin|webmaster)|i noticed (your|that your) website|we can help your business|boost your business|increase your sales|more traffic to your website/i, 6],

    // Messaging app spam
    [/whatsapp|telegram|skype|t\.me\//i, 5],

    // HTML/script injection
    [/<script|<\/script|<iframe|<\/iframe|<a\s+href|<\/a>/i, 15]
  ];

  for (const [pattern, points] of spamPatterns) {
    if (pattern.test(combinedText)) {
      score += points;
    }
  }

  const linkCount = countLinks(combinedText);
  if (linkCount >= 1) score += 2;
  if (linkCount >= 2) score += 6;
  if (linkCount >= 4) score += 20;

  if (message.length > 3000) score += 8;
  if (message.length > 8000) score += 25;

  if (hasExcessiveRepeatingText(combinedText)) {
    score += 10;
  }

  const lettersOnly = message.replace(/[^a-zA-Z]/g, '');
  const uppercaseOnly = message.replace(/[^A-Z]/g, '');
  if (lettersOnly.length > 40 && uppercaseOnly.length / lettersOnly.length > 0.75) {
    score += 4;
  }

  // Weird fake-name patterns. Not enough alone to block, but contributes.
  if (/\d/.test(name)) score += 6;
  if (name.length > 45) score += 5;
  if (/^[A-Za-z]{12,}$/.test(name) && !/\s/.test(name)) score += 4;
  if (/^[A-Z][a-z]+[A-Z][a-z]+$/.test(name)) score += 4;

  // Suspicious email TLDs. Not enough alone to block.
  if (/\.(ru|cn|top|xyz|click|buzz|work|icu|rest)$/i.test(emailDomain)) {
    score += 4;
  }

  // If your updated HTML sends these, use them. Do not require them because old cached pages may not have them.
  const formLoadedAt = Number(clean(formData.get('form_loaded_at')));
  if (formLoadedAt) {
    const secondsOnPage = (Date.now() - formLoadedAt) / 1000;
    if (secondsOnPage >= 0 && secondsOnPage < 4) {
      score += 6;
    }
  }

  const jsCheck = clean(formData.get('js_check'));
  if (jsCheck && jsCheck !== 'passed') {
    score += 6;
  }

  // Bad origin/referrer. Do not penalize missing headers because some browsers/extensions strip them.
  const origin = request.headers.get('Origin') || '';
  const referer = request.headers.get('Referer') || '';

  const allowedHosts = [
    'https://fresnocabinetcompany.com',
    'https://www.fresnocabinetcompany.com'
  ];

  if (origin && !allowedHosts.some(host => origin.startsWith(host))) {
    score += 10;
  }

  if (
    referer &&
    !allowedHosts.some(host => referer.startsWith(host)) &&
    !referer.includes('.pages.dev')
  ) {
    score += 10;
  }

  return score;
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

function normalizeApiKey(raw) {
  return String(raw || '')
    .trim()
    .replace(/^zoho-enczapikey\s+/i, '');
}

async function sendViaZeptoMail(env, fields) {
  const apiKey = normalizeApiKey(env.ZEPTOMAIL_API_KEY);
  const fromEmail = clean(env.ZEPTOMAIL_FROM_EMAIL);
  const toEmail = clean(env.LEAD_NOTIFICATION_EMAIL) || DEFAULT_TO_EMAIL;
  const fromName = clean(env.ZEPTOMAIL_FROM_NAME) || DEFAULT_FROM_NAME;

  if (!apiKey) {
    throw new Error('Missing ZEPTOMAIL_API_KEY secret.');
  }
  if (!fromEmail) {
    throw new Error('Missing ZEPTOMAIL_FROM_EMAIL variable.');
  }

  const subjectPrefix = clean(env.LEAD_EMAIL_SUBJECT_PREFIX) || 'New Website Lead';
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
      'Authorization': `Zoho-enczapikey ${apiKey}`,
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

    const fields = {
      name: clean(formData.get('name')),
      email: clean(formData.get('email')),
      phone: normalizePhone(formData.get('phone')),
      projectType: clean(formData.get('project_type')),
      location: clean(formData.get('location')),
      message: clean(formData.get('message')),
      sourcePage: clean(formData.get('source_page')) || 'unknown',
    };

    const spamScore = getSpamScore(formData, fields, context.request);

    if (spamScore >= 8) {
      console.log(`Spam lead silently dropped. Score: ${spamScore}`);
      return fakeSuccess();
    }

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
