// Workers Static Assets ignores Range. Safari's video player requires real
// byte responses, including its initial bytes=0-1 probe.
// https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/#range-requests
function byteRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(value.trim());
  // Unsupported/malformed or multipart ranges may be ignored (return full file).
  if (!match || (!match[1] && !match[2])) return null;
  const first = Number(match[1]);
  const last = Number(match[2]);
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || size === 0)
    return false;
  if (!match[1]) {
    if (last === 0) return false;
    return { start: Math.max(0, size - last), end: size - 1 };
  }
  if (first >= size || (match[2] && last < first)) return false;
  return { start: first, end: match[2] ? Math.min(last, size - 1) : size - 1 };
}

function rangeStream(body, start, end) {
  const reader = body.getReader();
  let offset = 0;
  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        const chunkStart = offset;
        offset += value.byteLength;
        if (offset <= start) continue;
        controller.enqueue(value.subarray(
          Math.max(0, start - chunkStart),
          Math.min(value.byteLength, end - chunkStart + 1),
        ));
        if (offset > end) {
          controller.close();
          await reader.cancel();
        }
        return;
      }
    },
    cancel(reason) { return reader.cancel(reason); },
  });
}

export async function serveVideo(request, assets, sizeHint) {
  if (!["GET", "HEAD"].includes(request.method))
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("Range");
  requestHeaders.delete("If-Range");
  requestHeaders.set("Accept-Encoding", "identity");
  const asset = await assets.fetch(new Request(request, { headers: requestHeaders }));
  if (asset.status !== 200) return asset;
  // A nonexistent path must not turn into the SPA's HTML with a video MIME type.
  if (!asset.headers.get("Content-Type")?.startsWith("video/")) {
    await asset.body?.cancel();
    return new Response(null, { status: 404 });
  }

  const headers = new Headers(asset.headers);
  // The binding may omit Content-Length internally even when it is present
  // on the wire. Sizes are generated from the same files in every build.
  const size = headers.has("Content-Length") ? Number(headers.get("Content-Length")) : sizeHint;
  if (!Number.isSafeInteger(size) || size < 0)
    return asset;
  headers.set("Content-Length", String(size));
  headers.set("Accept-Ranges", "bytes");
  const full = () => new Response(asset.body, { status: 200, headers });
  const rangeHeader = request.headers.get("Range");
  if (!rangeHeader || request.method === "HEAD") return full();

  const ifRange = request.headers.get("If-Range");
  if (ifRange && (ifRange.startsWith("W/") ||
      (ifRange !== headers.get("ETag") && ifRange !== headers.get("Last-Modified"))))
    return full();
  const range = byteRange(rangeHeader, size);
  if (range === null) return full();
  if (range === false) {
    await asset.body?.cancel();
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${size}`, "Accept-Ranges": "bytes", "Cache-Control": "no-store" },
    });
  }

  const length = range.end - range.start + 1;
  headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
  headers.set("Content-Length", String(length));
  // Keep memory bounded and preserve Content-Length in the Workers runtime.
  const body = rangeStream(asset.body, range.start, range.end)
    .pipeThrough(new FixedLengthStream(length));
  return new Response(body, { status: 206, headers });
}
