import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError, message } from "../lib/api";
import type { Account, SessionProps } from "../lib/recipes";
import { PageHeading } from "../components/RecipeParts";

export default function ProfilePage({
  account,
  onSaved,
  token,
  onExpired,
}: SessionProps & { account: Account; onSaved: (value: Account) => void }) {
  const [username, setUsername] = useState(account.username),
    [email, setEmail] = useState(account.email);
  const [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const lock = useRef(false);

  async function save(event: FormEvent) {
    event.preventDefault();

    if (lock.current) return;

    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const value = await api<Account>("/auth/me", {
        token,
        method: "PUT",
        body: { username, email, currentPassword: password },
      });

      onSaved(value);
      setUsername(value.username);
      setEmail(value.email);
      setPassword("");
      setNotice("Tes informations ont été enregistrées.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) onExpired();
      else setError(message(error));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <main
      id="main"
      className="stock-page"
      tabIndex={-1}
    >
      <PageHeading>Mon profil</PageHeading>
      <p>
        Modifie ton nom d’utilisateur ou ton adresse e-mail. Confirme avec ton
        mot de passe actuel.
      </p>
      <form
        className="account-form"
        onSubmit={save}
      >
        <fieldset disabled={busy}>
          <legend>Mes informations</legend>
          <label>
            Nom d’utilisateur
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              minLength={2}
              maxLength={80}
            />
          </label>
          <label>
            Adresse e-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
          <label>
            Mot de passe actuel
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button>
            {busy ? "Enregistrement…" : "Enregistrer mes informations"}
          </button>
        </fieldset>
        {error && (
          <p
            className="error"
            role="alert"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            className="notice"
            role="status"
          >
            {notice}
          </p>
        )}
      </form>
    </main>
  );
}
