const headers = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

export default function handler(request, response) {
  if (request.method !== "GET") {
    return sendJson(response, 405, { error: "Method not allowed" });
  }

  return sendJson(response, 200, {
    generatedAt: new Date().toISOString(),
    battles: [],
    liveBounties: [],
    liveStatus: "unconfigured",
    liveMessage: "The hosted showcase has no wallet or local workspace. Run Bout locally for real Gibwork data.",
    storage: {
      engine: "SQLite",
      scope: "Hosted showcase",
      persistence: "Read-only",
    },
    stats: {
      total: 0,
      prepared: 0,
      published: 0,
      reviewed: 0,
      synced: 0,
      reported: 0,
      totalPool: 0,
    },
  });
}

function sendJson(response, status, value) {
  for (const [name, content] of Object.entries(headers)) response.setHeader(name, content);
  response.statusCode = status;
  response.end(JSON.stringify(value));
}
