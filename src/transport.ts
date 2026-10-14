import { type OperationKey, operations } from "./operations";

const GQL_URI = "https://gql-fed.reddit.com/";
const OAUTH_URI = "https://oauth.reddit.com";

export const USER_AGENT = "Reddit/Version 2025.40.0/Build 2540000/Android 14";

export type RedditOptions = {
    deviceId: string;
    edgeBucket?: string;
    fetch?: typeof fetch;
    loid: string;
    token: string;
};

type GraphQLError = {
    extensions?: {
        code?: string | number;
    };
    message: string;
    path?: Array<string | number>;
};

export class RedditError extends Error {
    readonly code?: string | number;
    readonly status?: number;

    constructor(
        message: string,
        options?: {
            cause?: unknown;
            code?: string | number;
            status?: number;
        },
    ) {
        super(message, {
            cause: options?.cause,
        });

        this.name = "RedditError";
        this.code = options?.code;
        this.status = options?.status;
    }
}

export class MissingOperationError extends RedditError {
    readonly operation: string;

    constructor(key: OperationKey) {
        const { name } = operations[key];

        super(`GraphQL operation ${name} has no persisted query hash yet`, {
            code: "MISSING_OPERATION",
        });

        this.name = "MissingOperationError";
        this.operation = name;
    }
}

export class Transport {
    private readonly options: RedditOptions;

    constructor(options: RedditOptions) {
        this.options = options;
    }

    private headers() {
        const headers = new Headers();

        headers.set("accept", "application/json");
        headers.set("authorization", `Bearer ${this.options.token}`);
        headers.set("client-vendor-id", this.options.deviceId);
        headers.set("user-agent", USER_AGENT);
        headers.set("x-reddit-device-id", this.options.deviceId);
        headers.set("x-reddit-loid", this.options.loid);

        if (this.options.edgeBucket) {
            headers.set("cookie", `edgebucket=${this.options.edgeBucket}`);
        }

        return headers;
    }

    hasOperation(key: OperationKey) {
        return operations[key].sha256Hash !== null;
    }

    async gql<Data>(key: OperationKey, variables: Record<string, unknown> = {}): Promise<Data> {
        const { name, sha256Hash } = operations[key];

        if (!sha256Hash) {
            throw new MissingOperationError(key);
        }

        const headers = this.headers();

        headers.set("content-type", "application/json");

        const response = await (this.options.fetch ?? fetch)(GQL_URI, {
            body: JSON.stringify({
                extensions: {
                    persistedQuery: {
                        sha256Hash,
                        version: 1,
                    },
                },
                operationName: name,
                variables,
            }),
            credentials: "omit",
            headers,
            method: "POST",
        });

        const json = (await response.json().catch(() => null)) as {
            data?: Data | null;
            errors?: Array<GraphQLError>;
        } | null;

        const error = json?.errors?.[0];

        if (error) {
            throw new RedditError(`${name}: ${error.message}`, {
                code: error.extensions?.code,
                status: response.status,
            });
        }

        if (!(response.ok && json?.data)) {
            throw new RedditError(`${name}: ${response.statusText || "No data"}`, {
                status: response.status,
            });
        }

        return json.data;
    }

    // Posts a file to an upload lease (an S3 form upload). The fields come from
    // the lease and must be sent before the file.
    async upload(
        url: string,
        fields: Array<{
            name: string;
            value: string;
        }>,
        file:
            | Blob
            | {
                  name: string;
                  type: string;
                  uri: string;
              },
    ): Promise<void> {
        const body = new FormData();

        for (const field of fields) {
            body.append(field.name, field.value);
        }

        body.append("file", file as Blob);

        const response = await (this.options.fetch ?? fetch)(url, {
            body,
            credentials: "omit",
            method: "POST",
        });

        if (!response.ok) {
            throw new RedditError(`Upload failed: ${response.statusText}`, {
                status: response.status,
            });
        }
    }

    async rest<Data>(path: string): Promise<Data> {
        const url = new URL(path, OAUTH_URI);

        url.searchParams.set("raw_json", "1");

        const response = await (this.options.fetch ?? fetch)(url, {
            credentials: "omit",
            headers: this.headers(),
        });

        if (!response.ok) {
            throw new RedditError(`${path}: ${response.statusText}`, {
                status: response.status,
            });
        }

        return (await response.json()) as Data;
    }
}
