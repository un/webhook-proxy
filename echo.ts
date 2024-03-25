import http from "http";
const server = http.createServer();

server
  .on("request", (request, response) => {
    let body: any[] = [];
    request
      .on("data", (chunk) => {
        body.push(chunk);
      })
      .on("end", () => {
        const wholeBody = Buffer.concat(body).toString();
        console.log(`[${new Date().toLocaleString()}]`);
        console.log(`==== ${request.method} ${request.url}`);
        console.log("> Headers");
        console.log(request.headers);
        console.log("> Body");
        console.log(wholeBody);
        response.end();
      });
  })
  .listen(3001)
  .once("listening", () => {
    console.log("Test server is listening on port 3001");
  });
