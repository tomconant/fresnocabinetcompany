# Cloudflare + Zoho lead form setup

This site is configured so `index.html` and `contact.html` submit to `/api/lead`, which is handled by a Cloudflare Pages Function at `functions/api/lead.js`.

## What you need

1. A Cloudflare Pages project deployed with **Functions enabled**.
2. A Zoho **ZeptoMail** agent and send-mail token.
3. A verified sender address in ZeptoMail for your domain.

## Required Cloudflare Pages variables

In Cloudflare dashboard:
**Workers & Pages -> your Pages project -> Settings -> Variables and Secrets**

Add these:

### Secrets
- `ZEPTOMAIL_API_KEY` = your ZeptoMail send mail token

### Variables
- `ZEPTOMAIL_FROM_EMAIL` = sender address verified in ZeptoMail (example: `info@fresnocabinetcompany.com`)
- `LEAD_NOTIFICATION_EMAIL` = `info@fresnocabinetcompany.com`
- `ZEPTOMAIL_FROM_NAME` = `Fresno Cabinet Company`
- `LEAD_EMAIL_SUBJECT_PREFIX` = `New Website Lead`

## ZeptoMail token

In ZeptoMail:
**Agent -> SMTP/API -> API tab -> copy Send Mail Token**

## Important deployment note

Cloudflare Pages Functions do **not** work with dashboard Direct Upload. Deploy this site by Git integration or Wrangler.

## What happens after setup

- Homepage form and contact form both submit to `/api/lead`
- Cloudflare Pages Function sends a transactional email through ZeptoMail
- The message is delivered to `info@fresnocabinetcompany.com`
- On success, the visitor is redirected to `/thank-you.html`

## Optional later improvements

- Add Cloudflare Turnstile for stronger spam protection
- Save leads in D1 in addition to email
- Send a copy to another address like your personal email
