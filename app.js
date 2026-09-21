import { contact } from './site-config.js';

const $ = (selector) => document.querySelector(selector);
const year = $('#year');
if (year) year.textContent = new Date().getFullYear();
const menuToggle = $('#menu-toggle');
const mobileNav = $('#mobile-nav');

function closeMenu() {
  mobileNav.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation');
}

menuToggle.addEventListener('click', () => {
  const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
  mobileNav.hidden = expanded;
  menuToggle.setAttribute('aria-expanded', String(!expanded));
  menuToggle.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
});
mobileNav.addEventListener('click', (event) => {
  if (event.target.closest('a, button')) closeMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !mobileNav.hidden) {
    closeMenu();
    menuToggle.focus();
  }
});
matchMedia('(min-width: 800px)').addEventListener('change', (event) => {
  if (event.matches) closeMenu();
});

const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !motionPreference.matches) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  reveals.forEach((element) => observer.observe(element));
} else {
  reveals.forEach((element) => element.classList.add('visible'));
}

document.querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((item) => {
      const selected = item === button;
      item.setAttribute('aria-pressed', String(selected));
      item.classList.toggle('active', selected);
    });
    document.querySelectorAll('.project-card[data-category]').forEach((card) => {
      card.hidden = filter !== 'all' && !card.dataset.category.split(' ').includes(filter);
      if (!card.hidden) card.classList.add('visible');
    });
  });
});

const contactDialog = $('#contact-dialog');
const projectDialog = $('#project-dialog');
const projectBody = $('#project-dialog-body');
const contactForm = $('#contact-form');
const contactStatus = $('#contact-status');
const contactSubmit = $('#contact-submit');
const configuredEmail = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(contact.email) ? contact.email : '';
let bookingUrl = '';
try {
  const url = new URL(contact.bookingUrl);
  if (url.protocol === 'https:') bookingUrl = url.href;
} catch {
  // An empty booking URL keeps the project brief available until launch.
}
const contactBookCall = $('#contact-book-call');
if (contactBookCall) contactBookCall.hidden = !bookingUrl;
let contactIntent = 'Free demo';

function openContact(mode, fromAura = false) {
  closeMenu();
  if (mode === 'call' && bookingUrl) {
    window.open(bookingUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  if (projectDialog.open) projectDialog.close();
  contactIntent = mode === 'call' ? 'Project call' : 'Free demo';
  $('#contact-title').textContent = mode === 'call' ? 'Let’s make it happen.' : 'Your next chapter starts here.';
  $('#contact-intro').textContent = configuredEmail
    ? 'Tell us a little about your idea. We’ll prepare an email in your mail app so you can review it and send it to PixxelMind.'
    : 'Shape your idea into a project brief. You can download a copy to keep; this preview does not send your details to PixxelMind.';
  if (configuredEmail) {
    const emailLink = document.createElement('a');
    emailLink.href = `mailto:${configuredEmail}`;
    emailLink.textContent = configuredEmail;
    $('#contact-intro').append(' You can also email us at ', emailLink, '.');
  }
  contactSubmit.textContent = configuredEmail ? 'Prepare your email ↗' : 'Download project brief ↗';
  contactStatus.textContent = '';
  if (fromAura) {
    const recommendation = auraGoals[auraAnswers[0] ?? 0];
    contactForm.elements.service.value = recommendation.service;
    contactForm.elements.message.value = `I’d like a free demo focused on ${recommendation.label.toLowerCase()}. ${auraQuestions[1].options[auraAnswers[1] ?? 0]}. Timeline: ${auraQuestions[2].options[auraAnswers[2] ?? 0]}.`;
  }
  if (!contactDialog.open) contactDialog.showModal();
}

contactForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!contactForm.reportValidity()) return;
  const values = new FormData(contactForm);
  const brief = [
    'PIXXELMIND — PROJECT BRIEF',
    '',
    `Interested in: ${contactIntent}`,
    `Name: ${values.get('name') || ''}`,
    `Email: ${values.get('email') || ''}`,
    `Website: ${values.get('website') || 'Not provided'}`,
    `Service: ${contactForm.elements.service.selectedOptions?.[0]?.textContent || values.get('service') || 'Let’s explore'}`,
    '',
    'The idea:',
    String(values.get('message') || 'Let’s explore the possibilities together.'),
  ].join('\n');
  if (configuredEmail) {
    const query = new URLSearchParams({ subject: `${contactIntent} — ${values.get('name')}`, body: brief });
    window.location.href = `mailto:${configuredEmail}?${query.toString().replace(/\+/g, '%20')}`;
    contactStatus.textContent = 'Your mail app has been requested. Review and send the email there; this website has not submitted your brief.';
  } else {
    const fileUrl = URL.createObjectURL(new Blob([`${brief}\n\nSaved locally. This brief has not been submitted to PixxelMind.\n`], { type: 'text/plain;charset=utf-8' }));
    const download = document.createElement('a');
    download.href = fileUrl;
    download.download = 'pixxelmind-project-brief.txt';
    document.body.append(download);
    download.click();
    download.remove();
    setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
    contactStatus.textContent = 'Your brief is ready in your downloads. Nothing has been submitted to PixxelMind.';
  }
});

const auraGoals = [
  { label: 'A more engaging website', service: 'website', title: 'A website worth staying for.', description: 'A distinctive, fast website with a clear path from first impression to first conversation.' },
  { label: 'More qualified leads', service: 'ai', title: 'Every visit, a better conversation.', description: 'An AI lead assistant that helps visitors find the right service, captures their intent, and gives your team useful context.' },
  { label: 'Less repetitive work', service: 'automation', title: 'Let the busywork take care of itself.', description: 'A connected workflow that organizes new inquiries, routes the right details, and prepares the next action for your team.' },
];
const auraQuestions = [
  { title: 'What would move your business forward?', options: auraGoals.map((goal) => goal.label) },
  { title: 'Where are you today?', options: ['Starting something new', 'Growing an existing business', 'Scaling an established team'] },
  { title: 'When would you like to get started?', options: ['As soon as possible', 'In the next 1–3 months', 'Exploring what’s possible'] },
];
let auraAnswers = [];
let flowStep = 0;
const flowSteps = [
  { title: 'A new inquiry arrives.', label: '01 / CAPTURE', detail: 'A visitor asks for a website refresh. Relay collects their project details in one place.', detailLabel: 'Incoming inquiry', detailValue: 'Website refresh · Design studio', next: 'Qualify the inquiry' },
  { title: 'The right context, organized.', label: '02 / QUALIFY', detail: 'The inquiry is grouped by service, project timing, and the information your team needs to respond.', detailLabel: 'Intent identified', detailValue: 'Website · Ready this quarter', next: 'Route to the team' },
  { title: 'The right person gets the brief.', label: '03 / ROUTE', detail: 'An organized summary reaches the project team, ready for a useful first conversation.', detailLabel: 'Ready for review', detailValue: 'Project team · Brief prepared', next: 'Prepare the follow-up' },
  { title: 'A thoughtful next step.', label: '04 / FOLLOW UP', detail: 'A personalized follow-up is prepared for the team to review. This concept sends no messages or personal data.', detailLabel: 'Next action', detailValue: 'Review the draft · Book a discovery call', next: 'Replay the workflow' },
];

function renderAura(focus = false) {
  const step = auraAnswers.length;
  if (step < auraQuestions.length) {
    const question = auraQuestions[step];
    projectBody.innerHTML = `
      <div class="demo-eyebrow">AURA · INTERACTIVE CONCEPT</div>
      <p class="demo-intro">A little context. A more personal starting point.</p>
      <div class="demo-progress" aria-label="Question ${step + 1} of 3">${auraQuestions.map((_, index) => `<span class="${index <= step ? 'is-complete' : ''}"></span>`).join('')}</div>
      <p class="demo-step">QUESTION 0${step + 1} / 03</p>
      <h3 class="demo-question" tabindex="-1">${question.title}</h3>
      <div class="demo-choices">${question.options.map((option, index) => `<button class="demo-choice" type="button" data-aura-answer="${index}"><span>${option}</span><span aria-hidden="true">↗</span></button>`).join('')}</div>
      <p class="demo-note">A guided concept preview. Your answers stay here.</p>`;
  } else {
    const goal = auraGoals[auraAnswers[0]];
    projectBody.innerHTML = `
      <div class="demo-eyebrow">AURA · YOUR STARTING POINT</div>
      <div class="demo-result-icon" aria-hidden="true">✳</div>
      <h3 class="demo-question" tabindex="-1">${goal.title}</h3>
      <p class="demo-intro">${goal.description}</p>
      <div class="demo-summary"><span>${auraQuestions[1].options[auraAnswers[1]]}</span><span>${auraQuestions[2].options[auraAnswers[2]]}</span></div>
      <button class="button button-primary btn btn-primary" type="button" data-contact="demo" data-brief="aura">Explore your free demo <span aria-hidden="true">↗</span></button>
      <button class="demo-reset" type="button" data-aura-reset>Start again</button>
      <p class="demo-note">Concept interaction. A full assistant would connect to your services and knowledge.</p>`;
  }
  if (focus) projectBody.querySelector('.demo-question').focus({ preventScroll: true });
}

function renderFlow(focus = false) {
  const step = flowSteps[flowStep];
  projectBody.innerHTML = `
    <div class="demo-eyebrow">RELAY · INTERACTIVE CONCEPT</div>
    <p class="demo-intro">From new inquiry to useful next step. Try the flow.</p>
    <div class="demo-progress" aria-label="Step ${flowStep + 1} of 4">${flowSteps.map((_, index) => `<span class="${index <= flowStep ? 'is-complete' : ''}"></span>`).join('')}</div>
    <p class="demo-step">${step.label}</p>
    <h3 class="demo-question" tabindex="-1">${step.title}</h3>
    <p class="demo-intro">${step.detail}</p>
    <div class="flow-payload"><span class="flow-status-dot" aria-hidden="true"></span><div><span>${step.detailLabel}</span><strong>${step.detailValue}</strong></div></div>
    <button class="button button-primary btn btn-primary" type="button" data-flow-next>${step.next} <span aria-hidden="true">↗</span></button>
    <p class="demo-note">A simulated workflow. No external tools are connected.</p>`;
  if (focus) projectBody.querySelector('.demo-question').focus({ preventScroll: true });
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button, a');
  if (!button) return;
  if (button.hasAttribute('data-contact')) {
    event.preventDefault();
    if (button.id === 'floating-contact') contactDialog.dataset.presentation = 'corner';
    else if (button !== contactBookCall) delete contactDialog.dataset.presentation;
    openContact(button.dataset.contact, button.dataset.brief === 'aura');
  } else if (button.hasAttribute('data-project')) {
    if (!['aura', 'flow'].includes(button.dataset.project)) return;
    event.preventDefault();
    auraAnswers = [];
    flowStep = 0;
    const isAura = button.dataset.project === 'aura';
    $('#project-dialog-title').textContent = isAura ? 'Meet Aura.' : 'Meet Relay.';
    if (isAura) renderAura();
    else renderFlow();
    projectDialog.showModal();
  } else if (button.hasAttribute('data-close')) {
    button.closest('dialog')?.close();
  } else if (button.hasAttribute('data-aura-answer')) {
    auraAnswers.push(Number(button.dataset.auraAnswer));
    renderAura(true);
  } else if (button.hasAttribute('data-aura-reset')) {
    auraAnswers = [];
    renderAura(true);
  } else if (button.hasAttribute('data-flow-next')) {
    flowStep = (flowStep + 1) % flowSteps.length;
    renderFlow(true);
  }
});

[contactDialog, projectDialog].forEach((dialog) => {
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
});

const motionToggle = $('.motion-toggle');
const motionLabel = motionToggle && [...motionToggle.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
let motionPaused = motionPreference.matches;
function updateMotion() {
  document.body.classList.toggle('motion-paused', motionPaused);
  motionToggle?.setAttribute('aria-pressed', String(motionPaused));
  motionToggle?.setAttribute('aria-label', motionPaused ? 'Play visual animations' : 'Pause visual animations');
  if (motionToggle) motionToggle.title = motionPaused ? 'Play animations' : 'Pause animations';
  if (motionLabel) motionLabel.textContent = motionPaused ? ' Play motion' : ' Pause motion';
  window.dispatchEvent(new CustomEvent('pixxel:motion', { detail: { paused: motionPaused } }));
}
motionToggle?.addEventListener('click', () => {
  motionPaused = !motionPaused;
  updateMotion();
});
motionPreference.addEventListener('change', (event) => {
  motionPaused = event.matches;
  updateMotion();
});
updateMotion();
