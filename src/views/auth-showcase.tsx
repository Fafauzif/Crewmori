"use client";
import { Check } from "lucide-react";
import { UiText } from "@/components/ui-text";

const crew = ["promoter", "sales", "account-manager", "operations", "finance"];
const points = [
  "Six specialists prepare leads, offers, projects and money.",
  "Nothing is sent or shared without your approval.",
  "The professional work stays yours.",
];

/** Shared left side of every sign-in surface, sample or connected. */
export function AuthShowcase() {
  return (
    <div className="auth-aside">
      <div className="auth-stage" aria-hidden="true">
        <img className="auth-hero" src="/assets/characters/scout-hero.svg" alt="" />
        <div className="auth-crew">
          {crew.map((id) => (
            <img key={id} src={`/assets/characters/${id}.svg`} alt="" />
          ))}
        </div>
      </div>
      <h2>
        <UiText>{"A little support."}</UiText>
        <br />
        <UiText>{"A lot of possibility."}</UiText>
      </h2>
      <p>
        <UiText>{"Your crew helps run the business around the work you love."}</UiText>
      </p>
      <ul className="auth-points">
        {points.map((point) => (
          <li key={point}>
            <Check size={16} aria-hidden="true" />
            <UiText>{point}</UiText>
          </li>
        ))}
      </ul>
    </div>
  );
}
