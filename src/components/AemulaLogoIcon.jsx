import clsx from 'clsx';

export function AemulaLogoIcon({ className, glow = 'sm', variant = 'dark', ...props }) {
    const isDark = variant === 'dark';

    const glowClass = isDark
        ? glow === 'lg'
            ? "[filter:drop-shadow(0_0_3px_rgba(245,245,244,0.4))_drop-shadow(0_0_12px_rgba(245,245,244,0.1))]"
            : "[filter:drop-shadow(0_0_2px_rgba(245,245,244,0.2))_drop-shadow(0_0_6px_rgba(245,245,244,0.1))]"
        : glow === 'lg'
            ? "[filter:drop-shadow(0_0_2px_rgba(39,39,42,0.4))_drop-shadow(0_0_5px_rgba(39,39,42,0.2))]"
            : "[filter:drop-shadow(0_0_1px_rgba(39,39,42,0.2))_drop-shadow(0_0_5px_rgba(39,39,42,0.1))]"

    return (
        <svg
            viewBox="0 0 2205 2205"
            shapeRendering="geometricPrecision"
            className={clsx(
                'fill-current',
                isDark ? 'text-stone-100' : 'text-zinc-800',
                glowClass,
                className
            )}
            role='img'
            {...props}
        >
            <defs>
                <filter id="aemula-glow">
                    <feDropShadow
                        dx="0"
                        dy="0"
                        stdDeviation="18"
                        floodColor="currentColor"
                        floodOpacity="0.8"
                    />
                </filter>
            </defs>

            <path d="M1516.684 394.84 415.73 2302.182l548.086 6.181-153.248 275.848 1420.586 2.088-165.039-284.117H971.43v-188.018l524.363-902.488v563.295a145.192 138.925 0 0 0-114.9 135.506 145.192 138.925 0 0 0 145.191 138.925 145.192 138.925 0 0 0 145.191-138.925 145.192 138.925 0 0 0-129.504-138.084l2.07-562.807 524.362 908.756 2.09 183.84 549.432 4.18z" transform="translate(-415.228 -388.07)"/>
        </svg>
    )
};
