import { useLocation } from "react-router";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="animate-in fade-in duration-200">
      {children}
    </div>
  );
}
