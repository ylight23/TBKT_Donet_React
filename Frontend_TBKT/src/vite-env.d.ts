/// <reference types="vite/client" />

declare module '*.png';
declare module '*.svg';
declare module '*.jpeg';
declare module '*.jpg';

interface ImportMetaEnv {
    readonly VITE_GRPC_URL: string;
    readonly VITE_APP_VERSION?: string;
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
