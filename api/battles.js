const headers = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

export default function handler(request, response) {
  if (request.method !== "POST") {
    return sendJson(response, 405, { error: "Method not allowed" });
  }
  return sendJson(response, 409, {
    error: "The hosted showcase is read-only. Run Bout locally to create a real review bundle.",
  });
}

function sendJson(response, status, value) {
  for (const [name, content] of Object.entries(headers)) response.setHeader(name, content);
  response.statusCode = status;
  response.end(JSON.stringify(value));
}
