# ---- Base image ----
FROM python:3.12-slim

# ---- Environment ----
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# ---- Workdir ----
WORKDIR /app

# ---- System deps ----
RUN apt-get update \
    && apt-get install -y build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# ---- Python deps ----
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---- Project files ----
COPY . .

# ---- Collect static ----
RUN python manage.py collectstatic --noinput

# ---- Expose ----
EXPOSE 8000

# ---- Run ----
CMD ["gunicorn", "playto_config.wsgi:application", "--bind", "0.0.0.0:8000"]