import { useCallback, useEffect, useState } from "react";
import { api, ApiError, message } from "./lib/api";
import AuthPage from "./pages/AuthPage";
import StockPage from "./pages/StockPage";
import Logo from "./components/Logo";
import RecipesPage from "./pages/RecipesPage";
import SuggestionsPage from "./pages/SuggestionsPage";
import PreferencesPage from "./pages/PreferencesPage";
import RecipePage from "./pages/RecipePage";
import ProfilePage from "./pages/ProfilePage";
import UsersPage from "./pages/UsersPage";
import type { Account } from "./lib/recipes";
import "./App.css";
import "./Recipes.css";

function storedToken() {
  try {
    return sessionStorage.getItem("platinum.token") ?? "";
  } catch {
    return "";
  }
}

function saveToken(token: string) {
  try {
    if (token) sessionStorage.setItem("platinum.token", token);
    else sessionStorage.removeItem("platinum.token");
  } catch {}
}

function currentRoute() {
  return window.location.hash.slice(1) || "/recettes";
}

export default function App() {
  const [route, setRoute] = useState(currentRoute);
  const [account, setAccount] = useState<Account | null>(null);
  const [token, setToken] = useState(storedToken);
  const [checking, setChecking] = useState(!!token);
  const [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const change = () => setRoute(currentRoute());

    window.addEventListener("hashchange", change);

    return () => window.removeEventListener("hashchange", change);
  }, []);

  useEffect(() => {
    const titles: Record<string, string> = {
      "/suggestions": "Suggestions",
      "/preferences": "Préférences",
      "/stock": "Mon stock",
      "/profil": "Mon profil",
      "/admin/utilisateurs": "Utilisateurs",
      "/connexion": "Connexion",
    };

    document.title = `Platinum — ${titles[route] ?? "Recettes"}`;
    document.getElementById("main")?.focus();
    window.scrollTo(0, 0);
  }, [route]);

  const expire = useCallback(() => {
    saveToken("");
    setToken("");
    setAccount(null);
    setChecking(false);
    setNotice("Ta session a expiré. Connecte-toi à nouveau.");
    setError("");
  }, []);

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    api<Account>("/auth/me", { token, signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) {
          setAccount(value);
          setChecking(false);
          setError("");
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          if (error instanceof ApiError && error.status === 401) expire();
          else setError(message(error));
        }
      });

    return () => controller.abort();
  }, [token, retry, expire]);

  const recipeMatch = /^\/recettes\/(\d+|nouvelle)$/.exec(route);
  const protectedPage = [
    "/stock",
    "/suggestions",
    "/preferences",
    "/profil",
    "/admin/utilisateurs",
    "/recettes/nouvelle",
  ].includes(route);

  const signedIn = !!token && !checking && !!account;

  if (checking && (protectedPage || route === "/connexion"))
    return (
      <main
        id="main"
        className="session-page"
        tabIndex={-1}
      >
        <Logo />
        <p role={error ? "alert" : "status"}>
          {error || "Vérification de ta session…"}
        </p>
        {error && (
          <button
            onClick={() => {
              setError("");
              setRetry(retry + 1);
            }}
          >
            Réessayer
          </button>
        )}
        <button
          onClick={() => {
            saveToken("");
            setToken("");
            setAccount(null);
            setChecking(false);
            setError("");
          }}
        >
          Revenir à la connexion
        </button>
        <a href="#/recettes">Consulter les recettes</a>
      </main>
    );

  if (!signedIn && (protectedPage || route === "/connexion"))
    return (
      <AuthPage
        notice={
          notice ||
          (protectedPage
            ? "Connecte-toi pour accéder à cet espace personnel."
            : "")
        }
        onLogin={(value) => {
          saveToken(value);
          setAccount(null);
          setChecking(true);
          setToken(value);
          setNotice("");
          setError("");

          if (route === "/connexion") window.location.hash = "/stock";
        }}
      />
    );

  const session = { token: signedIn ? token : "", onExpired: expire };
  const active = recipeMatch ? "/recettes" : route;
  const links = [
    ["/recettes", "Recettes"],
    ...(signedIn
      ? [
          ["/suggestions", "Suggestions"],
          ["/stock", "Mon stock"],
          ["/preferences", "Préférences"],
          ["/profil", "Mon profil"],
        ]
      : []),
  ];

  if (signedIn && account.role === "ADMIN")
    links.push(["/admin/utilisateurs", "Utilisateurs"]);

  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Aller au contenu
      </a>
      <header className="site-header">
        <Logo compact />
        <nav aria-label="Navigation principale">
          {links.map(([path, label]) => (
            <a
              key={path}
              href={`#${path}`}
              aria-current={active === path ? "page" : undefined}
            >
              {label}
            </a>
          ))}
          {signedIn ? (
            <button
              className="text-button"
              onClick={() => {
                saveToken("");
                setToken("");
                setAccount(null);
                setChecking(false);
                setNotice("Tu es déconnectée.");
                setError("");
                window.location.hash = "/recettes";
              }}
            >
              Se déconnecter
            </button>
          ) : (
            <a href="#/connexion">Se connecter / S’inscrire</a>
          )}
        </nav>
      </header>
      {recipeMatch ? (
        <RecipePage
          key={route}
          id={recipeMatch[1] === "nouvelle" ? null : Number(recipeMatch[1])}
          account={signedIn ? account : null}
          {...session}
        />
      ) : route === "/recettes" ? (
        <RecipesPage {...session} />
      ) : route === "/suggestions" ? (
        <SuggestionsPage {...session} />
      ) : route === "/preferences" ? (
        <PreferencesPage {...session} />
      ) : route === "/profil" && account ? (
        <ProfilePage
          account={account}
          onSaved={setAccount}
          {...session}
        />
      ) : route === "/admin/utilisateurs" ? (
        account?.role === "ADMIN" ? (
          <UsersPage {...session} />
        ) : (
          <main
            id="main"
            className="stock-page"
            tabIndex={-1}
          >
            <h1>Accès réservé aux administrateurs</h1>
          </main>
        )
      ) : route === "/stock" || route === "/connexion" ? (
        <StockPage {...session} />
      ) : (
        <main
          id="main"
          className="stock-page"
          tabIndex={-1}
        >
          <h1>Page introuvable</h1>
          <a href="#/recettes">Revenir aux recettes</a>
        </main>
      )}
      <footer>Platinum · Des recettes simples, un goût premium</footer>
    </>
  );
}
