# Integration Check List

Manual verification status for the frontend ↔ user-service / content-service integration.

**Legend**

- ✅ Tested — passing
- ❌ Tested — failing (symptom noted inline)
- ⬜ Not tested yet *(unused for now)*
- 🚧 Not implemented *(unused for now)*

## Home Page
- ✅ Click the Verita icon top left back to home page (from any other page)

## Authentication

- ✅ Log in and sign up with email and password
- ✅ Stay logged in after refreshing the page

## User Profile

- ✅ View and edit profile info (avatar, bio, display name, organisation, website, research interests)
- ✅ Stay on the profile page after a refresh
- ✅ Publish a post and see it on the profile page
- ✅ Unpublish a created post — it moves to the drafts list and no longer shows on the profile page after navigating back
- ✅ Open a created post and the editor loads its existing content
- ✅ Publish a draft post — it moves to Posts and the card preview reflects the published content

## Content Creation

- ✅ Create a post and see it in the user's profile
- ✅ Edit an existing post and publish
- ✅ Add cover image to a post
- ✅ Type one character then show available topics
