import type { Metadata } from 'next';
import { LoginForm } from '@/components/LoginForm';
import { SiteFoot, SiteHead } from '@/components/Site';

export const metadata: Metadata = { title: 'Parent login', robots: { index: false } };

export default function Login() {
  return (
    <>
      <SiteHead />
      <main className="narrow section">
        <h1 style={{ fontSize: 'clamp(32px, 6vw, 48px)' }}>Parent login</h1>
        <p className="lede">No passwords. Type the email you signed up with and we’ll send a sign-in link for each of your buddies.</p>
        <LoginForm />
      </main>
      <SiteFoot />
    </>
  );
}
