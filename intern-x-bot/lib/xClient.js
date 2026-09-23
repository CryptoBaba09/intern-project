import { TwitterApi } from "twitter-api-v2";

// Two separate clients, deliberately: search (read) only needs an
// app-only bearer token and is cheaper/simpler; posting a reply needs
// OAuth 1.0a user context (the actual @Internburn_xyz account's
// tokens), which is a materially more sensitive credential. Keeping
// them as two client instances makes it obvious at each call site which
// kind of auth is in play.
export function makeReadClient(config) {
  return new TwitterApi(config.xBearerToken).readOnly;
}

export function makeWriteClient(config) {
  return new TwitterApi({
    appKey: config.xApiKey,
    appSecret: config.xApiSecret,
    accessToken: config.xAccessToken,
    accessSecret: config.xAccessSecret,
  });
}
