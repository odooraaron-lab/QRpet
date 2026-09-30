import { LOGIN_URL, PRODUCT, BRAND, SUPPORT_EMAIL, buddyUrl } from './config';
import { escapeHtml } from './guard';
import { sign, type Buddy } from './buddies';

export async function sendEmail(o: { to: string; subject: string; html: string; text: string }) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`\n[email not sent: RESEND_API_KEY missing] to=${o.to} subject=${o.subject}\n${o.text}\n`);
    return true;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.FROM_EMAIL || `${PRODUCT} <hello@myqr.co.nz>`, to: o.to, subject: o.subject, html: o.html, text: o.text, reply_to: SUPPORT_EMAIL }),
  });
  if (!res.ok) console.error('email failed', res.status, await res.text().catch(() => ''));
  return res.ok;
}

const pretty = (slug: string) => slug.charAt(0).toUpperCase() + slug.slice(1);

/** A sign-in link for one buddy's parent page. Valid for 7 days (it's in the welcome email too). */
export const parentLink = (b: Pick<Buddy, 'slug' | 'parent_id'>, days = 7) =>
  buddyUrl(b.slug, `/parent/enter?t=${encodeURIComponent(sign({ slug: b.slug, pid: b.parent_id, use: 'login' }, days * 1440))}`);

const shell = (title: string, body: string) => `<!doctype html><html><body style="margin:0;background:#F1EAFF;font-family:Nunito,Segoe UI,Helvetica,Arial,sans-serif;color:#2E2140">
<div style="max-width:560px;margin:0 auto;padding:28px 18px"><p style="font-size:14px;font-weight:800;color:#C23A64;margin:0 0 12px">${PRODUCT} by ${BRAND}</p>
<div style="background:#fff;border-radius:22px;padding:26px"><h1 style="font-size:26px;line-height:1.15;margin:0 0 12px">${title}</h1>${body}</div>
<p style="font-size:13px;color:#5E4C70;margin:16px 4px 0">Questions? Just reply to this email.</p></div></body></html>`;
const button = (href: string, label: string) => `<p style="margin:18px 0"><a href="${href}" style="display:inline-block;background:#C23A64;color:#fff;text-decoration:none;font-weight:800;border-radius:999px;padding:14px 26px">${label}</a></p>`;

export function welcomeEmail(b: Buddy) {
  const name = pretty(b.slug);
  const parent = parentLink(b);
  const text = `Kia ora,

${name} is ready and waiting to hatch!

1. PARENT PAGE (print the QR card, set learning goals, add messages)
${parent}
This link signs you in for 7 days. Any time after that, get a new one at ${LOGIN_URL}.

2. PRINT THE CARD
On the parent page, tap "Print the QR card". Your child scans it with a phone or tablet to open ${name}.

3. ON THE TV (optional)
On the TV's web browser go to ${buddyUrl(b.slug, '/tv').replace(/^https?:\/\//, '')} and type the 6-digit code it shows into the parent page.

${name} learns one new thing every day your child visits. No ads, no chat, nothing to buy inside.

${PRODUCT} by ${BRAND}`;
  const html = shell(`${escapeHtml(name)} is ready to hatch!`, `
<p style="font-size:16px;line-height:1.55">Your buddy lives at <b>${escapeHtml(buddyUrl(b.slug).replace(/^https?:\/\//, ''))}</b>. Start on the parent page: print the QR card, then let your child scan it.</p>
${button(parent, 'Open the parent page')}
<ol style="padding-left:20px;font-size:15px;line-height:1.6"><li>Print the QR card from the parent page.</li><li>Your child scans it with a phone or tablet: ${escapeHtml(name)} hatches!</li><li>On a TV, open <b>${escapeHtml(buddyUrl(b.slug, '/tv').replace(/^https?:\/\//, ''))}</b> and type the code into the parent page.</li></ol>
<p style="font-size:14px;color:#5E4C70">This sign-in link works for 7 days. After that, get a new one from ${escapeHtml(LOGIN_URL.replace(/^https?:\/\//, ''))}.</p>`);
  return sendEmail({ to: b.email!, subject: `${name} is ready to hatch!`, html, text });
}

export function loginEmail(email: string, buddies: Buddy[]) {
  const links = buddies.map((b) => ({ name: pretty(b.slug), href: parentLink(b, 1) }));
  const text = `Here ${links.length === 1 ? 'is your sign-in link' : 'are your sign-in links'} (valid for 24 hours):\n\n${links.map((l) => `${l.name}: ${l.href}`).join('\n')}\n\nDidn't ask for this? You can ignore it.`;
  const html = shell('Your sign-in link', `${links.map((l) => `<p style="margin:6px 0 0;font-weight:800">${escapeHtml(l.name)}</p>${button(l.href, `Open ${escapeHtml(l.name)}’s parent page`)}`).join('')}<p style="font-size:14px;color:#5E4C70">Valid for 24 hours. Didn’t ask for this? You can ignore it.</p>`);
  return sendEmail({ to: email, subject: `Sign in to ${PRODUCT}`, html, text });
}
