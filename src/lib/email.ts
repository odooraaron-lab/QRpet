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

const openLink = (b: Buddy) => buddyUrl(b.slug, `/go?c=${encodeURIComponent(b.card_key)}`);
const codeBlock = (b: Buddy) => `<div style="background:#F4F8FE;border-radius:16px;padding:14px 16px;margin:14px 0">
<p style="margin:0;font-size:13px;font-weight:800;color:#5E4C70">BUDDY CODE (opens ${escapeHtml(pretty(b.slug))} on any phone, tablet or TV)</p>
<p style="margin:4px 0 10px;font-size:22px;font-weight:800;letter-spacing:.04em">${escapeHtml(b.card_key)}</p>
<p style="margin:0;font-size:13px;font-weight:800;color:#5E4C70">PARENT PIN (for the parent page)</p>
<p style="margin:4px 0 0;font-size:22px;font-weight:800;letter-spacing:.2em">${escapeHtml(b.parent_pin ?? '')}</p></div>`;

export function welcomeEmail(b: Buddy) {
  const name = pretty(b.slug);
  const address = buddyUrl(b.slug).replace(/^https?:\/\//, '');
  const text = `Kia ora,

${name} is on the way! An egg arrives on the first visit and hatches on the fourth.

BUDDY CODE: ${b.card_key}
Type it at ${LOGIN_URL.replace(/^https?:\/\//, '')} (or on ${address}) to open ${name} on any phone, tablet or TV. The device remembers it after that.

PARENT PIN: ${b.parent_pin}
For the parent page: ${buddyUrl(b.slug, '/parent')}
From inside the buddy: press and hold the top-right corner for 3 seconds, then type the PIN.

Open ${name} on this device now:
${openLink(b)}

Keep this email: the code and PIN are all you need. Print the QR card from the parent page.

${PRODUCT} by ${BRAND}`;
  const html = shell(`${escapeHtml(name)} is on the way!`, `
<p style="font-size:16px;line-height:1.55">An egg arrives on the first visit and hatches on the fourth. Keep this email: the code and PIN are all you need.</p>
${codeBlock(b)}
${button(openLink(b), `Open ${escapeHtml(name)}`)}
<ol style="padding-left:20px;font-size:15px;line-height:1.6"><li>On another device, go to <b>${escapeHtml(LOGIN_URL.replace(/^https?:\/\//, ''))}</b> and type the buddy code.</li><li>Parent page: <b>${escapeHtml(address)}/parent</b> and the PIN. From inside the buddy, press and hold the top-right corner for 3 seconds.</li><li>Print the QR card from the parent page: scanning it opens ${escapeHtml(name)} too.</li></ol>`);
  return sendEmail({ to: b.email!, subject: `${name} is on the way: your buddy code`, html, text });
}

/** "Forgot your code?": every buddy on this email, with its code, PIN and a one-day parent link. */
export function loginEmail(email: string, buddies: Buddy[]) {
  const text = buddies.map((b) => `${pretty(b.slug)}\n  Buddy code: ${b.card_key}\n  Parent PIN: ${b.parent_pin}\n  Open: ${openLink(b)}\n  Parent page (link works 24 hours): ${parentLink(b, 1)}`).join('\n\n')
    + `\n\nDidn't ask for this? You can ignore it.`;
  const html = shell(buddies.length === 1 ? 'Your buddy code' : 'Your buddy codes', buddies.map((b) => `<p style="margin:10px 0 0;font-weight:800;font-size:18px">${escapeHtml(pretty(b.slug))}</p>${codeBlock(b)}${button(openLink(b), `Open ${escapeHtml(pretty(b.slug))}`)}<p style="font-size:14px"><a href="${parentLink(b, 1)}">Open the parent page</a> (link works for 24 hours)</p>`).join('')
    + `<p style="font-size:14px;color:#5E4C70">Didn’t ask for this? You can ignore it.</p>`);
  return sendEmail({ to: email, subject: `Your ${PRODUCT} code`, html, text });
}
