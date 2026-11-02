import { formatMoney } from "@/lib/money";

/** Dependency-free SVG bar chart of daily paid sales. */
export function SalesChart({ data }: { data: { day: string; paid: number; orders: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.paid));
  const w = 720;
  const h = 200;
  const bw = w / Math.max(1, data.length);
  const total = data.reduce((s, d) => s + d.paid, 0);
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h + 24}`} className="h-56 w-full" role="img" aria-label={`Daily paid sales, total ${formatMoney(total)}`}>
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={0} x2={w} y1={h - h * t} y2={h - h * t} stroke="#E4DACB" strokeDasharray="4 4" />
        ))}
        {data.map((d, i) => {
          const bh = (d.paid / max) * (h - 8);
          return (
            <g key={d.day}>
              <rect x={i * bw + bw * 0.15} y={h - bh} width={bw * 0.7} height={Math.max(bh, d.paid ? 2 : 0)} rx={Math.min(3, bw * 0.2)} fill="#173D2F">
                <title>{`${d.day}: ${formatMoney(d.paid)} · ${d.orders} orders`}</title>
              </rect>
              {(i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 6) === 0) && (
                <text x={i * bw + bw / 2} y={h + 16} fontSize="11" textAnchor="middle" fill="#6F5B4E">{d.day.slice(5)}</text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="sr-only">
        <table><tbody>{data.map((d) => <tr key={d.day}><td>{d.day}</td><td>{formatMoney(d.paid)}</td></tr>)}</tbody></table>
      </figcaption>
    </figure>
  );
}
