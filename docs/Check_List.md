# Integration Check List

Manual verification status for the frontend ↔ user-service / content-service integration.

**Legend**

- ✅ Tested — passing
- ❌ Tested — failing (symptom noted inline)
- ⬜ Not tested yet *(unused for now)*
- 🚧 Not implemented *(unused for now)*

## Home Page
- ✅ Click the Verita icon top left back to home page (from any other page)
- 🚧 Click one of the user avatar to the user profile page -> only some of them can e.g. alexchen
- ✅ Click red heart to like one of the post
- ✅ Click one of the post to see post detail
- ✅ User avatar from post card is from real user had avatar

## Authentication

- ✅ Log in with email `alex@example.com` and password `Password123!` -> seeded user `alexchen` (ADMIN)
- ✅ Sign up with email and password
- ✅ Stay logged in after refreshing the page

## User Profile

- ✅ View and edit profile info (avatar, bio, display name, organisation, website, research interests)
- ✅ Stay on the profile page after a refresh
- ✅ Publish a post and see it on the profile page
- ✅ Unpublish a created post — it moves to the drafts list and no longer shows on the profile page after navigating back
- ✅ Open a created post and the editor loads its existing content
- ✅ Publish a draft post — it moves to Posts and the card preview reflects the published content
- ✅ Edit an existing post and save it as draft — the card preview reflects the updated draft content (the editor now sends a freshly derived excerpt on save)

## Content Creation

- ✅ Create a post and see it in the user's profile
- ✅ Edit an existing post and publish
- ✅ Add cover image to a post
- ✅ Type one character then show available topics

> Note: The other function maybe possible e.g. the digest page has some data, but its the mock data. All the available UI not mentioned above is with mock data. The integration is not fully implemented yet.
