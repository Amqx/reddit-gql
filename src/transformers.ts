import type * as enums from "./enums";
import {
    type CommentData,
    type CommentTree,
    type Connection,
    type Content,
    type FlairData,
    type MediaAsset,
    type NotificationData,
    type PostData,
    type PostMediaData,
    type Redditor,
    type Styles,
    type Subreddit,
} from "./schema";
import {
    type Comment,
    type CommentReply,
    type Community,
    type Flair,
    type Notification,
    type Post,
    type PostMedia,
    type PostMediaMeta,
    type PostType,
    type PostUser,
    type Profile,
    type User,
} from "./types";

// helpers

const userPrefixRegex = /^u_/;
const communityPrefixRegex = /^r\//;
const permalinkCommunityRegex = /^\/r\/([^/]+)\//;

function toDate(value?: string | null) {
    return value ? new Date(value) : new Date(0);
}

export function nodes<Node>(connection?: Connection<Node> | null) {
    return (connection?.edges ?? []).flatMap((edge) => (edge?.node ? [edge.node] : []));
}

export function cursor(connection?: Connection<unknown> | null) {
    return connection?.pageInfo?.hasNextPage ? (connection.pageInfo.endCursor ?? null) : null;
}

function liked(state?: enums.VoteState | null) {
    if (state === "UP") {
        return true;
    }

    if (state === "DOWN") {
        return false;
    }

    return null;
}

function styleIcon(styles?: Styles | null) {
    const legacy =
        typeof styles?.legacyIcon === "string" ? styles.legacyIcon : styles?.legacyIcon?.url;

    return styles?.icon || legacy || undefined;
}

function redditorImage(user?: Redditor | null) {
    return (
        user?.iconSmall?.url ??
        user?.icon?.url ??
        styleIcon(user?.profile?.styles) ??
        user?.snoovatarIcon?.url ??
        undefined
    );
}

function redditorName(user?: Redditor | null) {
    return user?.name ?? user?.displayName ?? undefined;
}

// flair

type RichtextFlair = {
    a?: string;
    e: string;
    t?: string;
    u?: string;
};

export function transformFlair(data?: FlairData | null): Array<Flair> {
    if (!data) {
        return [];
    }

    const prefix = data.template?.id ?? "flair";

    if (data.richtext) {
        try {
            const items = JSON.parse(data.richtext) as Array<RichtextFlair>;

            return items.flatMap((item, index): Array<Flair> => {
                if (item.e === "emoji" && item.u) {
                    return [
                        {
                            id: `${prefix}-${index}`,
                            type: "emoji",
                            value: item.u,
                        },
                    ];
                }

                if (item.e === "text" && item.t) {
                    return [
                        {
                            id: `${prefix}-${index}`,
                            type: "text",
                            value: item.t,
                        },
                    ];
                }

                return [];
            });
        } catch {
            // fall through to plain text
        }
    }

    return data.text
        ? [
              {
                  id: `${prefix}-0`,
                  type: "text",
                  value: data.text,
              },
          ]
        : [];
}

// media

type Previews = {
    xlarge?: { url: string } | null;
    xxlarge?: { url: string } | null;
    xxxlarge?: { url: string } | null;
};

// The largest resized preview (up to 1080px wide), for display in place of
// the full resolution original.
function previewUrl(previews?: Previews | null): string | undefined {
    return previews?.xxxlarge?.url ?? previews?.xxlarge?.url ?? previews?.xlarge?.url;
}

function transformAsset(asset: MediaAsset): PostMedia | null {
    const url = asset.url ?? asset.xxxlarge?.url;

    if (!url || (asset.status && asset.status !== "VALID")) {
        return null;
    }

    const mime = asset.mimetype ?? "";

    const type = mime.startsWith("video")
        ? "video"
        : mime === "image/gif" || asset.__typename === "AnimatedImageAsset"
          ? "gif"
          : "image";

    return {
        height: asset.height ?? 0,
        id: asset.id,
        provider: type === "video" ? "reddit" : undefined,
        thumbnail: type === "image" ? previewUrl(asset) : undefined,
        type,
        url,
        width: asset.width ?? 0,
    };
}

function transformMeta(content?: Content | null): PostMediaMeta {
    return Object.fromEntries(
        (content?.richtextMedia ?? []).flatMap((asset) => {
            const media = asset ? transformAsset(asset) : null;

            return media && asset ? [[asset.id, media]] : [];
        }),
    );
}

const redGifsRegex = /redgifs\.com\/ifr\/(\w+)/;

function transformVideo(post: PostData, media: PostMediaData): PostMedia | undefined {
    const thumbnail = previewUrl(media.still) ?? media.still?.source?.url ?? post.thumbnail?.url;

    if (media.streaming?.hlsUrl) {
        const url = new URL(media.streaming.hlsUrl);

        url.searchParams.delete("a");

        return {
            height: media.streaming.dimensions?.height ?? 0,
            provider: "reddit",
            thumbnail,
            type: "video",
            url: url.toString(),
            width: media.streaming.dimensions?.width ?? 0,
        };
    }

    if (media.video) {
        const redGifs = media.video.embedHtml ? redGifsRegex.exec(media.video.embedHtml) : null;

        if (redGifs?.[1]) {
            return {
                height: media.video.dimensions?.height ?? 0,
                provider: "red-gifs",
                thumbnail,
                type: "video",
                url: redGifs[1],
                width: media.video.dimensions?.width ?? 0,
            };
        }

        const url = media.video.url ?? post.url;

        if (url) {
            return {
                height: media.video.dimensions?.height ?? 0,
                thumbnail,
                type: "image",
                url,
                width: media.video.dimensions?.width ?? 0,
            };
        }
    }
}

function transformImages(post: PostData): Array<PostMedia> | undefined {
    const gallery = post.gallery?.items;

    if (gallery?.length) {
        return gallery.flatMap((item) => {
            const media = item?.media ? transformAsset(item.media) : null;

            return media ? [media] : [];
        });
    }

    const animated = post.media?.animated;

    if (animated?.gif ?? animated?.mp4) {
        const source = (animated.gif ?? animated.mp4) as {
            dimensions?: {
                height: number;
                width: number;
            } | null;
            url: string;
        };

        return [
            {
                height: source.dimensions?.height ?? 0,
                thumbnail: post.media?.still?.source?.url,
                type: "gif",
                url: source.url,
                width: source.dimensions?.width ?? 0,
            },
        ];
    }

    const still = post.media?.still?.source;

    if (still) {
        return [
            {
                height: still.dimensions?.height ?? 0,
                thumbnail: previewUrl(post.media?.still),
                type: "image",
                url: still.url,
                width: still.dimensions?.width ?? 0,
            },
        ];
    }
}

function postType(post: PostData, video?: PostMedia): PostType {
    if (post.crosspostRoot?.postInfo) {
        return "crosspost";
    }

    if (post.poll) {
        return "poll";
    }

    if (post.isSelfPost) {
        return "text";
    }

    if (video) {
        return "video";
    }

    if (
        post.gallery?.items?.length ||
        post.postHint === "IMAGE" ||
        post.media?.typeHint === "IMAGE"
    ) {
        return "image";
    }

    return "link";
}

// community

export function transformCommunity(data?: Subreddit | null): Community {
    const user = data?.__typename === "Profile" || Boolean(data?.redditorInfo);

    const name = data?.name ?? "";

    return {
        banner:
            data?.styles?.mobileBannerImage ||
            data?.styles?.bannerBackgroundImage ||
            data?.styles?.legacyBannerBackgroundImage ||
            undefined,
        createdAt: toDate(data?.createdAt),
        description: data?.publicDescriptionText || undefined,
        favorite: Boolean(data?.isFavorite),
        id: data?.id ?? "",
        image: styleIcon(data?.styles),
        name: user ? `u/${name.replace(userPrefixRegex, "")}` : name,
        subscribed: Boolean(data?.isSubscribed),
        subscribers: data?.subscribersCount ?? 0,
        title: data?.title || undefined,
        user,
    };
}

// user

function transformPostUser(user?: Redditor | null): PostUser {
    const name = redditorName(user);

    if (!(user && name) || user.__typename === "UnavailableRedditor") {
        return {
            id: user?.id ?? undefined,
        };
    }

    return {
        id: user.id ?? undefined,
        image: redditorImage(user),
        name,
    };
}

export function transformUser(user: Redditor): User {
    return {
        createdAt: user.createdAt ? toDate(user.createdAt) : undefined,
        id: user.id ?? "",
        image: redditorImage(user),
        name: redditorName(user) ?? "",
    };
}

export function transformProfile(profile: Subreddit, redditor?: Redditor | null): Profile {
    const name = profile.name.replace(userPrefixRegex, "");

    return {
        banner:
            profile.styles?.legacyBannerBackgroundImage ||
            profile.styles?.bannerBackgroundImage ||
            undefined,
        createdAt: toDate(profile.createdAt),
        description: profile.publicDescriptionText || undefined,
        favorite: Boolean(profile.isFavorite),
        id: redditor?.id ?? profile.redditorInfo?.id ?? profile.id,
        image: styleIcon(profile.styles),
        karma: {
            comment: redditor?.karma?.fromComments ?? 0,
            post: redditor?.karma?.fromPosts ?? 0,
            total: redditor?.karma?.total ?? 0,
        },
        name,
        noFollow: redditor?.isAcceptingFollowers === false,
        subreddit: profile.id,
        subscribed: Boolean(profile.isSubscribed),
    };
}

// post

export function isPostNode(value: unknown): value is PostData {
    const typename = (value as PostData | null)?.__typename;

    return typename === "SubredditPost" || typename === "ProfilePost";
}

export function transformPost(data: PostData): Post {
    const video = data.media ? transformVideo(data, data.media) : undefined;

    const type = postType(data, video);

    const crossPost = data.crosspostRoot?.postInfo;

    return {
        body: data.content?.markdown ?? undefined,
        comments: data.commentCount ?? 0,
        community: transformCommunity(data.subreddit),
        createdAt: toDate(data.createdAt),
        crossPost: crossPost ? transformPost(crossPost) : undefined,
        flair: transformFlair(data.flair),
        hidden: Boolean(data.isHidden),
        id: data.id,
        liked: liked(data.voteState),
        media: {
            images: type === "image" ? transformImages(data) : undefined,
            meta: transformMeta(data.content),
            video,
        },
        nsfw: Boolean(data.isNsfw),
        permalink: data.permalink ?? "",
        ratio: data.upvoteRatio ?? 1,
        saved: Boolean(data.isSaved),
        seen: false,
        spoiler: Boolean(data.isSpoiler),
        sticky: Boolean(data.isStickied),
        title: data.title ?? data.postTitle ?? "",
        type,
        url: data.url ?? undefined,
        user: transformPostUser(data.authorInfo),
        votes: data.score ?? 0,
    };
}

// comment

export function transformComment(
    data: CommentData,
    depth = 0,
    context: {
        parentId?: string | null;
        postId?: string;
    } = {},
): CommentReply {
    const parentId = context.parentId ?? data.parent?.id ?? undefined;

    const community =
        data.postInfo?.subreddit?.name ??
        data.postInfo?.subreddit?.prefixedName?.replace(communityPrefixRegex, "") ??
        permalinkCommunityRegex.exec(data.permalink ?? "")?.[1];

    return {
        body: data.content?.markdown ?? data.content?.preview ?? "",
        collapsed: Boolean(data.isInitiallyCollapsed),
        createdAt: toDate(data.createdAt),
        depth,
        edited: Boolean(data.editedAt),
        flair: transformFlair(data.authorFlair),
        id: data.id,
        liked: liked(data.voteState),
        media: {
            meta: transformMeta(data.content),
        },
        op: Boolean(data.isOP),
        parentId: parentId?.startsWith("t1_") ? parentId : undefined,
        permalink: data.permalink ?? "",
        post: {
            author: data.postInfo?.authorInfo?.name ?? undefined,
            community: community ?? undefined,
            id: data.postInfo?.id ?? context.postId ?? "",
            permalink: data.postInfo?.permalink ?? undefined,
            title: data.postInfo?.title ?? undefined,
        },
        saved: Boolean(data.isSaved),
        sticky: Boolean(data.isStickied),
        user: transformPostUser(data.authorInfo),
        votes: data.score ?? 0,
    };
}

function deletedReason(category?: string | null): enums.DeletedReason {
    if (!category || category === "DELETED" || category === "AUTHOR") {
        return "deleted";
    }

    if (category === "MODERATOR" || category.startsWith("AUTOMOD")) {
        return "moderator";
    }

    return "reddit";
}

// Flattens a comment forest page. A "more" item without a parent is the
// cursor for the next page of top-level comments, so it becomes the cursor.
export function transformCommentTree(
    trees: Array<CommentTree | null>,
    postId: string,
    maxDepth: number,
): {
    comments: Array<Comment>;
    cursor: string | null;
} {
    let next: string | null = null;

    const comments = trees.flatMap((tree): Array<Comment> => {
        if (!tree) {
            return [];
        }

        const parentId = tree.parentId ?? undefined;

        if (tree.more) {
            if (!parentId) {
                next = tree.more.cursor;

                return [];
            }

            return [
                {
                    data: {
                        count: tree.more.count ?? 0,
                        cursor: tree.more.cursor,
                        depth: tree.depth,
                        id: tree.more.cursor,
                        parentId,
                        thread: Boolean(tree.more.isTooDeepForCount) || tree.depth >= maxDepth,
                    },
                    type: "more",
                },
            ];
        }

        const { node } = tree;

        if (!node) {
            return [];
        }

        if (node.__typename === "DeletedComment" || node.isRemoved || node.isAdminTakedown) {
            return [
                {
                    data: {
                        collapsed: Boolean(node.isInitiallyCollapsed),
                        depth: tree.depth,
                        id: node.id,
                        parentId,
                        reason: node.isAdminTakedown
                            ? "reddit"
                            : deletedReason(node.removedByCategory),
                    },
                    type: "deleted",
                },
            ];
        }

        return [
            {
                data: transformComment(node, tree.depth, {
                    parentId,
                    postId,
                }),
                type: "reply",
            },
        ];
    });

    return {
        comments,
        cursor: next,
    };
}

// notification

export function transformNotification(data: NotificationData): Notification {
    return {
        body: data.body ?? undefined,
        context: data.deeplinkUrl ?? undefined,
        createdAt: toDate(data.sentAt),
        id: data.id,
        image: data.avatar?.url ?? undefined,
        new: !data.readAt,
        subreddit: data.subreddit?.name ?? undefined,
        title: data.title ?? "",
        type: (data.context?.messageType ?? undefined) as enums.MailroomMessageType | undefined,
    };
}
