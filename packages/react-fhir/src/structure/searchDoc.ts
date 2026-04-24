/**
 * Cross-resource FHIR search parameters (e.g. `identifier`, `patient`,
 * `subject`) carry a single `SearchParameter.description` that concatenates
 * per-resource helper text as a bullet list prefixed with `"Multiple
 * Resources:"`. Rendering it verbatim produces hundreds of lines of noise on
 * every field. This helper extracts the bullet that matches the caller's
 * resource type, or falls back to the first sentence.
 */
export function clipSearchParamDoc(
  doc: string | undefined,
  resourceType: string,
): string | undefined {
  if (!doc) return undefined;

  if (/^\s*Multiple Resources\s*:/i.test(doc)) {
    // Look for `* [ResourceType](...): <text>` up to the next `* [` bullet
    // or end of string. Escape resource type for regex safety.
    const safe = resourceType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `\\*\\s*\\[${safe}\\][^:]*:\\s*([\\s\\S]+?)(?=\\s*\\*\\s*\\[|$)`,
      "i",
    );
    const match = doc.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/\s+/g, " ");
    // Couldn't find a per-resource bullet; fall through to first-sentence.
  }

  const firstSentence = (doc.split(/(?<=\.)\s+|\n/)[0] ?? "").trim();
  if (firstSentence.length <= 140) return firstSentence;
  return firstSentence.slice(0, 140).trimEnd() + "…";
}
