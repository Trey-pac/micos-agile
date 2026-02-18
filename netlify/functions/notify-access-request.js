import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const { name, email } = body;
  if (!name || !email) {
    return new Response('Missing name or email', { status: 400 });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error('ADMIN_EMAIL env var is not set');
    return new Response('Server configuration error', { status: 500 });
  }

  try {
    await resend.emails.send({
      from: "Mico's Micro Farm Workspace <onboarding@resend.dev>",
      to: adminEmail,
      subject: `Access Request: ${name} wants into Mico's Micro Farm Workspace`,
      html: `
        <h2>Access Request</h2>
        <p>Someone tried to sign in with a Google account that isn't on the approved list.</p>
        <ul>
          <li><strong>Name:</strong> ${name}</li>
          <li><strong>Email:</strong> ${email}</li>
        </ul>
        <p>To grant them access, add their email to <code>ALLOWED_EMAILS</code>
        in <code>src/hooks/useAuth.js</code> and redeploy.</p>
      `,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Resend error:', err);
    return new Response('Email send failed', { status: 500 });
  }
}
