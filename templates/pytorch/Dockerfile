# PyTorch Template for Hypernode
# Optimized for GPU inference with CUDA support

FROM pytorch/pytorch:2.2.0-cuda12.1-cudnn8-runtime

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    fastapi==0.109.0 \
    uvicorn[standard]==0.27.0 \
    pydantic==2.6.0 \
    transformers==4.37.2 \
    accelerate==0.26.1 \
    bitsandbytes==0.42.0 \
    sentencepiece==0.1.99 \
    protobuf==4.25.2

# Set working directory
WORKDIR /app

# Copy application code
COPY app.py /app/
COPY requirements.txt /app/

# Expose API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
