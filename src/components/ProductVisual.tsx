import type { ProductKind } from "@/lib/types";

/**
 * Stand-in illustration shown until real product photos are uploaded.
 * `tone` is the body colour so variant colour changes are visible.
 */
export function ProductVisual({
  kind,
  tone,
  className = "",
}: {
  kind: ProductKind;
  tone: string;
  className?: string;
}) {
  const dark = "#0b1220";
  const glass = "#9db4d0";
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label={`${kind} illustration`}
      style={{ filter: "drop-shadow(0 3px 5px rgba(11,18,32,0.22))" }}
    >
      {kind === "phone" && (
        <g>
          <rect x="62" y="22" width="76" height="156" rx="14" fill={tone} />
          <rect x="68" y="30" width="64" height="140" rx="9" fill={dark} />
          <rect x="68" y="30" width="64" height="140" rx="9" fill={glass} opacity="0.18" />
          <circle cx="100" cy="40" r="2.5" fill={tone} />
        </g>
      )}
      {kind === "laptop" && (
        <g>
          <rect x="40" y="46" width="120" height="82" rx="6" fill={tone} />
          <rect x="46" y="52" width="108" height="70" rx="3" fill={dark} />
          <rect x="46" y="52" width="108" height="70" rx="3" fill={glass} opacity="0.2" />
          <path d="M26 134h148l-9 14a6 6 0 0 1-5 3H40a6 6 0 0 1-5-3z" fill={tone} />
          <rect x="88" y="136" width="24" height="3" rx="1.5" fill={dark} opacity="0.35" />
        </g>
      )}
      {kind === "headphones" && (
        <g>
          <path d="M52 112V96a48 48 0 0 1 96 0v16" fill="none" stroke={tone} strokeWidth="9" strokeLinecap="round" />
          <rect x="42" y="102" width="28" height="52" rx="13" fill={tone} />
          <rect x="130" y="102" width="28" height="52" rx="13" fill={tone} />
          <rect x="48" y="110" width="12" height="36" rx="6" fill={dark} opacity="0.35" />
          <rect x="140" y="110" width="12" height="36" rx="6" fill={dark} opacity="0.35" />
        </g>
      )}
      {kind === "earbuds" && (
        <g>
          <rect x="52" y="92" width="96" height="66" rx="30" fill={tone} />
          <path d="M52 118h96" stroke={dark} strokeOpacity="0.25" strokeWidth="2" />
          <ellipse cx="82" cy="70" rx="13" ry="18" fill={tone} stroke={dark} strokeOpacity="0.25" strokeWidth="2" />
          <ellipse cx="118" cy="70" rx="13" ry="18" fill={tone} stroke={dark} strokeOpacity="0.25" strokeWidth="2" />
          <circle cx="100" cy="138" r="3" fill={dark} opacity="0.4" />
        </g>
      )}
      {kind === "speaker" && (
        <g>
          <rect x="56" y="40" width="88" height="124" rx="26" fill={tone} />
          <circle cx="100" cy="78" r="20" fill={dark} opacity="0.4" />
          <circle cx="100" cy="78" r="9" fill={dark} opacity="0.5" />
          <circle cx="100" cy="132" r="20" fill={dark} opacity="0.4" />
          <circle cx="100" cy="132" r="9" fill={dark} opacity="0.5" />
        </g>
      )}
      {kind === "watch" && (
        <g>
          <rect x="78" y="22" width="44" height="40" rx="8" fill={tone} opacity="0.75" />
          <rect x="78" y="138" width="44" height="40" rx="8" fill={tone} opacity="0.75" />
          <rect x="58" y="56" width="84" height="88" rx="24" fill={tone} />
          <rect x="65" y="63" width="70" height="74" rx="18" fill={dark} />
          <rect x="65" y="63" width="70" height="74" rx="18" fill={glass} opacity="0.18" />
          <rect x="142" y="88" width="6" height="22" rx="3" fill={tone} />
        </g>
      )}
      {kind === "camera" && (
        <g>
          <rect x="60" y="146" width="80" height="16" rx="8" fill={tone} />
          <rect x="88" y="122" width="24" height="30" rx="6" fill={tone} />
          <circle cx="100" cy="82" r="46" fill={tone} />
          <circle cx="100" cy="82" r="31" fill={dark} />
          <circle cx="100" cy="82" r="14" fill={glass} opacity="0.35" />
          <circle cx="92" cy="74" r="4" fill="#fff" opacity="0.5" />
        </g>
      )}
      {kind === "powerbank" && (
        <g>
          <rect x="62" y="30" width="76" height="140" rx="16" fill={tone} />
          <rect x="76" y="46" width="48" height="4" rx="2" fill="#dfb23a" />
          <rect x="76" y="58" width="48" height="4" rx="2" fill="#dfb23a" opacity="0.6" />
          <rect x="76" y="70" width="48" height="4" rx="2" fill="#dfb23a" opacity="0.3" />
          <rect x="86" y="156" width="28" height="6" rx="3" fill={dark} opacity="0.5" />
        </g>
      )}
      {kind === "vacuum" && (
        <g>
          <circle cx="100" cy="100" r="62" fill={tone} stroke={dark} strokeOpacity="0.15" strokeWidth="2" />
          <circle cx="100" cy="100" r="38" fill={dark} opacity="0.08" />
          <circle cx="100" cy="100" r="13" fill={dark} opacity="0.7" />
          <circle cx="100" cy="100" r="5" fill="#dfb23a" />
          <rect x="82" y="46" width="36" height="8" rx="4" fill={dark} opacity="0.35" />
        </g>
      )}
      {kind === "plug" && (
        <g>
          <rect x="54" y="54" width="92" height="92" rx="24" fill={tone} stroke={dark} strokeOpacity="0.15" strokeWidth="2" />
          <rect x="80" y="40" width="7" height="22" rx="3" fill={dark} opacity="0.6" />
          <rect x="113" y="40" width="7" height="22" rx="3" fill={dark} opacity="0.6" />
          <circle cx="100" cy="100" r="14" fill="none" stroke="#dfb23a" strokeWidth="5" />
        </g>
      )}
      {kind === "charger" && (
        <g>
          <rect x="62" y="64" width="76" height="82" rx="14" fill={tone} stroke={dark} strokeOpacity="0.15" strokeWidth="2" />
          <rect x="82" y="40" width="7" height="26" rx="3" fill={dark} opacity="0.6" />
          <rect x="111" y="40" width="7" height="26" rx="3" fill={dark} opacity="0.6" />
          <rect x="78" y="120" width="20" height="8" rx="4" fill={dark} opacity="0.5" />
          <rect x="104" y="120" width="20" height="8" rx="4" fill={dark} opacity="0.5" />
        </g>
      )}
    </svg>
  );
}
