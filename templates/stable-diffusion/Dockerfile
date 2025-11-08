# Stable Diffusion Template for Hypernode
# Optimized for image generation with CUDA support

FROM pytorch/pytorch:2.2.0-cuda12.1-cudnn8-runtime

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    wget \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    diffusers==0.26.3 \
    transformers==4.37.2 \
    accelerate==0.26.1 \
    safetensors==0.4.2 \
    fastapi==0.109.0 \
    uvicorn[standard]==0.27.0 \
    python-multipart==0.0.6 \
    pillow==10.2.0 \
    xformers==0.0.24

# Set working directory
WORKDIR /app

# Copy application files
COPY app.py /app/
COPY requirements.txt /app/

# Create directories
RUN mkdir -p /app/outputs /app/model_cache
ENV HF_HOME=/app/model_cache

# Expose API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
