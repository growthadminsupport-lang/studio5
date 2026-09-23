import { createContext, useContext, useEffect, useState } from 'react';
import { authedRequest, clearSession, publicRequest, refreshAccess, saveSession, storedRefreshToken } from '../lib/api';

const AuthContext = createContext(null);
let bootstrapPromise = null;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!bootstrapPromise) {
      bootstrapPromise = (async () => {
        if (!storedRefreshToken()) return null;
        await refreshAccess();
        return authedRequest('/api/auth/me');
      })().catch(() => { clearSession(); return null; }).finally(() => { bootstrapPromise = null; });
    }
    bootstrapPromise.then((profile) => {
      if (active) { setUser(profile); setLoading(false); }
    });
    return () => { active = false; };
  }, []);

  async function acceptTokens(tokens, remember = false) {
    saveSession(tokens, remember);
    try {
      const profile = await authedRequest('/api/auth/me');
      setUser(profile);
      return tokens;
    } catch (error) {
      clearSession();
      setUser(null);
      throw error;
    }
  }

  async function login(email, password, remember = false) {
    const tokens = await publicRequest('/api/auth/login', { email, password });
    return acceptTokens(tokens, remember);
  }

  async function loginWithGoogle(idToken, termsAccepted = false, remember = false) {
    const tokens = await publicRequest('/api/auth/google', { id_token: idToken, terms_accepted: termsAccepted });
    return acceptTokens(tokens, remember);
  }

  async function register(form) {
    return publicRequest('/api/auth/register', {
      full_name: form.name, email: form.email, phone_number: form.phone || null,
      password: form.password, terms_accepted: form.acceptedTerms,
    });
  }

  async function logout() {
    const refreshToken = storedRefreshToken();
    clearSession();
    setUser(null);
    if (refreshToken) {
      await publicRequest('/api/auth/logout', { refresh_token: refreshToken }).catch(() => null);
    }
  }

  async function linkGoogle(idToken, currentPassword) {
    const result = await authedRequest('/api/auth/google/link', {
      method: 'POST', body: { id_token: idToken, current_password: currentPassword },
    });
    setUser(await authedRequest('/api/auth/me'));
    return result;
  }

  return <AuthContext.Provider value={{
    user, email: user?.email || '', isLoggedIn: Boolean(user), loading,
    login, loginWithGoogle, register, logout, linkGoogle,
    requestPasswordReset: (email) => publicRequest('/api/auth/password/forgot', { email }),
    resetPassword: (token, newPassword) => publicRequest('/api/auth/password/reset', { token, new_password: newPassword }),
    verifyEmail: (token, password) => publicRequest('/api/auth/email/verify', { token, password }),
    resendVerification: (email) => publicRequest('/api/auth/email/verification/resend', { email }),
  }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
