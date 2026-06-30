FROM python:3.12-slim

WORKDIR /app

COPY server/ server/
COPY batch/ batch/

RUN python -m pip install --no-cache-dir \
        fastapi>=0.115.0 \
        "uvicorn[standard]>=0.34.0" \
        python-multipart>=0.0.20 \
        boto3>=1.36.0 \
        requests>=2.31.0 \
        Pillow>=10.0.0

EXPOSE 10000

CMD uvicorn server.main:app --host 0.0.0.0 --port ${PORT:-10000}
