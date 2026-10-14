import type * as enums from "./enums";

export type Page<Key extends string, Item> = Record<Key, Array<Item>> & {
    cursor: string | null;
};

// flair

export type Flair =
    | {
          id: string;
          type: "text";
          value: string;
      }
    | {
          id: string;
          type: "emoji";
          value: string;
      };

// community

export type Community = {
    banner?: string;
    createdAt: Date;
    description?: string;
    favorite: boolean;
    id: string;
    image?: string;
    name: string;
    subscribed: boolean;
    subscribers: number;
    title?: string;
    user: boolean;
};

// feed

export type Feed = {
    communities: Array<string>;
    createdAt: Date;
    id: string;
    image?: string;
    name: string;
    path: string;
};

// user

export type User = {
    createdAt?: Date;
    id: string;
    image?: string;
    name: string;
};

export type Profile = {
    banner?: string;
    createdAt: Date;
    description?: string;
    favorite: boolean;
    id: string;
    image?: string;
    karma: {
        comment: number;
        post: number;
        total: number;
    };
    name: string;
    noFollow: boolean;
    subreddit: string;
    subscribed: boolean;
};

// post

export type PostType = "link" | "text" | "image" | "video" | "poll" | "crosspost";

export type PostMedia = {
    height: number;
    id?: string;
    provider?: "reddit" | "red-gifs";
    thumbnail?: string;
    type: "image" | "video" | "gif";
    url: string;
    width: number;
};

export type PostMediaMeta = Record<string, PostMedia>;

export type PostUser = {
    id?: string;
    image?: string;
    name?: string;
};

export type Post = {
    body?: string;
    comments: number;
    community: Community;
    createdAt: Date;
    crossPost?: Post;
    flair: Array<Flair>;
    hidden: boolean;
    id: string;
    liked: boolean | null;
    media: {
        images?: Array<PostMedia>;
        meta: PostMediaMeta;
        video?: PostMedia;
    };
    nsfw: boolean;
    permalink: string;
    ratio: number;
    saved: boolean;
    seen: boolean;
    spoiler: boolean;
    sticky: boolean;
    title: string;
    type: PostType;
    url?: string;
    user: PostUser;
    votes: number;
};

// comment

export type CommentReply = {
    body: string;
    collapsed: boolean;
    createdAt: Date;
    depth: number;
    edited: boolean;
    flair: Array<Flair>;
    id: string;
    liked: boolean | null;
    media: {
        meta: PostMediaMeta;
    };
    op: boolean;
    parentId?: string;
    permalink: string;
    post: {
        author?: string;
        community?: string;
        id: string;
        permalink?: string;
        title?: string;
    };
    saved: boolean;
    sticky: boolean;
    user: PostUser;
    votes: number;
};

export type CommentMore = {
    count: number;
    cursor: string;
    depth: number;
    id: string;
    parentId: string;
    thread: boolean;
};

export type CommentDeleted = {
    collapsed: boolean;
    depth: number;
    id: string;
    parentId?: string;
    reason?: enums.DeletedReason;
};

export type Comment =
    | {
          data: CommentReply;
          type: "reply";
      }
    | {
          data: CommentMore;
          type: "more";
      }
    | {
          data: CommentDeleted;
          type: "deleted";
      };

// notification

export type Notification = {
    body?: string;
    context?: string;
    createdAt: Date;
    group?: string;
    id: string;
    image?: string;
    new: boolean;
    subreddit?: string;
    title: string;
    type?: enums.MailroomMessageType;
};

// submission

export type SubmissionRules = {
    blacklist: Array<string>;
    max?: number;
    min?: number;
    patterns: Array<string>;
    required: Array<string>;
};

export type SubmissionRequirements = {
    body: SubmissionRules & {
        policy: "required" | "optional" | "forbidden";
    };
    flair: boolean;
    link: {
        blacklist: Array<string>;
        whitelist: Array<string>;
    };
    title: SubmissionRules;
};

export type SubmissionFlair =
    | {
          background?: string;
          color: "light" | "dark";
          flair: Array<Flair>;
          id: string;
          type: "richtext";
      }
    | {
          background?: string;
          color: "light" | "dark";
          id: string;
          text: string;
          type: "text";
      };

export type Submission = {
    community: {
        id: string;
        image?: string;
        name: string;
        user: boolean;
    };
    flair: Array<SubmissionFlair>;
    media: {
        gallery: boolean;
        image: boolean;
        link: boolean;
        spoiler: boolean;
        text: boolean;
        video: boolean;
    };
    requirements: SubmissionRequirements;
};
