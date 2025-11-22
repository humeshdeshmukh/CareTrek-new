declare module '@env' {
    export const SUPABASE_URL: string;
    export const SUPABASE_ANON_KEY: string;
    export const EXPO_PUBLIC_SUPABASE_URL: string;
    export const EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
    export const GOOGLE_MAPS_API_KEY: string;
    export const EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: string;
}

declare namespace NodeJS {
    interface ProcessEnv {
        SUPABASE_URL: string;
        SUPABASE_ANON_KEY: string;
        EXPO_PUBLIC_SUPABASE_URL: string;
        EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
        GOOGLE_MAPS_API_KEY: string;
        EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: string;
    }
}
