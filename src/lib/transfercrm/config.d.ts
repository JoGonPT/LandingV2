export type TransferCrmAuthMode = "bearer" | "x_api_key" | "authorization_api_key" | "basic";
export type TransferCrmAuth = {
    mode: "bearer";
    token: string;
} | {
    mode: "x_api_key";
    apiKey: string;
} | {
    mode: "authorization_api_key";
    apiKey: string;
} | {
    mode: "basic";
    apiKey: string;
    apiSecret: string;
};
export interface TransferCrmConfig {
    baseUrl: string;
    timeoutMs: number;
    auth: TransferCrmAuth;
}
export declare function getTransferCrmConfig(): TransferCrmConfig;
export declare function buildTransferCrmAuthHeaders(auth: TransferCrmAuth): Record<string, string>;
