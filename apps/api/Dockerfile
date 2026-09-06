FROM ghcr.io/astral-sh/uv:0.12.10 AS uv

FROM python:3.12.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

COPY --from=uv /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY src ./src
RUN uv sync --frozen --no-dev

USER 65532:65532
EXPOSE 8000

CMD ["uvicorn", "poma_api.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
