const headers = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

export default function handler(request, response) {
  if (request.method !== "GET") {
    return sendJson(response, 405, { error: "Method not allowed" });
  }
  return sendJson(response, 200, {
    ok: true,
    mode: "hosted-showcase",
    persistence: "read-only",
  });
}

function sendJson(response, status, value) {
  for (const [name, content] of Object.entries(headers)) response.setHeader(name, content);
  response.statusCode = status;
  response.end(JSON.stringify(value));
}
