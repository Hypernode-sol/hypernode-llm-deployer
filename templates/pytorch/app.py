"""
PyTorch Inference API Template for Hypernode
Supports any HuggingFace model with PyTorch backend
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="PyTorch Inference API",
    description="Hypernode-optimized PyTorch inference endpoint",
    version="1.0.0"
)

# Model configuration
MODEL_NAME = os.getenv("MODEL_NAME", "meta-llama/Llama-2-7b-chat-hf")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
MAX_LENGTH = int(os.getenv("MAX_LENGTH", "2048"))

# Global model and tokenizer
model = None
tokenizer = None


class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: Optional[int] = 100
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.9
    stop_sequences: Optional[List[str]] = None


class GenerateResponse(BaseModel):
    generated_text: str
    tokens_generated: int
    device: str


@app.on_event("startup")
async def load_model():
    """Load model on startup"""
    global model, tokenizer

    try:
        logger.info(f"Loading model: {MODEL_NAME}")
        logger.info(f"Using device: {DEVICE}")

        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

        # Load model with optimizations
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_NAME,
            torch_dtype=torch.float16 if DEVICE == "cuda" else torch.float32,
            device_map="auto" if DEVICE == "cuda" else None,
            low_cpu_mem_usage=True
        )

        if DEVICE == "cpu":
            model = model.to(DEVICE)

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
        "cuda_available": torch.cuda.is_available()
    }


@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """Generate text from prompt"""

    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Tokenize input
        inputs = tokenizer(
            request.prompt,
            return_tensors="pt",
            truncation=True,
            max_length=MAX_LENGTH
        ).to(DEVICE)

        # Generate
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=request.max_tokens,
                temperature=request.temperature,
                top_p=request.top_p,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )

        # Decode
        generated_text = tokenizer.decode(
            outputs[0],
            skip_special_tokens=True
        )

        # Remove input prompt from output
        generated_text = generated_text[len(request.prompt):].strip()

        return GenerateResponse(
            generated_text=generated_text,
            tokens_generated=len(outputs[0]) - len(inputs.input_ids[0]),
            device=DEVICE
        )

    except Exception as e:
        logger.error(f"Generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/model-info")
async def model_info():
    """Get model information"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    return {
        "model_name": MODEL_NAME,
        "device": DEVICE,
        "dtype": str(model.dtype),
        "num_parameters": sum(p.numel() for p in model.parameters()),
        "max_length": MAX_LENGTH
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
