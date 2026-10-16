import type * as enums from "./enums";
import { type OperationKey, operations } from "./operations";
import {
    type CommentData,
    type CommentTree,
    type Connection,
    type MutationResult,
    type NotificationData,
    type PostData,
    type Redditor,
    type Subreddit,
} from "./schema";
import {
    cursor,
    isPostNode,
    nodes,
    transformComment,
    transformCommentTree,
    transformCommunity,
    transformFlair,
    transformNotification,
    transformPost,
    transformProfile,
    transformUser,
} from "./transformers";
import { RedditError, type RedditOptions, Transport } from "./transport";
import {
    type Comment,
    type Community,
    type Feed,
    type Notification,
    type Page,
    type Post,
    type Profile,
    type Submission,
    type SubmissionRequirements,
    type User,
} from "./types";

const PAGE_SIZE = 25;

const COMMENT_COUNT = 50;
const COMMENT_DEPTH = 8;

const trailingSlashRegex = /\/$/;

type Id = {
    id: string;
};

type Paging = {
    after?: string | null;
};

type Sorting<Sort> = Paging & {
    sort?: Sort;
    time?: enums.PostFeedRange;
};

type PostsPage = Page<"posts", Post>;

type FeedConnection = Connection<{
    __typename?: string;
    postInfo?: unknown;
}>;

// server-driven feeds (r/all, saved, custom feeds) return UI cells grouped
// by post id instead of post data
type SduiFeed = {
    elements?: {
        edges?: Array<{
            node?: {
                groupId?: string | null;
            } | null;
        } | null> | null;
        pageInfo?: {
            endCursor?: string | null;
        } | null;
    } | null;
} | null;

type CommentList = Connection<CommentData>;

const mimeTypes: Record<string, string> = {
    "image/gif": "GIF",
    "image/jpeg": "JPEG",
    "image/jpg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WEBP",
    "video/mp4": "MP4",
    "video/quicktime": "QUICKTIME",
};

function range(sort?: string, time?: enums.PostFeedRange) {
    return sort === "TOP" || sort === "CONTROVERSIAL" ? time : undefined;
}

function toPosts(connection?: FeedConnection | Connection<unknown> | null) {
    return {
        cursor: cursor(connection),
        posts: nodes(connection as Connection<{ postInfo?: unknown }>).flatMap((node) => {
            const post = "postInfo" in node ? node.postInfo : node;

            return isPostNode(post) ? [transformPost(post)] : [];
        }),
    } satisfies PostsPage;
}

export class Reddit {
    private readonly transport: Transport;

    constructor(options: RedditOptions) {
        this.transport = new Transport(options);
    }

    // Runs a mutation that takes a single `$input` and checks its result,
    // because Reddit reports most failures inside the payload.
    private async mutate<Result extends MutationResult>(
        key: OperationKey,
        input: Record<string, unknown>,
    ): Promise<Result> {
        const data = await this.transport.gql<Record<string, Result | null>>(key, {
            input,
        });

        const [result] = Object.values(data);

        const error = result?.errors?.find(Boolean) ?? result?.fieldErrors?.find(Boolean);

        if (error || !result?.ok) {
            throw new RedditError(
                `${operations[key].name}: ${error?.message ?? "Request failed"}`,
                {
                    code: (error && "code" in error ? error.code : undefined) ?? undefined,
                },
            );
        }

        return result;
    }

    private async postsByIds(ids: Array<string>): Promise<Array<Post>> {
        const data = await this.transport.gql<{
            postsInfoByIds?: Array<unknown> | null;
        }>("postsByIds", {
            ids,
            includePostContentPostHint: true,
            includePostContentThumbnailEnabled: true,
        });

        return (data.postsInfoByIds ?? []).flatMap((post) =>
            isPostNode(post) ? [transformPost(post)] : [],
        );
    }

    private async sduiPosts(feed?: SduiFeed): Promise<PostsPage> {
        const ids = [
            ...new Set(
                (feed?.elements?.edges ?? []).flatMap((edge) => {
                    const id = edge?.node?.groupId;

                    return id?.startsWith("t3_") ? [id] : [];
                }),
            ),
        ];

        if (ids.length === 0) {
            return {
                cursor: null,
                posts: [],
            };
        }

        return {
            cursor: feed?.elements?.pageInfo?.endCursor || null,
            posts: await this.postsByIds(ids),
        };
    }

    // Comment lists only select a preview, so the full comments are loaded by id
    private async hydrateComments(
        connection?: CommentList | null,
    ): Promise<Page<"comments", Comment>> {
        const items = nodes(connection).filter(
            (item) => item.__typename === undefined || item.__typename === "Comment",
        );

        const data =
            items.length > 0
                ? await this.transport.gql<{
                      commentsByIds?: Array<CommentData | null> | null;
                  }>("commentsByIds", {
                      ids: items.map((item) => item.id),
                      includePremiumAvatarTreatment: false,
                  })
                : null;

        const full = new Map(
            (data?.commentsByIds ?? []).flatMap((item) => (item ? [[item.id, item] as const] : [])),
        );

        return {
            comments: items.map((item) => ({
                data: transformComment({
                    ...item,
                    ...full.get(item.id),
                    postInfo: item.postInfo,
                }),
                type: "reply" as const,
            })),
            cursor: cursor(connection),
        };
    }

    readonly feeds = {
        all: async ({
            after,
            sort = "HOT",
            time,
        }: Sorting<enums.PostFeedSort> = {}): Promise<PostsPage> => {
            const data = await this.transport.gql<{
                allV3?: SduiFeed;
            }>("allFeed", {
                after,
                sort,
                time: range(sort, time),
            });

            return this.sduiPosts(data.allV3);
        },

        community: async ({
            after,
            name,
            sort = "HOT",
            time,
        }: Sorting<enums.PostFeedSort> & {
            name: string;
        }): Promise<PostsPage> => {
            const data = await this.transport.gql<{
                postFeed?: {
                    elements?: FeedConnection;
                } | null;
            }>("subredditFeed", {
                after,
                includeSubredditInPosts: true,
                pageSize: PAGE_SIZE,
                range: range(sort, time),
                sort,
                subredditName: name,
            });

            return toPosts(data.postFeed?.elements);
        },

        custom: async ({
            after,
            path,
            sort = "HOT",
            time,
        }: Sorting<enums.PostFeedSort> & {
            path: string;
        }): Promise<PostsPage> => {
            const data = await this.transport.gql<{
                customFeedV3?: SduiFeed;
            }>("customFeed", {
                after,
                path,
                sort,
                time: range(sort, time),
            });

            return this.sduiPosts(data.customFeedV3);
        },

        downvoted: async ({ after }: Paging = {}): Promise<PostsPage> => {
            const data = await this.transport.gql<{
                identity?: {
                    downvotedPosts?: Connection<PostData>;
                } | null;
            }>("downvotedPosts", {
                after,
                includeSubredditInPosts: true,
                pageSize: PAGE_SIZE,
            });

            return toPosts(data.identity?.downvotedPosts);
        },

        hidden: async ({ after }: Paging = {}): Promise<PostsPage> => {
            const data = await this.transport.gql<{
                identity?: {
                    hiddenPosts?: Connection<PostData>;
                } | null;
            }>("hiddenPosts", {
                after,
                includeSubredditInPosts: true,
                pageSize: PAGE_SIZE,
            });

            return toPosts(data.identity?.hiddenPosts);
        },

        home: async ({
            after,
            sort = "BEST",
            time,
        }: Sorting<enums.PostFeedSort> = {}): Promise<PostsPage> => {
            const data = await this.transport.gql<{
                postFeed?: {
                    elements?: FeedConnection;
                } | null;
            }>("homeFeed", {
                advancedConfiguration: {
                    eligibleExperienceOverrides: [],
                    propertyProviderOverrides: [],
                },
                after,
                experienceInputs: [],
                pageSize: PAGE_SIZE,
                range: range(sort, time),
                sort,
            });

            return toPosts(data.postFeed?.elements);
        },

        mine: async ({ after }: Paging = {}): Promise<Page<"feeds", Feed>> => {
            const data = await this.transport.gql<{
                identity?: {
                    allMultireddits?: Connection<{
                        createdAt?: string | null;
                        displayName?: string | null;
                        icon?: string | null;
                        id?: string | null;
                        name?: string | null;
                        path?: string | null;
                        subreddits?: Connection<Subreddit> | Array<Subreddit> | null;
                    }>;
                } | null;
            }>("myCustomFeeds", {
                after,
            });

            const connection = data.identity?.allMultireddits;

            return {
                cursor: cursor(connection),
                feeds: nodes(connection).map((feed) => {
                    const subreddits = Array.isArray(feed.subreddits)
                        ? feed.subreddits
                        : nodes(feed.subreddits);

                    return {
                        communities: subreddits.map((item) => item.name),
                        createdAt: feed.createdAt ? new Date(feed.createdAt) : new Date(0),
                        id: feed.name ?? feed.id ?? "",
                        image: feed.icon ?? undefined,
                        name: feed.displayName ?? feed.name ?? "",
                        path: feed.path ?? "",
                    };
                }),
            };
        },

        popular: async ({
            after,
            sort = "HOT",
            time,
        }: Sorting<enums.PostFeedSort> = {}): Promise<PostsPage> => {
            const data = await this.transport.gql<{
                popular?: {
                    elements?: FeedConnection;
                } | null;
            }>("popularFeed", {
                after,
                pageSize: PAGE_SIZE,
                range: range(sort, time),
                sort,
            });

            return toPosts(data.popular?.elements);
        },

        saved: async ({ after }: Paging = {}): Promise<PostsPage> => {
            const data = await this.transport.gql<{
                savedV3?: SduiFeed;
            }>("savedPosts", {
                after,
            });

            return this.sduiPosts(data.savedV3);
        },

        upvoted: async ({ after }: Paging = {}): Promise<PostsPage> => {
            const data = await this.transport.gql<{
                identity?: {
                    upvotedPosts?: Connection<PostData>;
                } | null;
            }>("upvotedPosts", {
                after,
                includeSubredditInPosts: true,
                pageSize: PAGE_SIZE,
            });

            return toPosts(data.identity?.upvotedPosts);
        },

        user: async ({
            after,
            name,
            sort = "NEW",
            time,
        }: Sorting<enums.ProfileFeedSort> & {
            name: string;
        }): Promise<PostsPage> => {
            const data = await this.transport.gql<{
                postFeed?: {
                    posts?: Connection<PostData>;
                } | null;
            }>("userPosts", {
                after,
                includeSubredditInPosts: true,
                pageSize: PAGE_SIZE,
                range: range(sort, time),
                sort,
                username: name,
            });

            return toPosts(data.postFeed?.posts);
        },
    };

    readonly posts = {
        create: async (input: {
            body?: string;
            community?: string;
            flair?: {
                id: string;
            };
            images?: Array<{
                id: string;
                url: string;
            }>;
            nsfw: boolean;
            spoiler: boolean;
            title: string;
            url?: string;
            video?: {
                id: string;
                poster: {
                    id: string;
                    url: string;
                };
                url: string;
            };
        }): Promise<Id> => {
            const image = input.images?.[0];

            const fields = {
                content: input.body
                    ? {
                          markdown: input.body,
                      }
                    : undefined,
                flair: input.flair
                    ? {
                          id: input.flair.id,
                      }
                    : undefined,
                image: image
                    ? {
                          url: image.url,
                      }
                    : undefined,
                isNsfw: input.nsfw,
                isSendReplies: true,
                isSpoiler: input.spoiler,
                link: input.url
                    ? {
                          url: input.url,
                      }
                    : undefined,
                title: input.title,
                video: input.video
                    ? {
                          posterUrl: input.video.poster.url,
                          url: input.video.url,
                      }
                    : undefined,
            };

            const result = await this.mutate<
                MutationResult & {
                    post?: {
                        id: string;
                    } | null;
                }
            >(
                input.community
                    ? input.video
                        ? "createVideoPost"
                        : "createPost"
                    : "createProfilePost",
                input.community
                    ? {
                          ...fields,
                          subredditName: input.community,
                      }
                    : fields,
            );

            if (!result.post?.id) {
                throw new RedditError("Post was not created");
            }

            return {
                id: result.post.id,
            };
        },

        delete: async ({ id }: Id): Promise<void> => {
            await this.mutate("deletePost", {
                postId: id,
            });
        },

        downvote: async ({ id }: Id): Promise<void> => {
            await this.mutate("votePost", {
                postId: id,
                voteState: "DOWN",
            });
        },

        get: async ({ id }: Id): Promise<Post | undefined> => {
            const [post] = await this.postsByIds([id]);

            return post;
        },

        hide: async ({ id }: Id): Promise<void> => {
            await this.mutate("hidePost", {
                hideState: "HIDDEN",
                postId: id,
            });
        },

        report: async ({ id, siteRule }: Id & { siteRule: enums.RuleID }): Promise<void> => {
            await this.mutate("reportPost", {
                postId: id,
                siteRule,
            });
        },

        save: async ({ id }: Id): Promise<void> => {
            await this.mutate("savePost", {
                postId: id,
                saveState: "SAVED",
            });
        },

        unhide: async ({ id }: Id): Promise<void> => {
            await this.mutate("hidePost", {
                hideState: "NONE",
                postId: id,
            });
        },

        unsave: async ({ id }: Id): Promise<void> => {
            await this.mutate("savePost", {
                postId: id,
                saveState: "NONE",
            });
        },

        unvote: async ({ id }: Id): Promise<void> => {
            await this.mutate("votePost", {
                postId: id,
                voteState: "NONE",
            });
        },

        // Leases an upload slot, then posts the file to it. The returned URL is
        // what post creation expects for images, videos and video posters.
        upload: async ({
            file,
        }: {
            file: {
                name: string;
                type: string;
                uri: string;
            };
        }): Promise<Id & { url: string }> => {
            const mimetype = mimeTypes[file.type.toLowerCase()];

            if (!mimetype) {
                throw new RedditError(`Unsupported file type: ${file.type}`);
            }

            const { uploadLease } = await this.mutate<
                MutationResult & {
                    uploadLease?: {
                        uploadLeaseHeaders?: Array<{
                            header: string;
                            value: string;
                        }> | null;
                        uploadLeaseUrl: string;
                    } | null;
                }
            >("uploadMedia", {
                mimetype,
            });

            if (!uploadLease) {
                throw new RedditError("No upload lease");
            }

            const base = uploadLease.uploadLeaseUrl.startsWith("//")
                ? `https:${uploadLease.uploadLeaseUrl}`
                : uploadLease.uploadLeaseUrl;

            const fields = (uploadLease.uploadLeaseHeaders ?? []).map((item) => ({
                name: item.header,
                value: item.value,
            }));

            const key = fields.find((field) => field.name === "key")?.value;

            if (!key) {
                throw new RedditError("Upload lease has no key");
            }

            await this.transport.upload(base, fields, file);

            return {
                id: key,
                url: `${base.replace(trailingSlashRegex, "")}/${key}`,
            };
        },

        upvote: async ({ id }: Id): Promise<void> => {
            await this.mutate("votePost", {
                postId: id,
                voteState: "UP",
            });
        },
    };

    readonly comments = {
        create: async ({
            body,
            parentId,
            postId,
        }: {
            body: string;
            parentId?: string;
            postId: string;
        }): Promise<Comment> => {
            const result = await this.mutate<
                MutationResult & {
                    commentInfo?: CommentData | null;
                }
            >("createComment", {
                content: {
                    markdown: body,
                },
                // Reddit rejects the input unless exactly one of these is set
                ...(parentId ? { parentId } : { postId }),
            });

            if (!result.commentInfo) {
                throw new RedditError("Comment was not created");
            }

            return {
                data: transformComment(result.commentInfo, 0, {
                    parentId,
                    postId,
                }),
                type: "reply",
            };
        },

        delete: async ({ id }: Id): Promise<void> => {
            await this.mutate("deleteComment", {
                commentId: id,
            });
        },

        downvote: async ({ id }: Id): Promise<void> => {
            await this.mutate("voteComment", {
                commentId: id,
                voteState: "DOWN",
            });
        },

        edit: async ({ body, id }: Id & { body: string }): Promise<void> => {
            await this.mutate("editComment", {
                commentId: id,
                content: {
                    markdown: body,
                },
            });
        },

        get: async ({ id }: Id): Promise<Comment | undefined> => {
            const data = await this.transport.gql<{
                commentById?: CommentData | null;
            }>("commentById", {
                id,
            });

            return data.commentById
                ? {
                      data: transformComment(data.commentById),
                      type: "reply",
                  }
                : undefined;
        },

        // The first page holds the comment tree. "More" items carry a cursor that
        // is passed back as `after`; `commentId` focuses a single thread.
        list: async ({
            after,
            commentId,
            postId,
            sort = "CONFIDENCE",
        }: {
            after?: string | null;
            commentId?: string;
            postId: string;
            sort?: enums.CommentSort;
        }): Promise<Page<"comments", Comment>> => {
            const data = await this.transport.gql<{
                postInfoById?: {
                    commentForest?: {
                        trees?: Array<CommentTree | null> | null;
                    } | null;
                } | null;
            }>("commentTree", {
                after,
                count: COMMENT_COUNT,
                focusedCommentContext: commentId
                    ? {
                          commentId,
                          isFocusedThreadOnly: true,
                      }
                    : undefined,
                id: postId,
                includeConsistencyToken: false,
                includePremiumAvatarTreatment: false,
                maxDepth: COMMENT_DEPTH,
                sortType: sort,
            });

            return transformCommentTree(
                data.postInfoById?.commentForest?.trees ?? [],
                postId,
                COMMENT_DEPTH,
            );
        },

        report: async ({ id, siteRule }: Id & { siteRule: enums.RuleID }): Promise<void> => {
            await this.mutate("reportComment", {
                commentId: id,
                siteRule,
            });
        },

        save: async ({ id }: Id): Promise<void> => {
            await this.mutate("saveComment", {
                commentId: id,
                saveState: "SAVED",
            });
        },

        saved: async ({ after }: Paging = {}): Promise<Page<"comments", Comment>> => {
            const data = await this.transport.gql<{
                identity?: {
                    savedComments?: CommentList | null;
                } | null;
            }>("savedComments", {
                after,
            });

            return this.hydrateComments(data.identity?.savedComments);
        },

        unsave: async ({ id }: Id): Promise<void> => {
            await this.mutate("saveComment", {
                commentId: id,
                saveState: "NONE",
            });
        },

        unvote: async ({ id }: Id): Promise<void> => {
            await this.mutate("voteComment", {
                commentId: id,
                voteState: "NONE",
            });
        },

        upvote: async ({ id }: Id): Promise<void> => {
            await this.mutate("voteComment", {
                commentId: id,
                voteState: "UP",
            });
        },

        user: async ({
            after,
            name,
            sort = "NEW",
            time,
        }: Sorting<enums.ProfileFeedSort> & {
            name: string;
        }): Promise<Page<"comments", Comment>> => {
            const data = await this.transport.gql<{
                redditorInfoByName?: {
                    comments?: CommentList | null;
                } | null;
            }>("userComments", {
                after,
                name,
                pageSize: PAGE_SIZE,
                range: range(sort, time),
                sort,
            });

            return this.hydrateComments(data.redditorInfoByName?.comments);
        },
    };

    readonly communities = {
        favorite: async ({ id }: Id): Promise<void> => {
            await this.mutate("favoriteCommunity", {
                favoriteState: "FAVORITED",
                subredditId: id,
            });
        },

        get: async ({ name }: { name: string }): Promise<Community> => {
            const data = await this.transport.gql<{
                subredditInfoByName?: Subreddit | null;
            }>("communityInfo", {
                filterGated: false,
                includeDevvitData: false,
                includeRecapFields: false,
                includeWelcomePage: false,
                subredditName: name,
            });

            return transformCommunity(data.subredditInfoByName);
        },

        join: async ({ id }: Id): Promise<void> => {
            await this.mutate("joinCommunity", {
                inputs: [
                    {
                        subredditId: id,
                        subscribeState: "SUBSCRIBED",
                    },
                ],
            });
        },

        leave: async ({ id }: Id): Promise<void> => {
            await this.mutate("joinCommunity", {
                inputs: [
                    {
                        subredditId: id,
                        subscribeState: "NONE",
                    },
                ],
            });
        },

        mine: async ({ after }: Paging = {}): Promise<Page<"communities", Community>> => {
            const data = await this.transport.gql<{
                identity?: {
                    followedRedditorsInfo?: Connection<{
                        profile?: Subreddit | null;
                    }>;
                    subscribedSubreddits?: Connection<Subreddit>;
                } | null;
            }>("subscribedCommunities", {
                after,
                first: 100,
            });

            const subscribed = data.identity?.subscribedSubreddits;

            // followed profiles come back in full on the first page
            const followed = after
                ? []
                : nodes(data.identity?.followedRedditorsInfo).flatMap((item) =>
                      item.profile
                          ? [
                                transformCommunity({
                                    ...item.profile,
                                    __typename: "Profile",
                                }),
                            ]
                          : [],
                  );

            return {
                communities: [...nodes(subscribed).map(transformCommunity), ...followed],
                cursor: cursor(subscribed),
            };
        },

        submission: async ({ name }: { name: string }): Promise<Submission> => {
            const community = await this.transport.gql<{
                subredditInfoByName?: Subreddit | null;
            }>("communityInfo", {
                filterGated: false,
                includeDevvitData: false,
                includeRecapFields: false,
                includeWelcomePage: false,
                subredditName: name,
            });

            const info = community.subredditInfoByName;

            if (!info) {
                throw new Error(`Community ${name} not found`);
            }

            const [requirements, flairs] = await Promise.all([
                this.transport.gql<{
                    subredditInfoById?: {
                        postRequirements?: PostRequirements | null;
                    } | null;
                }>("communityRequirements", {
                    subredditId: info.id,
                }),
                this.transport.gql<{
                    subredditInfoByName?: {
                        postFlairTemplates?: Array<FlairTemplate> | null;
                    } | null;
                }>("communityFlairs", {
                    subredditName: name,
                }),
            ]);

            const types = new Set(info.allowedPostTypes ?? []);

            const user = info.__typename === "Profile" || name.startsWith("u_");

            return {
                community: {
                    id: info.id,
                    image: transformCommunity(info).image,
                    name: info.name,
                    user,
                },
                flair: (flairs.subredditInfoByName?.postFlairTemplates ?? [])
                    .filter((flair) => !flair.isModOnly)
                    .map((flair) => {
                        const base = {
                            background: flair.backgroundColor ?? undefined,
                            color:
                                flair.textColor === "LIGHT"
                                    ? ("light" as const)
                                    : ("dark" as const),
                            id: flair.id,
                        };

                        return flair.richtext
                            ? {
                                  ...base,
                                  flair: transformFlair({
                                      richtext: flair.richtext,
                                      template: {
                                          id: flair.id,
                                      },
                                  }),
                                  type: "richtext" as const,
                              }
                            : {
                                  ...base,
                                  text: flair.text ?? "",
                                  type: "text" as const,
                              };
                    }),
                media: {
                    gallery: types.has("GALLERY"),
                    image: types.has("IMAGE"),
                    link: types.has("LINK"),
                    spoiler: Boolean(info.isSpoilerAvailable),
                    text: types.has("TEXT"),
                    video: types.has("VIDEO"),
                },
                requirements: transformRequirements(
                    requirements.subredditInfoById?.postRequirements,
                ),
            };
        },

        unfavorite: async ({ id }: Id): Promise<void> => {
            await this.mutate("favoriteCommunity", {
                favoriteState: "NONE",
                subredditId: id,
            });
        },
    };

    readonly users = {
        // `id` is the profile's subreddit (`Profile.subreddit`)
        favorite: (input: Id): Promise<void> => this.communities.favorite(input),

        // `id` is the account id (`t2_…`)
        follow: async ({ id }: Id): Promise<void> => {
            await this.mutate("followUser", {
                accountId: id,
                state: "FOLLOWED",
            });
        },

        get: async ({ name }: { name: string }): Promise<Profile> => {
            const [profile, search] = await Promise.all([
                this.transport.gql<{
                    profileByName?: Subreddit | null;
                }>("profile", {
                    profileName: name,
                }),
                this.transport
                    .gql<SearchData<"authors", Redditor>>("searchUsers", {
                        filters: [],
                        pageSize: 5,
                        productSurface: "",
                        query: name,
                    })
                    .catch(() => null),
            ]);

            if (!profile.profileByName) {
                throw new Error(`User ${name} not found`);
            }

            const redditor = nodes(search?.search?.general?.authors).find(
                (item) => item.name?.toLowerCase() === name.toLowerCase(),
            );

            return transformProfile(profile.profileByName, redditor);
        },

        me: async (): Promise<Profile> => {
            const data = await this.transport.gql<{
                identity?: {
                    redditor?: {
                        name?: string | null;
                    } | null;
                } | null;
            }>("me", {
                includeBrandToolsStatus: false,
                includeHumanVerificationActionNeeded: false,
                includePostFlairTemplates: false,
                includePremiumAvatarTreatment: false,
                includeRedditHandleInfo: false,
                includeVerificationStatus: false,
            });

            const name = data.identity?.redditor?.name;

            if (!name) {
                throw new RedditError("Not signed in");
            }

            return this.users.get({
                name,
            });
        },

        unfavorite: (input: Id): Promise<void> => this.communities.unfavorite(input),

        unfollow: async ({ id }: Id): Promise<void> => {
            await this.mutate("followUser", {
                accountId: id,
                state: "NONE",
            });
        },
    };

    readonly search = {
        communities: async ({
            after,
            community: _community,
            query,
        }: SearchInput): Promise<Page<"communities", Community>> => {
            const data = await this.transport.gql<SearchData<"communities", Subreddit>>(
                "searchCommunities",
                {
                    afterCursor: after,
                    filters: [],
                    pageSize: PAGE_SIZE,
                    productSurface: "",
                    query,
                },
            );

            const connection = data.search?.general?.communities;

            return {
                communities: nodes(connection).map(transformCommunity),
                cursor: cursor(connection),
            };
        },

        posts: async ({
            after,
            community,
            query,
            sort = "RELEVANCE",
            time,
        }: SearchInput & {
            sort?: enums.SearchPostSort;
            time?: enums.PostFeedRange;
        }): Promise<PostsPage> => {
            const timeRange = time && time !== "ALL" && sort !== "NEW" ? time.toLowerCase() : null;

            const data = await this.transport.gql<SearchData<"posts", PostData>>("searchPosts", {
                afterCursor: after,
                filters: timeRange
                    ? [
                          {
                              key: "time_range",
                              value: timeRange,
                          },
                      ]
                    : [],
                pageSize: PAGE_SIZE,
                productSurface: "",
                query: community ? `${query} subreddit:${community}` : query,
                sort,
            });

            return toPosts(data.search?.general?.posts);
        },

        users: async ({ after, query }: SearchInput): Promise<Page<"users", User>> => {
            const data = await this.transport.gql<SearchData<"authors", Redditor>>("searchUsers", {
                afterCursor: after,
                filters: [],
                pageSize: PAGE_SIZE,
                productSurface: "",
                query,
            });

            const connection = data.search?.general?.authors;

            return {
                cursor: cursor(connection),
                users: nodes(connection).map(transformUser),
            };
        },
    };

    readonly inbox = {
        list: async ({ after }: Paging = {}): Promise<Page<"notifications", Notification>> => {
            const data = await this.transport.gql<{
                notificationInbox?: {
                    elements?: Connection<NotificationData>;
                } | null;
            }>("notifications", {
                after,
                includeAnnouncement: false,
                pageSize: PAGE_SIZE,
                subredditIconMaxWidth: 64,
            });

            const connection = data.notificationInbox?.elements;

            return {
                cursor: cursor(connection),
                notifications: nodes(connection).map(transformNotification),
            };
        },
        markAllRead: async (): Promise<void> => {
            await this.mutate("markAllNotificationsRead", {
                types: ["NOTIFICATIONS"],
            });
        },

        markRead: async ({ id }: Pick<Notification, "group" | "id">): Promise<void> => {
            await this.mutate("markNotificationRead", {
                notificationId: id,
            });
        },

        unread: async (): Promise<number> => {
            const data = await this.transport.gql<{
                badgeIndicators?: {
                    activityTab?: {
                        count?: number | null;
                    } | null;
                    inboxTab?: {
                        count?: number | null;
                    } | null;
                } | null;
            }>("badgeCount");

            return (
                data.badgeIndicators?.inboxTab?.count ??
                data.badgeIndicators?.activityTab?.count ??
                0
            );
        },
    };
}

// search

type SearchInput = Paging & {
    community?: string;
    query: string;
};

type SearchData<Key extends string, Node> = {
    search?: {
        general?: Partial<Record<Key, Connection<Node>>> | null;
    } | null;
};

// submission

type FlairTemplate = {
    backgroundColor?: string | null;
    id: string;
    isModOnly?: boolean | null;
    richtext?: string | null;
    text?: string | null;
    textColor?: string | null;
};

type PostRequirements = {
    bodyBlacklistedStrings?: Array<string> | null;
    bodyRegexes?: Array<string> | null;
    bodyRequiredStrings?: Array<string> | null;
    bodyRestrictionPolicy?: string | null;
    bodyTextMaxLength?: number | null;
    bodyTextMinLength?: number | null;
    domainBlacklist?: Array<string> | null;
    domainWhitelist?: Array<string> | null;
    isFlairRequired?: boolean | null;
    titleBlacklistedStrings?: Array<string> | null;
    titleRegexes?: Array<string> | null;
    titleRequiredStrings?: Array<string> | null;
    titleTextMaxLength?: number | null;
    titleTextMinLength?: number | null;
};

function transformRequirements(data?: PostRequirements | null): SubmissionRequirements {
    const policy = data?.bodyRestrictionPolicy;

    return {
        body: {
            blacklist: data?.bodyBlacklistedStrings ?? [],
            max: data?.bodyTextMaxLength ?? undefined,
            min: data?.bodyTextMinLength ?? undefined,
            patterns: data?.bodyRegexes ?? [],
            policy:
                policy === "REQUIRED"
                    ? "required"
                    : policy === "NOT_ALLOWED"
                      ? "forbidden"
                      : "optional",
            required: data?.bodyRequiredStrings ?? [],
        },
        flair: Boolean(data?.isFlairRequired),
        link: {
            blacklist: data?.domainBlacklist ?? [],
            whitelist: data?.domainWhitelist ?? [],
        },
        title: {
            blacklist: data?.titleBlacklistedStrings ?? [],
            max: data?.titleTextMaxLength ?? undefined,
            min: data?.titleTextMinLength ?? undefined,
            patterns: data?.titleRegexes ?? [],
            required: data?.titleRequiredStrings ?? [],
        },
    };
}
