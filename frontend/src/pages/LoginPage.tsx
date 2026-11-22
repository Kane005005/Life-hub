import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { HudFrame } from '../components/HudFrame'
import { LogoMark } from '../components/LogoMark'
import { ApiError } from '../lib/api'
import { useLogin } from '../lib/queries'

export function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      await login.mutateAsync({ username, password })
      navigate('/', { replace: true })
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.detail : 'Identifiants incorrects.')
    }
  }

  return (
    <main className="lr-login">
      <LogoMark size={72} />
      <h1 className="lr-login-title">LIFE RPG</h1>
      <p className="lr-lede">Reprends ta progression là où tu t’es arrêté.</p>

      <HudFrame as="form" className="lr-login-form" onSubmit={handleSubmit}>
        <label className="lr-field">
          <span>Nom</span>
          <input
            id="login-username"
            name="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>

        <label className="lr-field">
          <span>Mot de passe</span>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error ? (
          <p role="alert" className="lr-login-error">
            {error}
          </p>
        ) : null}

        <Button type="submit" variant="solid" disabled={login.isPending}>
          Entrer
        </Button>
      </HudFrame>
    </main>
  )
}
