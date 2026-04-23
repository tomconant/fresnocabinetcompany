window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }

gtag('js', new Date());
gtag('config', 'AW-18104279871');

function trackEvent(eventName, params = {}) {
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, params);
  }
}

function firePrimaryLeadConversion() {
  const KEY = 'fcc_primary_lead_fired';
  const pathKey = `${KEY}:${window.location.pathname}`;
  if (sessionStorage.getItem(pathKey) === '1') return;

  const conversionLabel = 'REPLACE_WITH_GOOGLE_ADS_CONVERSION_LABEL';
  if (conversionLabel !== 'REPLACE_WITH_GOOGLE_ADS_CONVERSION_LABEL') {
    gtag('event', 'conversion', {
      send_to: `AW-18104279871/${conversionLabel}`
    });
  }

  sessionStorage.setItem(pathKey, '1');
}

function trackEmailClick(email) {
  trackEvent('contact_email_click', { email: email || '' });
}

function trackPhoneClick(phone) {
  trackEvent('contact_phone_click', { phone: phone || '' });
}

function trackConsultationCTAClick(location = '') {
  trackEvent('cta_consultation_click', { location });
}

window.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
    link.classList.add('js-track-email');
    link.addEventListener('click', () => trackEmailClick(link.getAttribute('href').replace('mailto:', '')));
  });

  document.querySelectorAll('a[href^="tel:"]').forEach(link => {
    link.addEventListener('click', () => trackPhoneClick(link.getAttribute('href').replace('tel:', '')));
  });

  document.querySelectorAll('.js-track-consultation').forEach(link => {
    link.addEventListener('click', () => {
      trackConsultationCTAClick(link.dataset.trackLocation || 'unknown');
    });
  });
});
