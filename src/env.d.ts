// Ambient module declaration for react-native-dotenv (`@env` import).
// Values come from the local .env file at build time.
declare module '@env' {
  export const API_BASE_URL: string;
  export const SOCKET_URL: string;
  export const GOOGLE_MAPS_API_KEY: string;
}
