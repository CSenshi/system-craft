# This file is generated by Nx.
#
# Build the docker image with `npx nx docker-build @apps/url-shortener`.
# Tip: Modify "docker-build" options in project.json to change docker build args.
#
# Run the container with `docker run -p 3000:3000 -t apps-url-shortener`.
FROM docker.io/node:lts-alpine

ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app

RUN addgroup --system apps-url-shortener && \
          adduser --system -G apps-url-shortener apps-url-shortener

COPY apps/url-shortener/dist apps-url-shortener/
COPY apps/url-shortener/package.json apps-url-shortener/
RUN chown -R apps-url-shortener:apps-url-shortener .

# You can remove this install step if you build with `--bundle` option.
# The bundled output will include external dependencies.
RUN npm --prefix apps-url-shortener --omit=dev -f install

CMD [ "node", "apps-url-shortener" ]
