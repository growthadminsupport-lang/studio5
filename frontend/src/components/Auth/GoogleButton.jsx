import { useEffect, useRef, useState } from 'react';

const scriptUrl = 'https://accounts.google.com/gsi/client';
let scriptPromise;

function loadGoogle() {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) return resolve();
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => { scriptPromise = null; reject(new Error('Google sign-in could not load')); };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export default function GoogleButton({ onCredential, disabled = false }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const mountRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [error, setError] = useState('');

  useEffect(() => { callbackRef.current = onCredential; }, [onCredential]);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadGoogle().then(() => {
      if (cancelled || !mountRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        auto_select: false,
        callback: ({ credential }) => { if (credential) callbackRef.current(credential); },
      });
      mountRef.current.replaceChildren();
      window.google.accounts.id.renderButton(mountRef.current, {
        theme: 'outline', size: 'large', text: 'continue_with', width: 320,
      });
    }).catch((reason) => { if (!cancelled) setError(reason.message); });
    return () => { cancelled = true; };
  }, [clientId]);

  if (!clientId) return null;
  return <div aria-disabled={disabled} style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
    <div ref={mountRef} style={{ display: 'flex', justifyContent: 'center' }} />
    {error && <p className="auth-error">{error}</p>}
  </div>;
}
