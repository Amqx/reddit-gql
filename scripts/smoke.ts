// Calls every implemented read method against Reddit and prints a summary.

import { readFile } from "node:fs/promises";

import { MissingOperationError, Reddit, RedditError } from "../src";

const file = process.env.REDDIT_TOKEN_FILE;

if (!file) {
    throw new Error("Set REDDIT_TOKEN_FILE");
}

const credentials = JSON.parse(await readFile(file, "utf8")) as {
    deviceId: string;
    edgeBucket?: string;
    loid: string;
    token: string;
};

const reddit = new Reddit(credentials);

type Check = [string, () => Promise<unknown>];

function summarize(value: unknown): string {
    if (Array.isArray(value)) {
        return `${value.length} items`;
    }

    if (value && typeof value === "object") {
        return Object.entries(value)
            .map(([key, item]) =>
                Array.isArray(item)
                    ? `${key}=${item.length}`
                    : item && typeof item === "object"
                      ? `${key}={…}`
                      : `${key}=${String(item).slice(0, 40)}`,
            )
            .join(" ");
    }

    return String(value);
}

const checks: Array<Check> = [
    ["feeds.home", () => reddit.feeds.home({ sort: "BEST" })],
    ["feeds.home TOP WEEK", () => reddit.feeds.home({ sort: "TOP", time: "WEEK" })],
    ["feeds.popular", () => reddit.feeds.popular({ sort: "HOT" })],
    ["feeds.community", () => reddit.feeds.community({ name: "pics", sort: "TOP", time: "DAY" })],
    ["feeds.user", () => reddit.feeds.user({ name: "spez", sort: "NEW" })],
    ["feeds.upvoted", () => reddit.feeds.upvoted()],
    ["feeds.downvoted", () => reddit.feeds.downvoted()],
    ["feeds.hidden", () => reddit.feeds.hidden()],
    ["feeds.mine", () => reddit.feeds.mine()],
    ["posts.get", () => reddit.posts.get({ id: "t3_1wubcvf" })],
    ["comments.get", () => reddit.comments.get({ id: "t1_pd1yg6t" })],
    ["communities.get", () => reddit.communities.get({ name: "redditdev" })],
    ["communities.mine", () => reddit.communities.mine()],
    ["communities.submission", () => reddit.communities.submission({ name: "redditdev" })],
    ["users.get", () => reddit.users.get({ name: "spez" })],
    ["users.me", () => reddit.users.me()],
    ["search.posts", () => reddit.search.posts({ query: "cats", sort: "TOP", time: "WEEK" })],
    ["search.posts community", () => reddit.search.posts({ community: "aww", query: "cats" })],
    ["search.communities", () => reddit.search.communities({ query: "python" })],
    ["search.users", () => reddit.search.users({ query: "spez" })],
    ["inbox.notifications", () => reddit.inbox.notifications()],
    ["inbox.unread", () => reddit.inbox.unread()],
    ["feeds.all", () => reddit.feeds.all({ sort: "HOT" })],
    ["feeds.saved", () => reddit.feeds.saved()],
    ["comments.list", () => reddit.comments.list({ postId: "t3_1wubcvf" })],
    [
        "comments.list thread",
        () => reddit.comments.list({ commentId: "t1_pd2cbu4", postId: "t3_1wubcvf" }),
    ],
    [
        "comments.list more",
        async () => {
            const { cursor } = await reddit.comments.list({ postId: "t3_1wubcvf" });

            return reddit.comments.list({ after: cursor, postId: "t3_1wubcvf" });
        },
    ],
    ["comments.user", () => reddit.comments.user({ name: "spez" })],
    ["comments.saved", () => reddit.comments.saved()],
];

// Mutations only run against ids that don't exist, so Reddit must reject them
const rejected: Array<Check> = [
    ["posts.upvote (fake id)", () => reddit.posts.upvote({ id: "t3_zzzzzzz" })],
    ["posts.save (fake id)", () => reddit.posts.save({ id: "t3_zzzzzzz" })],
    ["comments.upvote (fake id)", () => reddit.comments.upvote({ id: "t1_zzzzzzz" })],
    ["communities.favorite (fake id)", () => reddit.communities.favorite({ id: "t5_zzzzzzz" })],
];

let failed = 0;

for (const [name, run] of checks) {
    try {
        // sequential on purpose, to stay gentle on the rate limit
        // biome-ignore lint/performance/noAwaitInLoops: see above
        const result = await run();

        console.log(`ok    ${name.padEnd(26)} ${summarize(result)}`);
    } catch (error) {
        if (error instanceof MissingOperationError) {
            console.log(`skip  ${name.padEnd(26)} ${error.operation} has no hash`);

            continue;
        }

        failed += 1;

        console.log(`FAIL  ${name.padEnd(26)} ${(error as Error).message}`);
    }
}

for (const [name, run] of rejected) {
    try {
        // biome-ignore lint/performance/noAwaitInLoops: see above
        await run();

        failed += 1;

        console.log(`FAIL  ${name.padEnd(26)} was not rejected`);
    } catch (error) {
        const ok = error instanceof RedditError;

        failed += ok ? 0 : 1;

        console.log(
            `${ok ? "ok  " : "FAIL"}  ${name.padEnd(26)} rejected: ${(error as Error).message}`,
        );
    }
}

process.exit(failed ? 1 : 0);
