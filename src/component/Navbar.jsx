
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { label: "JPG to PDF", to: "/image-to-pdf" },
    { label: "PDF to JPG", to: "#", disabled: true },
    { label: "Increase Image Size", to: "#", disabled: true },
    { label: "Decrease Image Size", to: "#", disabled: true },
  ];

  const menuItems = [
    { label: "Home", to: "/" },
    { label: "Crop Image", to: "/" },
    { label: "Image to PDF", to: "/image-to-pdf" },
    { label: "Image Settings", to: "#", disabled: true },
    { label: "About", to: "#", disabled: true },
    { label: "Contact", to: "#", disabled: true },
  ];

  const linkClass = ({ isActive }) =>
    `whitespace-nowrap text-sm font-medium transition ${
      isActive
        ? "text-sky-600"
        : "text-slate-600 hover:text-sky-600"
    }`;

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="shrink-0 text-lg font-bold tracking-tight text-slate-900 sm:text-xl"
        >
          AUTO CROP IMAGE
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-5 lg:flex">
          {navLinks.map((item) =>
            item.disabled ? (
              <span
                key={item.label}
                title="Coming soon"
                className="cursor-not-allowed whitespace-nowrap text-sm text-slate-400"
              >
                {item.label}
              </span>
            ) : (
              <NavLink
                key={item.label}
                to={item.to}
                className={linkClass}
              >
                {item.label}
              </NavLink>
            )
          )}
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-label="Toggle More Tools menu"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:px-4"
          >
            More Tools
            <span className="ml-2" aria-hidden="true">
              {isMenuOpen ? "▲" : "▼"}
            </span>
          </button>

          {isMenuOpen && (
            <ul className="absolute right-0 z-50 mt-2 max-h-80 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              {menuItems.map((item) => (
                <li key={item.label}>
                  {item.disabled ? (
                    <span className="block cursor-not-allowed rounded-lg px-3 py-2 text-sm text-slate-400">
                      {item.label} — Coming soon
                    </span>
                  ) : (
                    <Link
                      to={item.to}
                      onClick={() => setIsMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </nav>

      <div className="flex gap-5 overflow-x-auto border-t border-slate-100 px-4 py-3 lg:hidden">
        {navLinks.map((item) =>
          item.disabled ? (
            <span
              key={item.label}
              className="shrink-0 whitespace-nowrap text-sm text-slate-400"
            >
              {item.label}
            </span>
          ) : (
            <NavLink
              key={item.label}
              to={item.to}
              className={linkClass}
            >
              {item.label}
            </NavLink>
          )
        )}
      </div>
    </header>
  );
}

export default Navbar;
