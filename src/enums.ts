// Reddit's GraphQL enum values that the app relies on

export type PostFeedSort = "BEST" | "HOT" | "NEW" | "TOP" | "RISING" | "CONTROVERSIAL";

export type PostFeedRange = "HOUR" | "DAY" | "WEEK" | "MONTH" | "YEAR" | "ALL";

export type ProfileFeedSort = "HOT" | "NEW" | "TOP" | "CONTROVERSIAL";

export type CommentSort = "CONFIDENCE" | "TOP" | "NEW" | "OLD" | "CONTROVERSIAL" | "QA" | "LIVE";

export type SearchPostSort = "RELEVANCE" | "HOT" | "TOP" | "NEW" | "COMMENTS";

export type VoteState = "UP" | "DOWN" | "NONE";

export type MailroomMessageType =
    | "COMMENT_REPLY"
    | "COMMENT_SUBSEQUENT_REPLY"
    | "POST_REPLY"
    | "USERNAME_MENTION"
    | "POST_FOLLOW"
    | "COMMENT_FOLLOW"
    | "TRENDING_POST"
    | "CHAT_MESSAGE"
    | "PRIVATE_MESSAGE"
    | "MOD_MAIL"
    | "AWARD_RECEIVED"
    | "CAKE_DAY"
    | "LIFECYCLE"
    | "ANNOUNCEMENT"
    | "GAMIFICATION_REMINDER"
    | "OTHER"
    // Reddit adds new message types regularly
    | (string & {});

export type RuleID =
    | "OTHER"
    | "SUBREDDIT"
    | "COPYRIGHT_OTHER"
    | "HARASSMENT_AT_SOMEONE_ELSE"
    | "HATE_CONTENT"
    | "IMPERSONATION_OTHER"
    | "INVOLUNTARY_PORN_OTHER"
    | "MINOR_ABUSE_OR_SEXUALIZATION_ABUSE"
    | "PII_ABOUT_SOMEONE_ELSE"
    | "PROHIBITED_SALES"
    | "SELF_HARM"
    | "SPAM_OTHER"
    | "TRADEMARK_OTHER"
    | "VIOLENCE_AT_SOMEONE_ELSE";

export type DeletedReason = "deleted" | "moderator" | "reddit";
