# syntax=docker/dockerfile:1
# Backend image: multi-stage build -> lean JRE runtime with the Spring Boot layered jar.
# The same image runs locally (docker compose) and in AWS App Runner (ECR push).

# ---- Stage 1: build ----
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Layer-cache the Maven dependencies first
COPY pom.xml .
RUN mvn -q dependency:go-offline -B

# Build the layered jar (dependencies/app/spring-boot-loader split)
COPY src ./src
RUN mvn -q package -DskipTests -B && \
    java -Djarmode=layertools -jar target/AgileCapacityTracker-1.0-SNAPSHOT.jar extract

# ---- Stage 2: runtime ----
FROM eclipse-temurin:17-jre AS runtime
WORKDIR /app

# Non-root runtime user
RUN groupadd -r spring && useradd -r -g spring spring

# Copy layers in cache-friendly order (dependencies change least)
COPY --from=build /app/dependencies/ ./
COPY --from=build /app/spring-boot-loader/ ./
COPY --from=build /app/snapshot-dependencies/ ./
COPY --from=build /app/application/ ./

USER spring
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD ["/bin/sh", "-c", "wget -qO- http://localhost:8080/actuator/health/liveness || exit 1"]

ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
