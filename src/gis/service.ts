import { Context, Effect, Layer, pipe } from "effect";
import { JSDOM } from "jsdom";
import * as querystring from "node:querystring";

/*
 * Attribution:
 * This code was lifted from an npm module that no longer exists called g-i-s
 * It was located at github.com/harrego/g-i-s and licensed as MIT
 */

class BadStatus {
  readonly _tag = "BadStatus";
  constructor(readonly response: Response) {}
}
class FetchError {
  readonly _tag = "FetchError";
  constructor(readonly underlying: unknown) {}
}

export type GISerFuncs = Readonly<{
  gis: (query: string) => Effect.Effect<readonly ImageResult[], BadStatus | FetchError>;
}>;

export class GISer extends Context.Tag("GISer")<GISer, GISerFuncs>() {}

const BaseUrl = "https://www.google.com/search";
const UserAgent = "AdsBot-Google (+http://www.google.com/adsbot.html)";

const FilterDomains = ["gstatic.com"].map(domain => ` -site:${domain}`).join(" ");

const ImageURLRegex = /\["(http.+?)",(\d+),(\d+)]/g;

type ImageResult = Readonly<{ url: string; width: number; height: number }>;

export const parseImages = (dom: JSDOM): readonly ImageResult[] => {
  const scripts = Array.from(dom.window.document.querySelectorAll("script"));
  const scriptsContent = scripts.map(s => s.innerHTML);

  return scriptsContent.flatMap(script =>
    Array.from(script.matchAll(ImageURLRegex)).reduce((acc, result) => {
      if (result.length <= 3) return acc;
      else {
        const [, u, h, w] = result;
        const height = parseInt(h ?? "");
        const width = parseInt(w ?? "");

        return isNaN(width) || isNaN(height) ? acc : [...acc, { url: u ?? "", width, height }];
      }
    }, [] as readonly ImageResult[]),
  );
};

export const GISerLive = Layer.succeed(
  GISer,
  GISer.of({
    gis: query =>
      pipe(
        `${BaseUrl}?${querystring.encode({ tbm: "isch", q: `${query}${FilterDomains}` })}`,
        url => Effect.tryPromise(() => fetch(url, { method: "GET", headers: { "User-Agent": UserAgent } })),
        Effect.tap(r => (r.status !== 200 ? Effect.fail(new BadStatus(r)) : Effect.void)),
        Effect.andThen(r => r.arrayBuffer()),
        Effect.catchTag("UnknownException", u => Effect.fail(new FetchError(u.error))),
        Effect.andThen(r => new JSDOM(r)),
        Effect.andThen(parseImages),
      ),
  }),
);
