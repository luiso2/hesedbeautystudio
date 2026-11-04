import test from "node:test";
import assert from "node:assert/strict";
import { serveVideo } from "../src/video-assets.js";

// Node counterpart for the Cloudflare primitive; the live runtime is also
// checked with HTTP byte requests before deployment.
globalThis.FixedLengthStream = class extends TransformStream {
  constructor(expected) {
    let count = 0;
    super({
      transform(chunk, controller) {
        count += chunk.byteLength;
        assert.ok(count <= expected);
        controller.enqueue(chunk);
      },
      flush() { assert.equal(count, expected); },
    });
  }
};

const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
function fixture() {
  const state = { reads: 0, cancelled: false, request: null };
  const assets = {
    async fetch(request) {
      state.request = request;
      let offset = 0;
      const body = request.method === "HEAD" ? null : new ReadableStream({
        pull(controller) {
          state.reads++;
          if (offset >= bytes.length) return controller.close();
          controller.enqueue(bytes.slice(offset, offset + 7));
          offset += 7;
        },
        cancel() { state.cancelled = true; },
      });
      return new Response(body, { headers: {
        "Content-Type": "video/mp4", "Content-Length": String(bytes.length),
        ETag: '"video-v1"', "Cache-Control": "public, max-age=31536000, immutable",
      } });
    },
  };
  return { assets, state };
}
const request = (range, extra = {}, method = "GET") => new Request("https://mariahesed.com/videos/sample.mp4", {
  method, headers: { ...(range ? { Range: range } : {}), ...extra },
});

test("Safari's two-byte probe returns only those bytes with correct range headers", async () => {
  const { assets, state } = fixture();
  const response = await serveVideo(request("bytes=0-1"), assets);
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("Content-Range"), "bytes 0-1/256");
  assert.equal(response.headers.get("Content-Length"), "2");
  assert.equal(response.headers.get("Accept-Ranges"), "bytes");
  assert.equal(response.headers.get("Content-Type"), "video/mp4");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes.slice(0, 2));
  assert.equal(state.request.headers.get("Range"), null);
  assert.equal(state.cancelled, true);
  assert.ok(state.reads < 10, "stop reading once the requested bytes have been sent");
});

test("seeks across chunk boundaries, open-ended ranges and suffixes preserve exact bytes", async () => {
  for (const [range, start, end] of [
    ["bytes=5-18", 5, 18], ["bytes=250-", 250, 255],
    ["bytes=-9", 247, 255], ["bytes=250-999", 250, 255], ["bytes=-999", 0, 255],
  ]) {
    const response = await serveVideo(request(range), fixture().assets);
    assert.equal(response.status, 206, range);
    assert.equal(response.headers.get("Content-Range"), `bytes ${start}-${end}/256`);
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes.slice(start, end + 1));
  }
});

test("the build manifest supplies the size when the asset binding omits Content-Length", async () => {
  const response = await serveVideo(request("bytes=0-1"), {
    fetch: async () => new Response(bytes, { headers: { "Content-Type": "video/mp4" } }),
  }, bytes.length);
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("Content-Range"), "bytes 0-1/256");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes.slice(0, 2));
});

test("unsatisfiable ranges return 416 without downloading the rest of the file", async () => {
  for (const range of ["bytes=256-", "bytes=50-10", "bytes=-0", "bytes=999999999999999999999-"]) {
    const { assets, state } = fixture();
    const response = await serveVideo(request(range), assets);
    assert.equal(response.status, 416, range);
    assert.equal(response.headers.get("Content-Range"), "bytes */256");
    assert.equal((await response.arrayBuffer()).byteLength, 0);
    assert.equal(state.cancelled, true);
  }
});

test("If-Range prevents mixing bytes from different video versions", async () => {
  for (const [validator, expected] of [['"video-v1"', 206], ['"old-video"', 200], ['W/"video-v1"', 200]]) {
    const response = await serveVideo(request("bytes=0-1", { "If-Range": validator }), fixture().assets);
    assert.equal(response.status, expected);
    assert.equal((await response.arrayBuffer()).byteLength, expected === 206 ? 2 : 256);
  }
});

test("normal GET, HEAD and unsupported ranges retain a full valid video response", async () => {
  for (const range of [null, "bytes=0-1,10-20", "items=0-1", "bytes=-", "invalid"]) {
    const response = await serveVideo(request(range), fixture().assets);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Accept-Ranges"), "bytes");
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  }
  const head = await serveVideo(request("bytes=0-1", {}, "HEAD"), fixture().assets);
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("Content-Length"), "256");
  assert.equal(head.body, null);
});

test("missing media cannot return SPA HTML and non-GET methods never read assets", async () => {
  const missing = await serveVideo(request("bytes=0-1"), {
    fetch: async () => new Response("<html>SPA fallback</html>", { headers: { "Content-Type": "text/html" } }),
  });
  assert.equal(missing.status, 404);
  const post = await serveVideo(request(null, {}, "POST"), {
    fetch: () => assert.fail("must not fetch assets for POST"),
  });
  assert.equal(post.status, 405);
});
