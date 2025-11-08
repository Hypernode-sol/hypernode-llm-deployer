# HuggingFace Transformers Template for Hypernode
# Optimized for text generation, embeddings, and classification

FROM huggingface/transformers-pytorch-gpu:latest

# Install additional dependencies
RUN pip install --no-cache-dir \
    fastapi==0.109.0 \
    uvicorn[standard]==0.27.0 \
    pydantic==2.6.0 \
    python-multipart==0.0.6 \
    optimum==1.16.2 \
    einops==0.7.0

# Set working directory
WORKDIR /app

# Copy application files
COPY app.py /app/
COPY requirements.txt /app/

# Create cache directory
RUN mkdir -p /app/model_cache
ENV HF_HOME=/app/model_cache

# Expose API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
