
interface UserAvatarProps {
  /** The raw SVG string returned from the DiceBear API */
  svgString?: string | null;
  /** Fallback display name used to derive the initial letter */
  username?: string;
  /** Size in pixels (width & height). Defaults to 36. */
  size?: number;
  className?: string;
}

/**
 * Renders a DiceBear Identicon SVG avatar.
 * Falls back to a coloured initial-letter badge when no SVG is available.
 */
export default function UserAvatar({
  svgString,
  username = '',
  size = 36,
  className = '',
}: UserAvatarProps) {
  const initial = username ? username[0].toUpperCase() : '?';

  if (svgString) {
    return (
      <span
        className={`flex-shrink-0 inline-flex items-center justify-center overflow-hidden border border-gray-200 dark:border-[#333] ${className}`}
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: svgString }}
        aria-label={`${username} avatar`}
        role="img"
      />
    );
  }

  // Fallback: derive a stable background colour from the username
  const colours = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-yellow-100 text-yellow-700',
    'bg-purple-100 text-purple-700',
    'bg-pink-100 text-pink-700',
    'bg-indigo-100 text-indigo-700',
  ];
  const colourClass = colours[username.charCodeAt(0) % colours.length] ?? colours[0];

  return (
    <span
      className={`flex-shrink-0 flex items-center justify-center font-semibold leading-none capitalize border border-gray-200 dark:border-[#333] ${colourClass} ${className}`}
      style={{ width: size, height: size, fontSize: Math.floor(size * 0.44) }}
      aria-label={`${username} avatar`}
      role="img"
    >
      {initial}
    </span>
  );
}
