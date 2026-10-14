// Persisted GraphQL operations used by the official Reddit Android app.
// gql-fed.reddit.com only accepts registered queries, so every operation is
// referenced by its name and sha256 hash.

export type Operation = {
    name: string;
    sha256Hash: string | null;
};

export const operations = {
    allFeed: {
        name: "AllFeedSdui",
        sha256Hash: "0e9c0045dd244e934efd0ea4fefc00cb0b4d91523e2f09c8af075856cb59b937",
    },
    badgeCount: {
        name: "BadgeCount",
        sha256Hash: "6e5b40ea4193a6fcfd6890518f4cdde524e434243d055c33a552af2e42e0a433",
    },
    commentById: {
        name: "GetCommentById",
        sha256Hash: "2fe82f19f25b77c0298e6d57598f4badbba17a16670f7712b9903bbdfbf376fb",
    },
    commentsByIds: {
        name: "LiveCommentsByIds",
        sha256Hash: "51ab9f2e0eb87b6dac9aac02012ba7046049e516ec55ec442abfed0f19c6f311",
    },
    commentTree: {
        name: "PostComments",
        sha256Hash: "314f29c2494fd78c7844ef2c6b09acb4bef5b37ab50b4ddc01691d6d5c8433f8",
    },
    communityFlairs: {
        name: "GetFlairs",
        sha256Hash: "f14c4d85da795fe5912abd822173b451d207d358a66ca6ddaea3404009b63ad3",
    },
    communityInfo: {
        name: "SubredditInfoByName",
        sha256Hash: "6b9c1679e69097e1c6df364adc11183afe6e2b6545dd1c0c1cc8f7490448c3e5",
    },
    communityRequirements: {
        name: "GetPostRequirements",
        sha256Hash: "0465f6238026c63c1688696b323fb987de6372459b8f873bf36fd6a8a4e38421",
    },
    communityRules: {
        name: "GetRules",
        sha256Hash: "4902196475197c7a61271b7381b0229f42cd698929899be77b878a90e15fa5b8",
    },
    createComment: {
        name: "CreateComment",
        sha256Hash: "838c2cdc36ee8c33281bdde4d3f80404ade78dc938a9c4e33b051e72991a4fdc",
    },
    createPost: {
        name: "CreateSubredditPost",
        sha256Hash: "637a0679b68fc92f3372181ea344ce3ce29cd95bccd2e65f9cad8fb08ddafdd2",
    },
    createProfilePost: {
        name: "CreateProfilePost",
        sha256Hash: "6f5a4d4d088e39cb3b9c6aea9d18cb997c492194b454ec3c282ee9496155e1a0",
    },
    createVideoPost: {
        name: "CreateSubredditPostWithVideo",
        sha256Hash: "b728a9d4428a9eec6d7cb314692e71f7283df7d5c039b0af999ff408bd7e0f08",
    },
    customFeed: {
        name: "CustomFeedSdui",
        sha256Hash: "de69597f24fd8f5907b0eda221d03423731c061b694ab3e80dfddc2ff2687ae8",
    },
    deleteComment: {
        name: "DeleteComment",
        sha256Hash: "e9ffb38ef6f33293f6e6e4f8a444827023bd4e988a0c5ebda8c7c60033261467",
    },
    deletePost: {
        name: "DeletePost",
        sha256Hash: "4273f1b33ccd13e613cf7c56804f8b753b5364df9f17705a7924efc9c9917881",
    },
    downvotedPosts: {
        name: "DownvotedPosts",
        sha256Hash: "bef6215672dd62181aa6290cf13205f01ae35aa1bc8a684cd41dddebcb922bc6",
    },
    editComment: {
        name: "UpdateComment",
        sha256Hash: "c43517a749d070bc2d19b123fbdb680de815f4b92c7720ccb9010c2eb0a4a4f8",
    },
    favoriteCommunity: {
        name: "UpdateSubredditFavoriteState",
        sha256Hash: "e5547e4e50c78109cacb04c12e9e739095ad94e8a3f8a0904e7710d48eab8e02",
    },
    followUser: {
        name: "UpdateProfileFollowState",
        sha256Hash: "5b5bcb2267013236e67b37c4a7341a157467777c2de5599bfed135ed8ea30eba",
    },
    hiddenPosts: {
        name: "HiddenPosts",
        sha256Hash: "dd50be43da2e469e529cb4c63c1d0f3c2f54c12d5e8f65a809b90ebaff0aa8e9",
    },
    hidePost: {
        name: "UpdatePostHideState",
        sha256Hash: "5db483a70280220a1d3f3029150859baa508fdf5a05b906b607e00ab476064dd",
    },
    homeFeed: {
        name: "HomeElements",
        sha256Hash: "60f2737fad67382ef010e4e65f9c921f85f767ff8a3426a17157a70ed6a1ee41",
    },
    joinCommunity: {
        name: "UpdateSubredditSubscriptions",
        sha256Hash: "5de46969ea6ea4ba6ec17ad2f7174498982453f96b1b9cc1172b63c18f2a7f2f",
    },
    markAllNotificationsRead: {
        name: "MarkInboxAsRead",
        sha256Hash: "0f753ac3800283cf281af884e096c7d2bbb90894315e8b01eae65ac337dd93be",
    },
    markNotificationRead: {
        name: "ReadNotificationLoggedIn",
        sha256Hash: "24b629a06ffa10ec063019055a89c02e3779649a21c46850911dd71498fc548d",
    },
    me: {
        name: "GetAccount",
        sha256Hash: "b5ad6715b375f0a4c5347979f1237364025b78028b90a8a618e9b1e8036b26ef",
    },
    myCustomFeeds: {
        name: "MyMultireddits",
        sha256Hash: "2482bfa42b8c8ae31ee5ef76105217138e7d81e8f9bfc274fabd33d71742afe8",
    },
    notifications: {
        name: "GetInboxNotificationFeed",
        sha256Hash: "531bb584ee0c17b0c43adf71729afa433ba683d009632406dc9d169a8fa424d0",
    },
    popularFeed: {
        name: "PopularFeedElements",
        sha256Hash: "728c0f9a4d12c17b8cffe07669bb1a8770b0f2ec0c84e040485f8fad2d9c417f",
    },
    postsByIds: {
        name: "PostsByIds",
        sha256Hash: "0e471495bcba33554b6c540b3cf1cae23dd5432a8b741dddc7fd6717dc2520a7",
    },
    profile: {
        name: "ProfileDetailsByName",
        sha256Hash: "096ccf5d943485822cb6d3e0dc13f9977da1984514e1d539e1ed38a51158e689",
    },
    reportComment: {
        name: "ReportComment",
        sha256Hash: "6b55eb68b0c8cb0d908cba2f9801d393003a41c347e98a4906c12d137532edf9",
    },
    reportPost: {
        name: "ReportPost",
        sha256Hash: "a16926790a0d91ba97d1bcf25388d78674f4e1533c076609aa0c2861acc96721",
    },
    saveComment: {
        name: "UpdateCommentSaveState",
        sha256Hash: "2d2a823e0b5053d39de7d319fd8ccf8b87ddf0ab3ad97cfd621d82f376fcf174",
    },
    savedComments: {
        name: "SavedComments",
        sha256Hash: "f59debcda8c989bcd661947fb7cb311559d1d9df8329ef000dc31817a399de81",
    },
    savedPosts: {
        name: "SavedPostsFeedSdui",
        sha256Hash: "41cf97311e5eb78e500d8f180b39b20c17a8274abedf98d4a972d63f83a199fd",
    },
    savePost: {
        name: "UpdatePostSaveState",
        sha256Hash: "96dbe868ad5b00109ed72048a82290abb86f66ff653cde724458b6f7549918f8",
    },
    searchCommunities: {
        name: "SearchCommunities",
        sha256Hash: "a3333069c1ead3ceec6d9bf4da4185ff584f69d0ba8b586e545b32ea62170932",
    },
    searchPosts: {
        name: "SearchPosts",
        sha256Hash: "8610e33521c90caa8d12576800c18b708ce0d19df3dfac8e2aad55d9860e4bf9",
    },
    searchUsers: {
        name: "SearchPeople",
        sha256Hash: "d9211ac33f72079f25cb4c8a8e00a2b4889e984f70278ec91283965c7856d33d",
    },
    subredditFeed: {
        name: "SubredditFeedElements",
        sha256Hash: "97046e2a48050f10a507db354a8da60955ffccb586dcf63163bdfc6610d5cf7a",
    },
    subscribedCommunities: {
        name: "SubscribedSubreddits",
        sha256Hash: "4980ab5fd2422ab0b785ef1ae116d05a823d3900944dd671edc324e5c74ca250",
    },
    uploadMedia: {
        name: "CreateMediaUploadLease",
        sha256Hash: "d9d578fd1c2b9847d89d018184426be5e3a5560cb8fba243b78a98dee49ac20d",
    },
    upvotedPosts: {
        name: "UpvotedPosts",
        sha256Hash: "2576b683a14896be80b6b3b0465a55b7a94ada8f062564d2bdc1e38975bb5837",
    },
    userComments: {
        name: "SubmittedComments",
        sha256Hash: "e1b37f521fb40af2120946b70e7fbf6a3d924db2abaf28ff2164d4cfacca28db",
    },
    userPosts: {
        name: "UserSubmittedPosts",
        sha256Hash: "78a213c02a340db4a707d4bcd375ce34f733b75893379603acb4ec20388fafe6",
    },
    voteComment: {
        name: "UpdateCommentVoteState",
        sha256Hash: "a353fb29741128e9346380c4706af0bf59fc5767608ea6848039c57ae0b08fec",
    },
    votePost: {
        name: "UpdatePostVoteState",
        sha256Hash: "2523ed203f983488aab97d84f12b46910008244b79a61073b419e33ff98cb7e5",
    },
} as const satisfies Record<string, Operation>;

export type OperationKey = keyof typeof operations;
