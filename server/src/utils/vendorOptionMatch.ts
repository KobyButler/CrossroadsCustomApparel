// Shared helper for spotting when a Crossroads product's configured color or
// size no longer matches what its vendor (currently: SanMar) actually calls
// it — SanMar occasionally renames/re-codes a color on their end without any
// notice, so a value that was valid when the product was set up can quietly
// stop matching. Used both to enrich the order-time error thrown from
// sanmar.ts and to power the proactive "flag it" check surfaced in the
// admin Products UI. See DESIGN.md-adjacent context: this is deliberately a
// suggestion, never a silent auto-correction — a human always confirms the
// actual fix (via the product edit form's "Pick from SanMar" panel), since
// an automated guess feeding directly into a real vendor purchase order is
// too high-stakes to make unattended.

export function normalizeOption(s: unknown): string {
    return String(s ?? '').trim().toLowerCase();
}

// Simple, dependency-free word-overlap score — good enough for the kind of
// near-miss this actually catches in practice ("Athletic Grey" vs "Athletic
// Heather" share "athletic"; a genuinely unrelated color shares nothing).
// Not a full edit-distance metric on purpose: a cheap, explainable heuristic
// that only ever produces a suggestion when there's real word overlap is
// safer than one that confidently matches unrelated strings.
function wordOverlapScore(a: string, b: string): number {
    const aWords = new Set(normalizeOption(a).split(/\s+/).filter(Boolean));
    const bWords = new Set(normalizeOption(b).split(/\s+/).filter(Boolean));
    let score = 0;
    for (const w of aWords) if (bWords.has(w)) score++;
    return score;
}

// Given a value that doesn't match `validValues` (case/whitespace-insensitive),
// returns the single best-scoring candidate if — and only if — it's an
// unambiguous winner (strictly higher word-overlap than every other
// candidate, and at least one shared word). Returns null rather than
// guessing when nothing scores, or when two candidates tie — an ambiguous
// suggestion is worse than none.
export function suggestClosestOption(wanted: string, validValues: string[]): string | null {
    const uniqueValid = [...new Set(validValues.filter(Boolean))];
    let best: string | null = null;
    let bestScore = 0;
    let tied = false;
    for (const candidate of uniqueValid) {
        const score = wordOverlapScore(wanted, candidate);
        if (score > bestScore) { best = candidate; bestScore = score; tied = false; }
        else if (score === bestScore && score > 0) { tied = true; }
    }
    return bestScore > 0 && !tied ? best : null;
}

export function optionMatches(wanted: unknown, validValues: string[]): boolean {
    const w = normalizeOption(wanted);
    return validValues.some(v => normalizeOption(v) === w);
}
