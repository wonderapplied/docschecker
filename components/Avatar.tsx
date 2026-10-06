/** Google profile photo, or the first letter when there isn't one. */
export default function Avatar({ src, name, size = 40 }: { src: string | null; name: string | null; size?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full" referrerPolicy="no-referrer" />;
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-panel-2 font-display font-bold"
      style={{ width: size, height: size, fontSize: size / 2.4 }}
    >
      {(name ?? "?")[0]}
    </span>
  );
}
