export function SyntheticOnlyBanner() {
  return (
    <div
      role="alert"
      data-testid="synthetic-only-banner"
      className="border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900"
    >
      <span className="font-semibold">Synthetic data only.</span>{" "}
      Not for clinical use. Do not enter real patient information.
    </div>
  );
}
