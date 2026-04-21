# Fresno Cabinet Company Website

Static website package for Cloudflare Pages.

## Pages
- index.html
- kitchen-cabinets.html
- adu-packages.html
- built-in-cabinets.html
- in-home-design.html
- gallery.html
- contact.html

## Contact email
Forms currently use `mailto:info@fresnocabinetcompany.com`.

This is fine for local review, but before launch I recommend connecting the contact form to a form handler such as:
- Formspree
- Basin
- Tally
- Cloudflare Worker + Resend/Mailgun/SendGrid

## Phone number
No phone number is included.

## Cloudflare Pages upload
1. Unzip this folder.
2. In Cloudflare Pages, create a new project.
3. Upload the folder contents.
4. Set your custom domain to fresnocabinetcompany.com.
5. Test every page and the contact form.

## Image structure
Gallery images are stored locally:
- assets/gallery/thumbs/
- assets/gallery/full/
