# Stable Diffusion Template for Hypernode

Deploy Stable Diffusion models on Hypernode for text-to-image generation.

## Features

- **GPU Accelerated**: CUDA optimization with xformers
- **Memory Efficient**: Attention slicing for lower VRAM usage
- **Multiple Models**: Support for SD 1.5, SD 2.1, SDXL
- **Fast Generation**: DPM++ scheduler for quality at 25 steps
- **REST API**: Easy integration with any application

## Quick Start

### 1. Build and run locally

```bash
docker build -t hypernode-stable-diffusion .

# Run with GPU
docker run --gpus all -p 8000:8000 \
  -e MODEL_NAME="runwayml/stable-diffusion-v1-5" \
  hypernode-stable-diffusion
```

### 2. Deploy to Hypernode

```bash
hypernode deploy \
  --template stable-diffusion \
  --model runwayml/stable-diffusion-v1-5 \
  --gpu-memory 8GB \
  --replicas 2
```

### 3. Generate your first image

```bash
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful sunset over mountains, digital art, trending on artstation",
    "negative_prompt": "blurry, low quality, distorted",
    "num_inference_steps": 30,
    "guidance_scale": 7.5,
    "width": 512,
    "height": 512,
    "seed": 42
  }' > output.json
```

Extract image from JSON:
```bash
# Linux/Mac
cat output.json | jq -r '.images[0]' | base64 -d > image.png

# Python
python -c "import json, base64;
data = json.load(open('output.json'));
open('image.png', 'wb').write(base64.b64decode(data['images'][0]))"
```

### 4. Download image directly

```bash
curl -X POST http://localhost:8000/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A cute robot playing guitar, 3D render",
    "num_inference_steps": 25
  }' --output robot.png
```

## Supported Models

| Model | VRAM | Resolution | Description |
|-------|------|------------|-------------|
| `runwayml/stable-diffusion-v1-5` | 4GB | 512x512 | Best balance |
| `stabilityai/stable-diffusion-2-1` | 6GB | 768x768 | Higher quality |
| `stabilityai/stable-diffusion-xl-base-1.0` | 10GB | 1024x1024 | Best quality |
| `dreamlike-art/dreamlike-photoreal-2.0` | 4GB | 512x512 | Photorealistic |
| `prompthero/openjourney` | 4GB | 512x512 | Midjourney style |

## API Parameters

### Generate Endpoint

```json
{
  "prompt": "string",              // REQUIRED: Text description of image
  "negative_prompt": "string",     // Optional: What to avoid
  "num_inference_steps": 25,       // Steps (15-50, default: 25)
  "guidance_scale": 7.5,           // Prompt adherence (1-20, default: 7.5)
  "width": 512,                    // Image width (default: 512)
  "height": 512,                   // Image height (default: 512)
  "num_images": 1,                 // Number of images (1-4)
  "seed": 42                       // Optional: For reproducibility
}
```

## Python Integration

```python
import requests
import base64
from PIL import Image
import io

# Generate image
response = requests.post(
    "http://localhost:8000/generate",
    json={
        "prompt": "A futuristic city at night, neon lights, cyberpunk",
        "num_inference_steps": 30,
        "guidance_scale": 8.0,
        "width": 768,
        "height": 512
    }
)

data = response.json()

# Decode and save image
img_data = base64.b64decode(data['images'][0])
image = Image.open(io.BytesIO(img_data))
image.save("cyberpunk_city.png")
print(f"Seed used: {data['seed']}")
```

## Performance Optimization

### Lower VRAM Usage (4GB GPUs)

```bash
docker run --gpus all -p 8000:8000 \
  -e MODEL_NAME="runwayml/stable-diffusion-v1-5" \
  -e USE_XFORMERS="true" \
  hypernode-stable-diffusion
```

### Faster Generation

Reduce steps for speed (slight quality loss):

```json
{
  "prompt": "your prompt",
  "num_inference_steps": 15,  // Instead of 25
  "guidance_scale": 7.0
}
```

### Batch Generation

Generate multiple images in one request:

```json
{
  "prompt": "your prompt",
  "num_images": 4
}
```

## Example Prompts

### Photorealistic Portrait

```
"portrait of a woman with blue eyes, natural lighting,
 professional photography, 85mm lens, f/1.4, 8k uhd, dslr"
```

Negative: `"cartoon, drawing, illustration, low quality, blurry"`

### Fantasy Landscape

```
"epic fantasy landscape, mountains, castle on cliff,
 golden hour lighting, dramatic clouds, concept art,
 trending on artstation, highly detailed"
```

### Sci-Fi Scene

```
"futuristic space station interior, holographic displays,
 neon lights, volumetric lighting, unreal engine,
 octane render, 4k"
```

## Troubleshooting

### Out of Memory

- Use smaller resolution (512x512 instead of 768x768)
- Reduce `num_images` to 1
- Enable xformers: `USE_XFORMERS=true`

### Slow Generation

- Check GPU is being used: `curl http://localhost:8000/health`
- Reduce `num_inference_steps` to 20
- Use faster scheduler (already using DPM++)

### Poor Image Quality

- Increase `num_inference_steps` to 40-50
- Adjust `guidance_scale` (try 7-12)
- Add detailed negative prompt
- Try different models for your use case

## Production Deployment

For high-traffic production:

```bash
hypernode deploy \
  --template stable-diffusion \
  --model stabilityai/stable-diffusion-2-1 \
  --gpu-memory 8GB \
  --replicas 5 \
  --auto-scale \
  --min-replicas 2 \
  --max-replicas 10
```

## License

MIT

**Note**: Model licenses vary. Check the specific model's license on HuggingFace before commercial use.
