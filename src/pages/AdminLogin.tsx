import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Panel } from '../components/UI';
import { Eye, EyeOff, Lock } from '../components/Icons';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/admin');
      }
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/admin');
    }
  };

  const inputStyle = {
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    outline: 'none',
  };

  return (
    <section style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <Panel title="Admin Access" subtitle="Sign in to manage Safe75 exam resources.">
          <form onSubmit={handleLogin} style={{ display: 'grid', gap: '14px', padding: '14px 16px' }}>
            {error && (
              <div className="notice-banner" style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '13px' }}>
                {error}
              </div>
            )}
            
            <div style={{ display: 'grid', gap: '5px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Email</label>
              <input
                className="standard-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <div style={{ display: 'grid', gap: '5px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  className="standard-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: '40px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                  style={{
                    position: "absolute",
                    right: 8,
                    background: "none",
                    border: "none",
                    padding: 4,
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="action-button action-button--primary"
              style={{ padding: '10px 18px', marginTop: '6px', fontSize: '13px', fontWeight: 600, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </Panel>
      </div>
    </section>
  );
}
