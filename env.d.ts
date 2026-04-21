declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_VIBE: string;
    EXPO_PUBLIC_BACKEND_URL: string;
  }
}

declare var process: {
  env: NodeJS.ProcessEnv;
};