FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY src ./src
RUN mkdir out && javac -encoding UTF-8 -d out src/main/java/limegram/*.java && cp -r src/main/resources/web out/web

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/out ./out
# драйвер Postgres (для хранения данных во внешней базе, например Neon)
ADD https://repo1.maven.org/maven2/org/postgresql/postgresql/42.7.4/postgresql-42.7.4.jar /app/lib/postgresql.jar
ENV LIMEGRAM_DATA=/tmp/limegram.json
ENV PORT=8080
CMD ["java", "-Xmx300m", "-Dstdout.encoding=UTF-8", "-cp", "out:lib/postgresql.jar", "limegram.Main"]
