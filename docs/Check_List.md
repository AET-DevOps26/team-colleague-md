# Integration Check List

Manual verification status for the frontend ↔ user-service / content-service integration.

**Legend**

- ✅ Tested — passing
- ❌ Tested — failing (symptom noted inline)
- ⬜ Not tested yet *(unused for now)*
- 🚧 Not implemented *(unused for now)*

## Home Page
- ✅ Click the Verita icon top left back to home page (from any other page)
- ✅ Click one of the user avatar to the user profile page -> only some of them can e.g. alexchen
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

## Settings
- ✅ Sign out the current user and see the home page without the user avatar on the top right
- ✅ Turn on/off the show my bookmarks in setting and other users can see the change in the profile page
- ✅ Turn on/off the show my likes in setting and other users can see the change in the profile page

## Content Creation
- ✅ Create a post and see it in the user's profile
- ✅ Edit an existing post and publish
- ✅ Add cover image to a post
- ✅ Type one character then show available topics

## Post Detail
- ✅ Click bookmark and like button in post detail page, then see it in user profile page
- ✅ Leave a comment and see it in the post detail page
- ✅ Reply to a user's comment and see it in the post detail page
- ✅ Filter comments by "Top", "Newest" and "Oldest" in post detail page


## Topics
- ✅ Click follow of a topic and see it in the home page topic filter under the search bar
- ✅ Click follow of a topic and refresh the page, then back to the topic page, the topic is still followed


## User Experience
- ✅ Sign in and see "Welcome back, [display name]" in the home page.
- ✅ Sign up a new account and see "Welcome to Verita — your first digest arrives [weekday]".
- ✅ See "Following [topic name]" and "Unfollow [topic name]" in the topic page after following/unfollowing a topic.
- ✅ Try to follow past the cap and see "You can follow up to [N] topics — unfollow one first".
- ✅ There is a undo button after clicking unfollow topic accidentally.
- ✅ See "Settings saved" message after changing settings.
- ✅ Save the profile and see "Profile updated".
- ✅ Bookmark / un-bookmark a post and see "Saved to bookmarks" / "Removed from bookmarks".
- ✅ Share a post and see "Link copied to clipboard".
- ✅ Publish a post and see "Draft published"; unpublish and see "Post moved to Drafts".
- ✅ Delete a post / draft and see "Post deleted" / "Draft deleted".
- ✅ Upload a cover / inline image in the editor and see "Cover image uploaded" / "Image uploaded".
- ✅ Error toasts appear on failed actions (like, publish, unpublish, bookmark, settings save, unfollow all).


> Note: this list records the manually verified flows. Features not listed here (e.g. the
> digest pages and the admin panel) also run against the real backend — there is no in-app
> mock layer anymore — but their verification is covered by the automated tests instead
> (see [Frontend Testing](testing/Frontend_Testing.md)).
