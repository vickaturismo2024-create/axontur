import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-5xl font-sans font-bold text-foreground">404</h1>
        <p className="mb-6 text-xl font-sans text-muted-foreground">Oops! Página no encontrada</p>
        <a href="/" className="text-primary font-medium hover:underline">
          Volver al Inicio
        </a>
      </div>
    </div>
  );
};

export default NotFound;
