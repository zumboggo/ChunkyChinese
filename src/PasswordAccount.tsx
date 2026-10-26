import { useEffect, useState } from 'react'
import { supabase } from './supabaseSync'

// Capture before Supabase consumes the callback fragment.
const callback = new URLSearchParams(window.location.hash.slice(1))
export const passwordAccountRequested = new URLSearchParams(window.location.search).has('account') ||
  ['invite', 'recovery'].includes(callback.get('type') ?? '') || callback.has('error_description')
const callbackError = callback.get('error_description')

export function PasswordAccount() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState(callbackError ?? '')
  const home = import.meta.env.BASE_URL

  useEffect(() => {
    if (!supabase) return
    let active = true
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      setSignedInEmail(data.session?.user.email ?? null)
      if (error) setMessage(error.message)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedInEmail(session?.user.email ?? null)
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])

  async function submit() {
    if (!supabase) return
    setBusy(true)
    setMessage('')
    try {
      if (signedInEmail) {
        if (password.length < 12) throw new Error('Use at least 12 characters.')
        if (password !== confirmation) throw new Error('The passwords do not match.')
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        setPassword('')
        setConfirmation('')
        setSaved(true)
        setMessage('Your password is saved. You can now open Chunky Chinese.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        window.location.assign(home)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not complete sign-in. Please try again.')
    } finally { setBusy(false) }
  }

  async function resetPassword() {
    if (!supabase || !email.trim()) { setMessage('Enter your email address first.'); return }
    setBusy(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: new URL(home, window.location.origin).toString(),
      })
      if (error) throw error
      setMessage('If that account exists, check your email for a password setup link.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not send the link.') }
    finally { setBusy(false) }
  }

  return <main style={{ maxWidth: 480, margin: '8vh auto', padding: 24 }}>
    <section className="panel">
      <h1>Chunky Chinese</h1>
      <h2>{signedInEmail ? 'Choose your password' : 'Sign in with email'}</h2>
      <p>{signedInEmail ? `Set a password for ${signedInEmail}. Your learning progress belongs to your own account.` : 'Use your own email and Chunky Chinese password.'}</p>
      {!ready ? <p>Checking your sign-in link…</p> : !saved && <form onSubmit={event => { event.preventDefault(); void submit() }} style={{ display: 'grid', gap: 16 }}>
        {!signedInEmail && <label>Email<input style={{ width: '100%' }} type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} /></label>}
        <label>{signedInEmail ? 'New password (at least 12 characters)' : 'Password'}<input style={{ width: '100%' }} type="password" autoComplete={signedInEmail ? 'new-password' : 'current-password'} required minLength={signedInEmail ? 12 : undefined} value={password} onChange={event => setPassword(event.target.value)} /></label>
        {signedInEmail && <label>Confirm password<input style={{ width: '100%' }} type="password" autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>}
        <button className="primary" disabled={busy}>{busy ? 'Please wait…' : signedInEmail ? 'Save password' : 'Sign in'}</button>
        {!signedInEmail && <button type="button" disabled={busy} onClick={() => void resetPassword()}>Email me a password reset link</button>}
      </form>}
      <p role="status">{message}</p>
      <a href={home}>Open Chunky Chinese</a>
    </section>
  </main>
}
