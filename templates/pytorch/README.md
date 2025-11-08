# PyTorch Template for Hypernode

Deploy any PyTorch-based model on Hypernode with GPU acceleration.

## Features

- **GPU Accelerated**: Automatic CUDA detection and optimization
- **Memory Efficient**: Uses `float16` on GPU, `bitsandbytes` quantization support
- **FastAPI Backend**: Production-ready REST API
- **Health Checks**: Built-in monitoring endpoints
- **Flexible**: Works with any HuggingFace model

## Quick Start

### 1. Build the Docker image

```bash
docker build -t hypernode-pytorch .
```

### 2. Run locally (CPU)

```bash
docker run -p 8000:8000 \
  -e MODEL_NAME="gpt2" \
  hypernode-pytorch
```

### 3. Run with GPU

```bash
docker run --gpus all -p 8000:8000 \
  -e MODEL_NAME="meta-llama/Llama-2-7b-chat-hf" \
  -e HF_TOKEN="your_huggingface_token" \
  hypernode-pytorch
```

### 4. Deploy to Hypernode

```bash
hypernode deploy \
  --template pytorch \
  --model meta-llama/Llama-2-7b-chat-hf \
  --gpu-memory 16GB \
  --replicas 3
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MODEL_NAME` | `meta-llama/Llama-2-7b-chat-hf` | HuggingFace model ID |
| `MAX_LENGTH` | `2048` | Maximum sequence length |
| `HF_TOKEN` | - | HuggingFace API token (for gated models) |

## API Endpoints

### Generate Text

```bash
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain quantum computing in simple terms",
    "max_tokens": 200,
    "temperature": 0.7
  }'
```

### Health Check

```bash
curl http://localhost:8000/health
```

### Model Info

```bash
curl http://localhost:8000/model-info
```

## Supported Models

This template works with any PyTorch-based HuggingFace model:

- **Llama**: `meta-llama/Llama-2-7b-chat-hf`, `meta-llama/Llama-3.1-8B`
- **Mistral**: `mistralai/Mistral-7B-Instruct-v0.2`
- **Qwen**: `Qwen/Qwen2.5-7B-Instruct`
- **DeepSeek**: `deepseek-ai/deepseek-coder-6.7b-instruct`
- **Phi**: `microsoft/phi-2`
- **GPT-2**: `gpt2`, `gpt2-large`

## Performance Optimization

### For Large Models (>13B parameters)

Add 8-bit quantization:

```python
model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    load_in_8bit=True,  # Add this line
    device_map="auto"
)
```

### For Extra Large Models (>70B parameters)

Use 4-bit quantization:

```python
from transformers import BitsAndBytesConfig

quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16
)

model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    quantization_config=quantization_config,
    device_map="auto"
)
```

## Troubleshooting

### Out of Memory Error

Reduce `MAX_LENGTH` or use quantization:

```bash
docker run --gpus all -p 8000:8000 \
  -e MODEL_NAME="meta-llama/Llama-2-7b-chat-hf" \
  -e MAX_LENGTH="1024" \
  hypernode-pytorch
```

### Model Download Failed

Ensure you have HuggingFace token for gated models:

```bash
docker run --gpus all -p 8000:8000 \
  -e MODEL_NAME="meta-llama/Llama-2-7b-chat-hf" \
  -e HF_TOKEN="hf_xxxxxxxxxxxx" \
  hypernode-pytorch
```

## License

MIT
