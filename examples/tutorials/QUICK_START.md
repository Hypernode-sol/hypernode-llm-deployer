# Quick Start: Deploy Your First AI Model on Hypernode

Get your first AI model running on Hypernode in under 5 minutes.

## Choose Your Template

### 1. Stable Diffusion (Image Generation)

**Perfect for**: Creating images from text, art generation, design tools

```bash
cd templates/stable-diffusion

# Test locally first
docker build -t my-stable-diffusion .
docker run --gpus all -p 8000:8000 my-stable-diffusion

# Generate an image
curl -X POST http://localhost:8000/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A serene mountain landscape at sunset, oil painting style",
    "num_inference_steps": 25
  }' --output my_first_image.png

# Deploy to Hypernode
hypernode deploy \
  --name my-stable-diffusion \
  --template stable-diffusion \
  --gpu-memory 8GB
```

### 2. PyTorch (Text Generation)

**Perfect for**: Chatbots, text completion, code generation

```bash
cd templates/pytorch

# Build locally
docker build -t my-llm .

# Run with Llama 2
docker run --gpus all -p 8000:8000 \
  -e MODEL_NAME="meta-llama/Llama-2-7b-chat-hf" \
  -e HF_TOKEN="your_huggingface_token" \
  my-llm

# Test generation
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain quantum computing to a 10-year-old:",
    "max_tokens": 150,
    "temperature": 0.7
  }'

# Deploy to Hypernode
hypernode deploy \
  --name my-llm \
  --template pytorch \
  --model meta-llama/Llama-2-7b-chat-hf \
  --gpu-memory 16GB
```

### 3. HuggingFace (Embeddings & Classification)

**Perfect for**: Semantic search, sentiment analysis, text classification

```bash
cd templates/huggingface

# Build for embeddings
docker build -t my-embeddings .

# Run sentence transformer
docker run --gpus all -p 8000:8000 \
  -e MODEL_NAME="sentence-transformers/all-MiniLM-L6-v2" \
  -e TASK="feature-extraction" \
  my-embeddings

# Get text embeddings
curl -X POST http://localhost:8000/embed \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hypernode is amazing for AI deployment"
  }'

# Deploy to Hypernode
hypernode deploy \
  --name my-embeddings \
  --template huggingface \
  --task feature-extraction \
  --gpu-memory 4GB
```

---

## Step-by-Step: Deploy Stable Diffusion

Let's deploy Stable Diffusion as a complete example:

### Step 1: Prerequisites

```bash
# Install Docker with GPU support
# Linux: https://docs.docker.com/engine/install/
# Install NVIDIA Container Toolkit: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html

# Verify GPU is accessible
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
```

### Step 2: Clone and Build

```bash
# Clone the repository
git clone https://github.com/Hypernode-sol/hypernode-llm-deployer.git
cd hypernode-llm-deployer/templates/stable-diffusion

# Build the Docker image (takes 5-10 minutes)
docker build -t stable-diffusion-hypernode .
```

### Step 3: Run Locally

```bash
# Start the server
docker run --gpus all -p 8000:8000 \
  -e MODEL_NAME="runwayml/stable-diffusion-v1-5" \
  stable-diffusion-hypernode

# Wait for "Model loaded successfully!" in logs
# First run downloads the model (~4GB)
```

### Step 4: Test It

```bash
# Check health
curl http://localhost:8000/health

# Generate your first image
curl -X POST http://localhost:8000/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A futuristic robot playing piano, digital art, 4k",
    "negative_prompt": "blurry, low quality",
    "num_inference_steps": 30,
    "guidance_scale": 7.5,
    "seed": 42
  }' --output robot_piano.png

# Open robot_piano.png to see your image!
```

### Step 5: Deploy to Hypernode

```bash
# Install Hypernode CLI
npm install -g @hypernode/cli

# Login with your Solana wallet
hypernode login

# Deploy (pushes Docker image and creates deployment)
hypernode deploy \
  --name my-stable-diffusion \
  --docker-image stable-diffusion-hypernode \
  --gpu-memory 8GB \
  --region us-west \
  --replicas 2 \
  --auto-scale

# Get your endpoint
# Output: https://my-stable-diffusion-abc123.hypernode.sol
```

### Step 6: Use Your Deployed API

```python
import requests

API_URL = "https://my-stable-diffusion-abc123.hypernode.sol"

response = requests.post(
    f"{API_URL}/generate-image",
    json={
        "prompt": "A serene Japanese garden with cherry blossoms",
        "num_inference_steps": 25
    }
)

# Save image
with open("garden.png", "wb") as f:
    f.write(response.content)
```

---

## Pricing Calculator

### Stable Diffusion (512x512, 25 steps)

| GPU | Generation Time | Cost per Image | Cost per 1000 Images |
|-----|-----------------|----------------|---------------------|
| RTX 4090 | 2 seconds | 0.001 HYPER | 1 HYPER (~$10) |
| RTX 3090 | 3 seconds | 0.0015 HYPER | 1.5 HYPER (~$15) |
| A100 | 1.5 seconds | 0.002 HYPER | 2 HYPER (~$20) |

**Compare**: Midjourney: $10/200 images = $50/1000 images 🎯 **Hypernode is 5x cheaper**

### LLM Text Generation (Llama 2 7B)

| GPU | Tokens/Second | Cost per 1M tokens | vs OpenAI GPT-4 |
|-----|---------------|-------------------|-----------------|
| RTX 4090 | 150 | 2 HYPER (~$20) | 🎯 **66% cheaper** |
| A100 | 200 | 2.5 HYPER (~$25) | 🎯 **58% cheaper** |

---

## Next Steps

1. **Customize Your Model**
   - Edit `app.py` to add custom logic
   - Add preprocessing/postprocessing
   - Implement rate limiting

2. **Optimize Performance**
   - Enable xformers for lower memory
   - Use quantization for larger models
   - Add model caching

3. **Build Your Application**
   - Integrate with your frontend
   - Add user authentication
   - Monitor usage and costs

---

## Troubleshooting

### Container exits immediately

```bash
# Check logs
docker logs <container_id>

# Common issue: Out of memory
# Solution: Use smaller model or add swap
```

### CUDA out of memory

```bash
# Use CPU for testing
docker run -p 8000:8000 \
  -e MODEL_NAME="runwayml/stable-diffusion-v1-5" \
  stable-diffusion-hypernode

# Or use smaller model
-e MODEL_NAME="CompVis/stable-diffusion-v1-4"
```

### Model download is slow

```bash
# Mount cache directory to avoid re-downloading
docker run --gpus all -p 8000:8000 \
  -v $(pwd)/model_cache:/app/model_cache \
  stable-diffusion-hypernode
```

---

## Community & Support

- **Discord**: [discord.gg/hypernode](#) *(coming soon)*
- **GitHub Issues**: [Report bugs or request features](https://github.com/Hypernode-sol/hypernode-llm-deployer/issues)
- **Email**: contact@hypernodesolana.org
- **Twitter**: [@HypernodeSol](https://twitter.com/HypernodeSol)

---

**Ready to deploy? Start with Stable Diffusion and see your first AI-generated image in 5 minutes! 🚀**
