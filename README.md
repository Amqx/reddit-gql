# reddit-gql

A Reddit client backed by Reddit's GraphQL API (`gql-fed.reddit.com`), using
the persisted queries from the official Android app. It was written for
[Acorn](https://github.com/Amqx/acorn) as a replacement for upstream's private
`@alizahid/reddit` package and exposes the same `Reddit` class and types.

## Usage

```ts
import { Reddit } from '@ryst/reddit-gql'

const reddit = new Reddit({ deviceId, edgeBucket, loid, token })

const { cursor, posts } = await reddit.feeds.home({ sort: 'BEST' })
```

The source is TypeScript and is shipped as is, so the consuming bundler
(Metro, Bun, Vite, …) compiles it.

## Development

```sh
bun install
bun run lint
bun run typecheck
REDDIT_TOKEN_FILE=/path/to/token.json bun run smoke
```

The token file holds `{ token, loid, deviceId, edgeBucket? }`. The smoke test
only reads; mutations are only sent with nonexistent ids and are expected to
fail.

## How requests work

- **Auth:** the caller supplies the access token. Acorn gets one by
  exchanging the `reddit_session` cookie with the Android app's OAuth client.
  Requests send `Authorization: Bearer`, `x-reddit-loid`, `x-reddit-device-id`,
  `client-vendor-id`, the Android `User-Agent`, and the `edgebucket` cookie.
- **Persisted queries only:** `gql-fed` rejects raw query text with a
  misleading `NOT_AUTHENTICATED` error. Each request sends `operationName`
  plus `extensions.persistedQuery.sha256Hash`. No request signing is needed.
- **Rate limit:** about 800 requests per window, reported in
  `x-ratelimit-remaining`.
- **Mutations** take a single `$input` and report most failures inside the
  payload (`ok: false`, `errors`, `fieldErrors`). `Reddit#mutate` turns those
  into a `RedditError`.

All operations live in `src/operations.ts`. `bun run smoke` calls every read
against Reddit and checks that mutations on nonexistent ids are rejected.

## Where the hashes come from

The Android app's Apollo Kotlin classes keep each operation's hash, name and
full query text. Decompile the APK with jadx and search for the operation
name: the class returns the hash, the name and the document, which also gives
the exact variables and selected fields.

To check variables without running anything, send a wrongly typed value such
as `[[[]]]`. The router answers `invalid input value at $input.field: …
GraphQL type T` and stops before execution. Unknown top-level variables are
ignored silently. Unknown fields nested inside an input are passed on to the
backend, so only probe those with nonexistent ids.

## Operations

### Reads

| Method | Operation | Notes |
| --- | --- | --- |
| `feeds.home` | `HomeElements` | `sort`, `range`, `after`, `pageSize`, empty `experienceInputs` and `advancedConfiguration` |
| `feeds.popular` | `PopularFeedElements` | `sort`, `range`, `after`, `pageSize` |
| `feeds.community` | `SubredditFeedElements` | `subredditName`, `sort`, `range`, `after`, `pageSize`, `includeSubredditInPosts` (required) |
| `feeds.user` | `UserSubmittedPosts` | `username`, `sort`, `range`, `after`, `pageSize` |
| `feeds.upvoted` / `downvoted` / `hidden` | `UpvotedPosts` / `DownvotedPosts` / `HiddenPosts` | `after`, `pageSize` |
| `feeds.all` / `saved` / `custom` | `AllFeedSdui` / `SavedPostsFeedSdui` / `CustomFeedSdui` | Server-driven UI feeds: they return cells grouped by post id (`groupId`), not post data. The client takes the ids and loads the posts with `PostsByIds`. `sort`, `time`, `after`; `path` for custom feeds. |
| `feeds.mine` | `MyMultireddits` | `after`. Item shape unverified. |
| `posts.get` | `PostsByIds` | `ids`. Returns `postTitle`, not `title`. |
| `comments.list` | `PostComments` | `id` (post), `sortType`, `after`, `count`, `maxDepth`, `focusedCommentContext: {commentId, isFocusedThreadOnly}` for a single thread. `includePremiumAvatarTreatment` and `includeConsistencyToken` are required. Returns a flat list of `trees` with `depth` and `parentId`. A `more` entry with a parent becomes a `CommentMore`; the one without a parent is the cursor for the next page of top-level comments. |
| `comments.get` | `GetCommentById` | `id` |
| `comments.user` / `saved` | `SubmittedComments` / `SavedComments` | These only select a preview, so the client loads the full comments with `LiveCommentsByIds` (`ids`, `includePremiumAvatarTreatment`). |
| `communities.get` | `SubredditInfoByName` | `subredditName` plus `include*` flags |
| `communities.mine` | `SubscribedSubreddits` | `first`, `after`. Also returns followed profiles. |
| `communities.submission` | `SubredditInfoByName` + `GetPostRequirements` + `GetFlairs` | |
| `users.get` | `ProfileDetailsByName` + `SearchPeople` | The account id, karma and follow settings come from an exact-name match in `SearchPeople`. |
| `users.me` | `GetAccount` | Six `include*` booleans are required. Gives the username, then calls `users.get`. |
| `search.posts` / `communities` / `users` | `SearchPosts` / `SearchCommunities` / `SearchPeople` | `query` (`subreddit:<name>` restricts posts to a community), `afterCursor`, `pageSize`, `filters` (`time_range`), `productSurface` |
| `inbox.notifications` | `GetInboxNotificationFeed` | `after`, `pageSize` |
| `inbox.unread` | `BadgeCount` | none |

### Mutations

| Method | Operation | `$input` |
| --- | --- | --- |
| `posts.upvote` / `downvote` / `unvote` | `UpdatePostVoteState` | `postId`, `voteState: UP \| DOWN \| NONE` |
| `comments.upvote` / `downvote` / `unvote` | `UpdateCommentVoteState` | `commentId`, `voteState` |
| `posts.save` / `unsave` | `UpdatePostSaveState` | `postId`, `saveState: SAVED \| NONE` |
| `comments.save` / `unsave` | `UpdateCommentSaveState` | `commentId`, `saveState: SAVED \| NONE` |
| `posts.hide` / `unhide` | `UpdatePostHideState` | `postId`, `hideState: HIDDEN \| NONE` |
| `posts.delete` / `comments.delete` | `DeletePost` / `DeleteComment` | `postId` / `commentId` |
| `comments.edit` | `UpdateComment` | `commentId`, `content: {markdown}` |
| `comments.create` | `CreateComment` | `postId`, `parentId`, `content: {markdown}`. Returns `commentInfo`. |
| `posts.create` | `CreateSubredditPost`, `CreateSubredditPostWithVideo`, `CreateProfilePost` | `subredditName` (not for profile posts), `title`, `isNsfw`, `isSpoiler`, `isSendReplies`, `flair: {id}`, `content: {markdown}`, `link: {url}`, `image: {url}`, `video: {url, posterUrl}` |
| `posts.upload` | `CreateMediaUploadLease` | `mimetype: JPEG \| PNG \| GIF \| WEBP \| MP4 \| QUICKTIME`. Returns `uploadLeaseUrl` and `uploadLeaseHeaders`. The client posts the file there as a form, with the headers as fields, and returns `<uploadLeaseUrl>/<key>`. |
| `posts.report` / `comments.report` | `ReportPost` / `ReportComment` | `postId` / `commentId`, `siteRule: RuleID` |
| `communities.join` / `leave` | `UpdateSubredditSubscriptions` | `inputs: [{subredditId, subscribeState: SUBSCRIBED \| NONE}]` |
| `communities.favorite` / `unfavorite`, `users.favorite` / `unfavorite` | `UpdateSubredditFavoriteState` | `subredditId`, `favoriteState: FAVORITED \| NONE`. For users this is the profile's subreddit. |
| `users.follow` / `unfollow` | `UpdateProfileFollowState` | `accountId` (`t2_…`), `state: FOLLOWED \| NONE` |
| `inbox.markRead` | `ReadNotificationLoggedIn` | `notificationId` (optional `groupType`, `groupContentId`) |
| `inbox.markAllRead` | `MarkInboxAsRead` | `types: [NOTIFICATIONS]` |

## App-version drift

App 2026.41.0 no longer contains `HomeElements`, `PopularFeedElements`,
`SubredditFeedElements`, `UserSubmittedPosts`, `SearchCommunities` or
`BadgeCount`. The newer app uses server-driven feeds (`HomeFeedSdui`,
`PopularFeedSdui`, `SubredditFeedSdui`, `SubmittedPostsFeedSdui`, …). The older
hashes still work, but Reddit may retire them. If they stop working, move
those feeds to their `*Sdui` operations, the same way `feeds.all` works.
