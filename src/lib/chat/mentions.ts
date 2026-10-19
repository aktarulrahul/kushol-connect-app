// @mentions (05 · owner 2026-10-19): the pure rules behind the composer picker, the send/edit
// paths and the bubble highlight. The api keeps the body plain text and stores the tagged member
// ids beside it (`ChatMessage.mentions`); the visible "@Full Name" text is matched back to the
// group roster here. Hermes-safe: no `\p{…}` escapes — boundaries are explicit character sets.

/** One roster row as the picker and the renderer need it. */
export type MentionMember = { userId: string; name: string };

/** The api's cap on distinct mentioned members per message (VALIDATION_FAILED above it). */
export const MAX_MENTIONS = 50;

/** Longest "@query" the picker follows before it gives up. */
const MAX_QUERY_LENGTH = 30;

/** Characters that may sit right before "@" or right after a name (space, punctuation, dari). */
const BOUNDARY = /[\s.,!?;:()[\]{}'"“”‘’…।॥/\\–—-]/;

/** True at the text edges and on whitespace/punctuation (pure — unit-pinned). */
export function isMentionBoundary(ch: string | undefined): boolean {
  return ch === undefined || ch === "" || BOUNDARY.test(ch);
}

/** The "@query" being typed: the text range [start, end) it occupies and the query itself. */
export type MentionQuery = { query: string; start: number; end: number };

/**
 * The mention being typed at the caret, or null (pure — unit-pinned). The "@" must open the
 * text or follow whitespace (so "rahim@school" is not a trigger); the query may hold single
 * inner spaces ("@Karim A") but no line break, no second "@" and no leading space.
 */
export function mentionQueryAt(text: string, caret: number = text.length): MentionQuery | null {
  const end = Math.max(0, Math.min(caret, text.length));
  const head = text.slice(0, end);
  const at = head.lastIndexOf("@");
  if (at < 0) return null;
  if (at > 0 && !/\s/.test(head.charAt(at - 1))) return null;
  const query = head.slice(at + 1);
  if (query.length > MAX_QUERY_LENGTH) return null;
  if (/^\s/.test(query) || /[\r\n@]/.test(query) || /\s\s/.test(query)) return null;
  return { query, start: at, end };
}

/**
 * Roster rows the picker offers for a query (pure — unit-pinned): never the viewer, matched
 * case-insensitively anywhere in the name, names that start with the query (or have a word that
 * does) first, at most `limit` rows.
 */
export function filterMentionCandidates(
  roster: ReadonlyArray<MentionMember>,
  query: string,
  meId: string | undefined,
  limit = 8,
): MentionMember[] {
  const q = query.trim().toLowerCase();
  const scored: { member: MentionMember; rank: number; index: number }[] = [];
  roster.forEach((member, index) => {
    if (member.userId === meId || !member.name.trim()) return;
    const name = member.name.toLowerCase();
    if (q && !name.includes(q)) return;
    const rank = !q || name.startsWith(q) ? 0 : name.split(/\s+/).some((w) => w.startsWith(q)) ? 1 : 2;
    scored.push({ member, rank, index });
  });
  return scored
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.member);
}

/**
 * Replaces the typed "@query" with "@Full Name " (pure — unit-pinned). Returns the new text and
 * the caret position right after the inserted mention and its trailing space.
 */
export function insertMention(
  text: string,
  at: MentionQuery,
  name: string,
): { text: string; caret: number } {
  const before = text.slice(0, at.start);
  const after = text.slice(at.end);
  const token = `@${name}`;
  if (/^\s/.test(after)) {
    return { text: `${before}${token}${after}`, caret: before.length + token.length + 1 };
  }
  return { text: `${before}${token} ${after}`, caret: before.length + token.length + 1 };
}

/** One "@Name" occurrence in a body: [start, end) and the member it names. */
export type MentionHit = { start: number; end: number; member: MentionMember };

/**
 * Every "@Full Name" in `body` that names one of `members` (pure — unit-pinned). The longest name
 * wins ("@Karim Ahmed" over "@Karim"); the "@" must follow a boundary and the name must end on
 * one, so "@Karimul" does not match "Karim".
 */
export function findMentions(body: string, members: ReadonlyArray<MentionMember>): MentionHit[] {
  const named = members
    .filter((m) => m.name.trim().length > 0)
    .sort((a, b) => b.name.length - a.name.length);
  const hits: MentionHit[] = [];
  if (named.length === 0) return hits;
  let from = 0;
  while (from < body.length) {
    const at = body.indexOf("@", from);
    if (at < 0) break;
    const member =
      at > 0 && !isMentionBoundary(body.charAt(at - 1))
        ? undefined
        : named.find(
            (m) =>
              body.startsWith(m.name, at + 1) &&
              isMentionBoundary(body.charAt(at + 1 + m.name.length)),
          );
    if (member) {
      const end = at + 1 + member.name.length;
      hits.push({ start: at, end, member });
      from = end;
    } else {
      from = at + 1;
    }
  }
  return hits;
}

/** A body split into plain runs and mention runs (the bubble renders mentions highlighted). */
export type MentionSegment = { text: string; mention: boolean; userId?: string };

/**
 * Splits a body into plain text and "@Name" runs for the given mentioned members (pure —
 * unit-pinned). Members the roster could not resolve are simply absent, so their text stays
 * plain — the fallback for old messages and people who left the group.
 */
export function mentionSegments(
  body: string,
  members: ReadonlyArray<MentionMember> | undefined,
): MentionSegment[] {
  const hits = findMentions(body, members ?? []);
  if (hits.length === 0) return [{ text: body, mention: false }];
  const out: MentionSegment[] = [];
  let last = 0;
  for (const hit of hits) {
    if (hit.start > last) out.push({ text: body.slice(last, hit.start), mention: false });
    out.push({ text: body.slice(hit.start, hit.end), mention: true, userId: hit.member.userId });
    last = hit.end;
  }
  if (last < body.length) out.push({ text: body.slice(last), mention: false });
  return out;
}

/** Roster rows for a message's mention ids, in roster order; unknown ids drop out (pure). */
export function mentionedMembers(
  mentionIds: ReadonlyArray<string> | undefined,
  roster: ReadonlyArray<MentionMember> | undefined,
): MentionMember[] {
  if (!mentionIds || mentionIds.length === 0 || !roster) return [];
  const wanted = new Set(mentionIds);
  return roster.filter((m) => wanted.has(m.userId));
}

/** True when someone else's message tags the viewer — the bubble is tinted (pure). */
export function mentionsViewer(
  message: { senderId: string; mentions?: ReadonlyArray<string> | undefined },
  meId: string,
): boolean {
  return message.senderId !== meId && (message.mentions ?? []).includes(meId);
}

/**
 * The member ids a body tags on send (pure — unit-pinned): every "@Full Name" still in the text
 * that names a picked member or, failing that, exactly one roster member (a name two members
 * share counts only when picked). The viewer is never included; duplicates collapse; order
 * follows the text.
 */
export function collectMentionIds(
  body: string,
  picked: ReadonlyArray<MentionMember>,
  roster: ReadonlyArray<MentionMember>,
  meId: string | undefined,
): string[] {
  const pickedNames = new Set(picked.map((m) => m.name));
  const nameCount = new Map<string, number>();
  for (const m of roster) nameCount.set(m.name, (nameCount.get(m.name) ?? 0) + 1);
  const pool: MentionMember[] = [
    ...picked,
    ...roster.filter((m) => !pickedNames.has(m.name) && nameCount.get(m.name) === 1),
  ];
  const ids: string[] = [];
  for (const hit of findMentions(body, pool)) {
    const id = hit.member.userId;
    if (id !== meId && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/**
 * The `mentions` field of an edit (pure — unit-pinned): `undefined` (omit — the api keeps the
 * stored mentions) when the roster is unknown or the set did not change; otherwise the new list
 * (`[]` clears). Ids of people no longer on the roster are never re-sent (the api would refuse
 * them), so an edit drops their mention.
 */
export function editMentions(
  body: string,
  original: ReadonlyArray<string> | undefined,
  picked: ReadonlyArray<MentionMember>,
  roster: ReadonlyArray<MentionMember> | undefined,
  meId: string | undefined,
): string[] | undefined {
  if (!roster) return undefined;
  const known = mentionedMembers(original, roster);
  const next = collectMentionIds(body, [...known, ...picked], roster, meId);
  const before = new Set(original ?? []);
  const same = next.length === before.size && next.every((id) => before.has(id));
  return same ? undefined : next;
}
