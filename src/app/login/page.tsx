import type { Metadata } from 'next';
import { LoginForm } from '@/components/LoginForm';
import { CodeEntry } from '@/components/CodeEntry';
import { SiteFoot, SiteHead } from '@/components/Site';

export const metadata: Metadata = { title: 'Open your buddy', robots: { index: false } };

export default function Login() {
  return (
    <>
      <SiteHead />
      <main className="narrow section">
        <h1 style={{ fontSize: 'clamp(32px, 6vw, 48px)' }}>Open your buddy</h1>
        <p className="lede">Type the buddy code from your QR card or welcome email. This device remembers your buddy after that.</p>
        <div className="panel"><CodeEntry /></div>
        <h2 style={{ fontSize: 22, marginTop: 28 }}>Lost the code?</h2>
        <p className="muted">We’ll email the code and parent PIN for every buddy on your email address.</p>
        <LoginForm />
      </main>
      <SiteFoot />
    </>
  );
}
