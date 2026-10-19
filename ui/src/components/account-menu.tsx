import { Link } from "@tanstack/react-router";
import { User } from "lucide-react";

export function AccountMenu({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link to="/account" onClick={onNavigate} aria-label="Account" className="hover:opacity-70">
      <User className="size-5" />
    </Link>
  );
}
