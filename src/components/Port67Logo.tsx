export function Port67Logo({ size = 40, className = '' }: { size?: number; className?: string }) {
    const id = `port67-grad-${size}`;
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 105"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id={id} x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop offset="0%" stopColor="hsl(280, 80%, 55%)" />
                    <stop offset="50%" stopColor="hsl(330, 80%, 55%)" />
                    <stop offset="100%" stopColor="hsl(25, 95%, 55%)" />
                </linearGradient>
            </defs>

            {/* Antenna stem */}
            <line
                x1="50" y1="18" x2="50" y2="6"
                stroke={`url(#${id})`} strokeWidth="5" strokeLinecap="round"
            />

            {/* Antenna ball */}
            <circle cx="50" cy="5" r="4.5" fill={`url(#${id})`} />

            {/* Head — dome shape, stroke only */}
            <path
                d="M18 62 C18 25, 82 25, 82 62 C82 78, 18 78, 18 62Z"
                stroke={`url(#${id})`}
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />

            {/* Left eye */}
            <rect x="36" y="47" width="6" height="8" rx="3" fill={`url(#${id})`} />

            {/* Right eye */}
            <rect x="58" y="47" width="6" height="8" rx="3" fill={`url(#${id})`} />

            {/* Smile — curved line below the head */}
            <path
                d="M30 90 Q50 100, 70 90"
                stroke={`url(#${id})`}
                strokeWidth="5.5"
                strokeLinecap="round"
                fill="none"
            />
        </svg>
    );
}
