# HuggingFace Transformers Template for Hypernode

Deploy any HuggingFace model using the Pipeline API for text generation, embeddings, and classification.

## Features

- **Multiple Tasks**: Text generation, embeddings, classification, zero-shot
- **Pipeline API**: Simplified HuggingFace interface
- **GPU Optimized**: Automatic CUDA detection
- **Production Ready**: FastAPI with health checks
- **Flexible**: Works with any transformer model

## Quick Start

### 1. Text Generation (Default)

```bash
docker build -t hypernode-hf .

docker run --gpus all -p 8000:8000 \
  -e MODEL_NAME="meta-llama/Llama-2-7b-chat-hf" \
  -e TASK="text-generation" \
  hypernode-hf
```

### 2. Text Embeddings

```bash
docker run --gpus all -p 8000:8000 \
  -e MODEL_NAME="sentence-transformers/all-MiniLM-L6-v2" \
  -e TASK="feature-extraction" \
  hypernode-hf
```

### 3. Text Classification

```bash
docker run --gpus all -p 8000:8000 \
  -e MODEL_NAME="distilbert-base-uncased-finetuned-sst-2-english" \
  -e TASK="text-classification" \
  hypernode-hf
```

### 4. Deploy to Hypernode

```bash
hypernode deploy \
  --template huggingface \
  --model meta-llama/Llama-2-7b-chat-hf \
  --task text-generation \
  --gpu-memory 16GB
```

## Supported Tasks

| Task | Description | Example Models |
|------|-------------|----------------|
| `text-generation` | Generate text from prompt | Llama, Mistral, GPT-2 |
| `feature-extraction` | Get text embeddings | sentence-transformers, BERT |
| `text-classification` | Classify text sentiment | DistilBERT, RoBERTa |
| `zero-shot-classification` | Classify without training | facebook/bart-large-mnli |
| `translation` | Translate between languages | Helsinki-NLP models |
| `summarization` | Summarize long text | facebook/bart-large-cnn |

## API Examples

### Generate Text

```bash
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The future of AI is",
    "max_new_tokens": 100,
    "temperature": 0.8
  }'
```

Response:
```json
{
  "results": [
    {
      "generated_text": "The future of AI is incredibly promising, with applications in healthcare, education, and automation..."
    }
  ],
  "model": "meta-llama/Llama-2-7b-chat-hf",
  "device": "cuda"
}
```

### Get Embeddings

```bash
curl -X POST http://localhost:8000/embed \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hypernode is a decentralized compute network",
    "normalize": true
  }'
```

Response:
```json
{
  "embedding": [0.023, -0.145, 0.678, ...],
  "dimensions": 384,
  "model": "sentence-transformers/all-MiniLM-L6-v2"
}
```

### Classify Text

```bash
curl -X POST http://localhost:8000/classify \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This product is amazing! I love it!",
    "top_k": 2
  }'
```

Response:
```json
{
  "results": [
    {"label": "POSITIVE", "score": 0.9998},
    {"label": "NEGATIVE", "score": 0.0002}
  ],
  "model": "distilbert-base-uncased-finetuned-sst-2-english"
}
```

## Popular Model Combinations

### Llama 2 Chat (Text Generation)

```bash
MODEL_NAME="meta-llama/Llama-2-7b-chat-hf"
TASK="text-generation"
```

### Sentence Embeddings

```bash
MODEL_NAME="sentence-transformers/all-mpnet-base-v2"
TASK="feature-extraction"
```

### Sentiment Analysis

```bash
MODEL_NAME="cardiffnlp/twitter-roberta-base-sentiment-latest"
TASK="text-classification"
```

### Code Generation

```bash
MODEL_NAME="Salesforce/codegen-350M-mono"
TASK="text-generation"
```

## Performance Tips

### Batch Processing

For embeddings, process multiple texts at once:

```python
embeddings = pipe([
    "Text 1",
    "Text 2",
    "Text 3"
])
```

### Memory Optimization

For large models, add quantization:

```dockerfile
ENV TRANSFORMERS_LOAD_IN_8BIT=1
```

### Caching

Models are cached in `/app/model_cache`. Mount a volume for persistence:

```bash
docker run --gpus all -p 8000:8000 \
  -v $(pwd)/cache:/app/model_cache \
  -e MODEL_NAME="meta-llama/Llama-2-7b-chat-hf" \
  hypernode-hf
```

## Troubleshooting

### Model Not Found

Ensure the model exists on HuggingFace Hub:
- Visit https://huggingface.co/models
- Check model name is correct
- For gated models, set `HF_TOKEN` environment variable

### Out of Memory

- Use smaller model variant (e.g., 7B instead of 13B)
- Enable 8-bit quantization
- Reduce batch size

### Slow Inference

- Ensure GPU is being used (check `/health` endpoint)
- Use optimized model formats (ONNX, TensorRT)
- Enable Flash Attention for long sequences

## License

MIT
