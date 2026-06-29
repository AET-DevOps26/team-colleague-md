# Standalone Topic page and subscription-driven Topic Filter

We extract Topic-Subscription management out of the Digest page into its own login-gated **Topic page** at `/topics` (sibling to Digest, entered from a new "Topic" sidebar item under "Digest"). It becomes the single home for all Topic-related surfaces, with future trends/radar features landing there too; Digest collapses to a single Past-Digests view. The one subscription set the page manages now drives **both** Digest generation and the Home **Topic Filter**: a logged-in caller's filter chips become their subscribed Topics instead of global Trending. Anonymous callers — and logged-in callers with zero subscriptions — fall back to the Trending Topics chips (plus, for the zero-subscription case, a prompt to go subscribe), so the guest discovery experience does not regress.

To keep the two consumers (Topic page and Topic Filter) in sync within a session, the followed-Topic set is lifted out of the Digest page into a shared `FollowedTopicsContext`, mirroring the existing `AuthContext`/`ModalContext` pattern, so a subscribe/unsubscribe reflects in both places immediately.

## Considered options

- **Keep Trending chips for everyone, page is just a navigation entry** — rejected: the user explicitly wants the filter to reflect what they actually follow.
- **Per-page independent fetches of the subscription set** — rejected: cross-surface staleness within a session; a context is the established pattern here.
- **Tabbed Topic page now** — deferred: only one surface exists today, so it ships as a single view; tabs are introduced when trends/radar arrive.

## Consequences

- The Settings → "Manage Topics" link repoints from `/digest?tab=topics` to `/topics`.
- The Topic Filter must join the subscription set (UUIDs, owned by recommendation-service) against the Topic catalog to recover each Topic's slug + display name for the chip and the feed query.
- Post-level `#tags` (Post Editor / post footer / feed cards) are a different concept (a tag *is* a Topic on the authoring side) and are out of scope for the Topic page.
