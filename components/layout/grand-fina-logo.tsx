type GrandFinaLogoProps = {
  placement: "sidebar" | "about";
};

export function GrandFinaLogo({ placement }: GrandFinaLogoProps) {
  const isAbout = placement === "about";

  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-md border font-semibold tracking-[0.14em] ${
        isAbout
          ? "size-16 border-[#b08a4a]/45 bg-[#b08a4a]/10 text-lg text-[var(--brand)]"
          : "size-10 border-[#b08a4a]/50 bg-[#b08a4a]/10 text-sm text-[#e8cf9e]"
      }`}
    >
      GF
    </span>
  );
}
