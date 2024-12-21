import { Server } from "@hapi/hapi";

(async function () {
  const server = new Server({
    port: process.env.PORT || 8080,
  });

  server.route({
    method: "*",
    options: {
      payload: {
        maxBytes: 104857600,
        parse: false,
      },
    },
    path: "/{path*}",
    handler: async function (request, h) {
      const { headers, method, payload } = request;
      const destination = headers["destination-host"];

      if (!destination)
        return h
          .response('{"error":"No destination host provided"}')
          .type("application/json")
          .code(400);

      delete headers["destination-host"];
      delete headers["x-serverless-authorization"];

      const apiResponse = await fetch(
        `https://${destination}/${request.params.path}`,
        {
          body:
            typeof payload === "undefined"
              ? undefined
              : Buffer.from(payload).toString("utf-8"),
          headers,
          method,
        },
      );

      const response = h
        .response(await apiResponse.text())
        .type(apiResponse.headers.get("content-type"));

      for (const [name, value] of apiResponse.headers.entries()) {
        if (
          name.toLowerCase("x-csrf-token") ||
          name.toLowerCase().startsWith("x-ratelimit")
        )
          response.header(name, value);
      }

      return response;
    },
  });

  await server.start();
})();
