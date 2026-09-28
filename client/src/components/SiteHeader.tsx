import { useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import type { Account } from "../lib/recipes";

type Props = {
  links: string[][];
  active: string;
  account: Account | null;
  onLogout: () => void;
};

export default function SiteHeader({
  links,
  active,
  account,
  onLogout,
}: Props) {
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1101px)");
    const closeOnResize = () => setOpen(false);

    desktop.addEventListener("change", closeOnResize);

    return () => desktop.removeEventListener("change", closeOnResize);
  }, []);

  useEffect(() => {
    if (!open) return;

    function closeOutside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !header.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <header
      ref={header}
      className="site-header platinum-header"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={toggle}
        type="button"
        className="menu-toggle"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
        aria-controls="main-navigation"
        onClick={() => setOpen(!open)}
      >
        <span
          className="menu-bars"
          aria-hidden="true"
        >
          <span />
          <span />
          <span />
        </span>
      </button>
      <a
        className="header-logo"
        href="#/recettes"
        aria-label="Platinum — les recettes"
        onClick={() => setOpen(false)}
      >
        <Logo compact />
      </a>
      <a
        className="header-account"
        href={account ? "#/profil" : "#/connexion"}
        aria-label={account ? "Mon profil" : "Se connecter"}
        onClick={() => setOpen(false)}
      >
        <img
          className="account-circle"
          src="/images/avatar-circle.svg"
          alt=""
        />
        {account ? (
          <span aria-hidden="true">
            {Array.from(account.username.trim())[0]?.toLocaleUpperCase("fr") ||
              "?"}
          </span>
        ) : (
          <img
            className="account-person"
            src="/images/person.png"
            alt=""
          />
        )}
      </a>
      <nav
        id="main-navigation"
        className={`site-nav${open ? " is-open" : ""}`}
        aria-label="Navigation principale"
      >
        {links.map(([path, label]) => (
          <a
            key={path}
            href={`#${path}`}
            aria-current={active === path ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            {label}
          </a>
        ))}
        {account ? (
          <button
            className="text-button"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Se déconnecter
          </button>
        ) : (
          <a
            href="#/connexion"
            onClick={() => setOpen(false)}
          >
            Se connecter / S’inscrire
          </a>
        )}
      </nav>
    </header>
  );
}
