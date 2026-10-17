# --- Build stage ---
FROM eclipse-temurin:17-jdk AS build
WORKDIR /workspace
COPY gradlew gradlew
COPY gradle gradle
COPY build.gradle settings.gradle gradle.properties ./
COPY src src
RUN chmod +x gradlew && ./gradlew --no-daemon bootJar

# --- Runtime stage ---
FROM eclipse-temurin:17-jre
RUN useradd --system --uid 10001 --create-home fame
WORKDIR /app
COPY --from=build /workspace/build/libs/*.jar app.jar
USER fame
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD ["sh", "-c", "wget -q -O /dev/null http://localhost:8080/actuator/health || exit 1"]
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
