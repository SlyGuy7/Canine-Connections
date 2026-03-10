import http from "http"

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:7012")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
}

const server = http.createServer((req, res) => {
  setCors(res)

  if (req.method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === "POST" && req.url === "/api") {
    let body = ""
    req.on("data", (chunk) => (body += chunk))
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ success: true, received: JSON.parse(body || "{}") }))
    })
    return
  }

  res.writeHead(404, { "Content-Type": "application/json" })
  res.end(JSON.stringify({ success: false }))
})

server.listen(9999, "0.0.0.0", () => {
  console.log("mock messaging listening on 9999")
})