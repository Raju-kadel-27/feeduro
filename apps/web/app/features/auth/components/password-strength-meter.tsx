import { Check, X } from "lucide-react";
import { PASSWORD_REQUIREMENTS } from "../schemas/password";

type Props = { password: string };

function getStrength(score: number) {
  if (score === 0) return { label: "", color: "", bars: 0, textColor: "" };
  if (score <= 2) return { label: "Weak", color: "bg-red-500", bars: 1, textColor: "text-red-500" };
  if (score === 3) return { label: "Fair", color: "bg-amber-500", bars: 2, textColor: "text-amber-500" };
  if (score === 4) return { label: "Good", color: "bg-blue-500", bars: 3, textColor: "text-blue-500" };
  return { label: "Strong", color: "bg-green-500", bars: 4, textColor: "text-green-600" };
}

export function PasswordStrengthMeter({ password }: Props) {
  if (!password) return null;

  const requirements = PASSWORD_REQUIREMENTS.map((r) => ({ ...r, met: r.test(password) }));
  const score = requirements.filter((r) => r.met).length;
  const { label, color, bars, textColor } = getStrength(score);

  return (
    <div className="space-y-3 pt-1">
      <div className="space-y-1">
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= bars ? color : "bg-muted"}`}
            />
          ))}
        </div>
        {label && <p className={`text-xs font-medium ${textColor}`}>{label}</p>}
      </div>

      <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        {requirements.map((req) => (
          <li key={req.id} className="flex items-center gap-1.5">
            {req.met ? (
              <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            )}
            <span className={`text-xs ${req.met ? "text-foreground" : "text-muted-foreground"}`}>
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
