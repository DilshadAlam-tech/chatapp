import { Link, useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="glass w-full max-w-md rounded-3xl p-8 text-center">
        <p className="font-heading text-5xl font-bold text-primary">404</p>
        <h1 className="mt-3 text-xl font-semibold text-foreground">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">The route <span className="font-mono text-foreground">{location.pathname}</span> does not exist in this build.</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-xl gradient-neon-btn px-4 py-2 text-sm font-semibold text-primary-foreground neon-glow"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
