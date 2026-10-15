// The subset of Reddit's GraphQL response shapes this package reads.
// Everything is optional or nullable because the persisted queries differ in
// which fields they select.

import type * as enums from "./enums";

export type Connection<Node> = {
    edges?: Array<{
        node?: Node | null;
    } | null> | null;
    pageInfo?: {
        endCursor?: string | null;
        hasNextPage?: boolean | null;
    } | null;
};

type MediaSource = {
    dimensions?: {
        height: number;
        width: number;
    } | null;
    url: string;
};

export type MediaAsset = {
    __typename?: string;
    height?: number | null;
    id: string;
    mimetype?: string | null;
    status?: string | null;
    url?: string | null;
    width?: number | null;
    xlarge?: MediaSource | null;
    xxlarge?: MediaSource | null;
    xxxlarge?: MediaSource | null;
};

export type Content = {
    markdown?: string | null;
    preview?: string | null;
    richtextMedia?: Array<MediaAsset | null> | null;
};

export type Redditor = {
    __typename?: string;
    createdAt?: string | null;
    displayName?: string | null;
    icon?: MediaSource | null;
    iconSmall?: MediaSource | null;
    id?: string | null;
    isAcceptingFollowers?: boolean | null;
    isFollowed?: boolean | null;
    karma?: {
        fromComments?: number | null;
        fromPosts?: number | null;
        total?: number | null;
    } | null;
    name?: string | null;
    prefixedName?: string | null;
    profile?: Partial<Subreddit> | null;
    snoovatarIcon?: MediaSource | null;
};

export type Styles = {
    bannerBackgroundImage?: string | null;
    icon?: string | null;
    legacyBannerBackgroundImage?: string | null;
    legacyIcon?:
        | string
        | {
              url?: string | null;
          }
        | null;
    mobileBannerImage?: string | null;
};

export type Subreddit = {
    __typename?: string;
    allowedPostTypes?: Array<string> | null;
    createdAt?: string | null;
    description?: {
        markdown?: string | null;
    } | null;
    id: string;
    isFavorite?: boolean | null;
    isSpoilerAvailable?: boolean | null;
    isSubscribed?: boolean | null;
    name: string;
    path?: string | null;
    prefixedName?: string | null;
    publicDescriptionText?: string | null;
    redditorInfo?: Redditor | null;
    styles?: Styles | null;
    subscribersCount?: number | null;
    title?: string | null;
};

export type FlairData = {
    richtext?: string | null;
    template?: {
        backgroundColor?: string | null;
        id?: string | null;
    } | null;
    text?: string | null;
    textColor?: string | null;
    type?: string | null;
};

export type PostMediaData = {
    animated?: {
        gif?: MediaSource | null;
        mp4?: MediaSource | null;
    } | null;
    still?: {
        source?: MediaSource | null;
        xlarge?: MediaSource | null;
        xxlarge?: MediaSource | null;
        xxxlarge?: MediaSource | null;
    } | null;
    streaming?: {
        dimensions?: {
            height: number;
            width: number;
        } | null;
        hlsUrl?: string | null;
        isGif?: boolean | null;
    } | null;
    typeHint?: string | null;
    video?: {
        attribution?: {
            providerName?: string | null;
        } | null;
        dimensions?: {
            height: number;
            width: number;
        } | null;
        embedHtml?: string | null;
        url?: string | null;
    } | null;
};

export type PostData = {
    __typename?: string;
    authorInfo?: Redditor | null;
    commentCount?: number | null;
    content?: Content | null;
    createdAt: string;
    crosspostRoot?: {
        postInfo?: PostData | null;
    } | null;
    domain?: string | null;
    flair?: FlairData | null;
    gallery?: {
        items?: Array<{
            caption?: string | null;
            id: string;
            media?: MediaAsset | null;
        } | null> | null;
    } | null;
    id: string;
    isHidden?: boolean | null;
    isNsfw?: boolean | null;
    isSaved?: boolean | null;
    isSelfPost?: boolean | null;
    isSpoiler?: boolean | null;
    isStickied?: boolean | null;
    media?: PostMediaData | null;
    permalink?: string | null;
    poll?: unknown;
    postHint?: string | null;
    postTitle?: string | null;
    score?: number | null;
    subreddit?: Subreddit | null;
    thumbnail?: MediaSource | null;
    title?: string | null;
    upvoteRatio?: number | null;
    url?: string | null;
    voteState?: enums.VoteState | null;
};

export type CommentData = {
    __typename?: string;
    authorFlair?: FlairData | null;
    authorInfo?: Redditor | null;
    content?: Content | null;
    createdAt: string;
    editedAt?: string | null;
    id: string;
    isAdminTakedown?: boolean | null;
    isInitiallyCollapsed?: boolean | null;
    isOP?: boolean | null;
    isRemoved?: boolean | null;
    isSaved?: boolean | null;
    isStickied?: boolean | null;
    parent?: {
        id?: string | null;
    } | null;
    permalink?: string | null;
    postInfo?: {
        authorInfo?: Redditor | null;
        id: string;
        permalink?: string | null;
        subreddit?: Partial<Subreddit> | null;
        title?: string | null;
    } | null;
    removedByCategory?: string | null;
    score?: number | null;
    voteState?: enums.VoteState | null;
};

export type CommentTree = {
    childCount?: number | null;
    depth: number;
    more?: {
        count?: number | null;
        cursor: string;
        isTooDeepForCount?: boolean | null;
    } | null;
    node?: CommentData | null;
    parentId?: string | null;
};

export type MutationResult = {
    errors?: Array<{
        code?: string | null;
        message: string;
    } | null> | null;
    fieldErrors?: Array<{
        field?: string | null;
        message: string;
    } | null> | null;
    ok?: boolean | null;
};

export type NotificationData = {
    body?: string | null;
    context?: {
        messageType?: string | null;
    } | null;
    avatar?: {
        url?: string | null;
    } | null;
    deeplinkUrl?: string | null;
    id: string;
    subreddit?: {
        name?: string | null;
    } | null;
    readAt?: string | null;
    sentAt: string;
    title?: string | null;
};
