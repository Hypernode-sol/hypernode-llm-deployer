"""
Stable Diffusion API Template for Hypernode
Text-to-image generation with multiple models support
"""

from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import torch
from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler
import os
import io
import base64
import logging
from PIL import Image

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="Stable Diffusion API",
    description="Hypernode-optimized Stable Diffusion inference endpoint",
    version="1.0.0"
)

# Configuration
MODEL_NAME = os.getenv("MODEL_NAME", "runwayml/stable-diffusion-v1-5")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
USE_XFORMERS = os.getenv("USE_XFORMERS", "true").lower() == "true"

# Global pipeline
pipe = None


class GenerateImageRequest(BaseModel):
    prompt: str
    negative_prompt: Optional[str] = None
    num_inference_steps: Optional[int] = 25
    guidance_scale: Optional[float] = 7.5
    width: Optional[int] = 512
    height: Optional[int] = 512
    num_images: Optional[int] = 1
    seed: Optional[int] = None


class GenerateImageResponse(BaseModel):
    images: List[str]  # Base64 encoded images
    seed: int
    model: str


@app.on_event("startup")
async def load_model():
    """Load Stable Diffusion model on startup"""
    global pipe

    try:
        logger.info(f"Loading model: {MODEL_NAME}")
        logger.info(f"Using device: {DEVICE}")

        # Load pipeline
        pipe = StableDiffusionPipeline.from_pretrained(
            MODEL_NAME,
            torch_dtype=torch.float16 if DEVICE == "cuda" else torch.float32,
            safety_checker=None,  # Disable for speed
            requires_safety_checker=False
        )

        # Optimize scheduler
        pipe.scheduler = DPMSolverMultistepScheduler.from_config(
            pipe.scheduler.config
        )

        # Move to device
        pipe = pipe.to(DEVICE)

        # Enable xformers for memory efficiency
        if DEVICE == "cuda" and USE_XFORMERS:
            try:
                pipe.enable_xformers_memory_efficient_attention()
                logger.info("xformers memory efficient attention enabled")
            except Exception as e:
                logger.warning(f"Could not enable xformers: {e}")

        # Enable attention slicing for lower memory usage
        if DEVICE == "cuda":
            pipe.enable_attention_slicing()

        logger.info("Model loaded successfully!")

    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}")
        raise


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model": MODEL_NAME,
        "device": DEVICE,
        "cuda_available": torch.cuda.is_available(),
        "xformers_enabled": USE_XFORMERS
    }


@app.post("/generate", response_model=GenerateImageResponse)
async def generate_image(request: GenerateImageRequest):
    """Generate images from text prompt"""

    if pipe is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Set seed if provided
        generator = None
        if request.seed is not None:
            generator = torch.Generator(device=DEVICE).manual_seed(request.seed)
        else:
            request.seed = torch.randint(0, 2**32, (1,)).item()
            generator = torch.Generator(device=DEVICE).manual_seed(request.seed)

        # Generate images
        with torch.autocast(DEVICE if DEVICE == "cuda" else "cpu"):
            output = pipe(
                prompt=request.prompt,
                negative_prompt=request.negative_prompt,
                num_inference_steps=request.num_inference_steps,
                guidance_scale=request.guidance_scale,
                width=request.width,
                height=request.height,
                num_images_per_prompt=request.num_images,
                generator=generator
            )

        # Convert images to base64
        images_base64 = []
        for image in output.images:
            buffered = io.BytesIO()
            image.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            images_base64.append(img_str)

        return GenerateImageResponse(
            images=images_base64,
            seed=request.seed,
            model=MODEL_NAME
        )

    except Exception as e:
        logger.error(f"Generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-image")
async def generate_image_file(request: GenerateImageRequest):
    """Generate single image and return as PNG file"""

    if pipe is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Force single image
        request.num_images = 1

        # Set seed
        generator = None
        if request.seed is not None:
            generator = torch.Generator(device=DEVICE).manual_seed(request.seed)
        else:
            generator = torch.Generator(device=DEVICE).manual_seed(
                torch.randint(0, 2**32, (1,)).item()
            )

        # Generate image
        with torch.autocast(DEVICE if DEVICE == "cuda" else "cpu"):
            output = pipe(
                prompt=request.prompt,
                negative_prompt=request.negative_prompt,
                num_inference_steps=request.num_inference_steps,
                guidance_scale=request.guidance_scale,
                width=request.width,
                height=request.height,
                generator=generator
            )

        # Return image as PNG
        image = output.images[0]
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        buffered.seek(0)

        return StreamingResponse(buffered, media_type="image/png")

    except Exception as e:
        logger.error(f"Generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/model-info")
async def model_info():
    """Get model information"""
    if pipe is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    return {
        "model_name": MODEL_NAME,
        "device": DEVICE,
        "dtype": str(pipe.unet.dtype),
        "xformers_enabled": USE_XFORMERS,
        "scheduler": pipe.scheduler.__class__.__name__
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
