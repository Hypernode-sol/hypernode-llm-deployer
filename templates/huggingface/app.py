"""
HuggingFace Pipeline API Template for Hypernode
Supports text generation, embeddings, classification, and more
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Literal
import torch
from transformers import pipeline, AutoTokenizer, AutoModel
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="HuggingFace Pipeline API",
    description="Hypernode-optimized HuggingFace transformers endpoint",
    version="1.0.0"
)

# Configuration
MODEL_NAME = os.getenv("MODEL_NAME", "meta-llama/Llama-2-7b-chat-hf")
TASK = os.getenv("TASK", "text-generation")  # text-generation, feature-extraction, text-classification
DEVICE = 0 if torch.cuda.is_available() else -1

# Global pipeline
pipe = None


class TextGenerationRequest(BaseModel):
    text: str
    max_new_tokens: Optional[int] = 100
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.9
    top_k: Optional[int] = 50
    num_return_sequences: Optional[int] = 1


class EmbeddingRequest(BaseModel):
    text: str
    normalize: Optional[bool] = True


class ClassificationRequest(BaseModel):
    text: str
    top_k: Optional[int] = 5


@app.on_event("startup")
async def load_pipeline():
    """Load HuggingFace pipeline on startup"""
    global pipe

    try:
        logger.info(f"Loading model: {MODEL_NAME}")
        logger.info(f"Task: {TASK}")
        logger.info(f"Device: {'CUDA' if DEVICE >= 0 else 'CPU'}")

        # Load pipeline with optimizations
        pipe = pipeline(
            TASK,
            model=MODEL_NAME,
            device=DEVICE,
            torch_dtype=torch.float16 if DEVICE >= 0 else torch.float32,
            model_kwargs={"low_cpu_mem_usage": True}
        )

        logger.info("Pipeline loaded successfully!")

    except Exception as e:
        logger.error(f"Failed to load pipeline: {str(e)}")
        raise


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model": MODEL_NAME,
        "task": TASK,
        "device": "cuda" if DEVICE >= 0 else "cpu",
        "cuda_available": torch.cuda.is_available()
    }


@app.post("/generate")
async def generate_text(request: TextGenerationRequest):
    """Generate text using the model"""

    if pipe is None:
        raise HTTPException(status_code=503, detail="Pipeline not loaded")

    if TASK != "text-generation":
        raise HTTPException(
            status_code=400,
            detail=f"This endpoint requires task='text-generation', got '{TASK}'"
        )

    try:
        results = pipe(
            request.text,
            max_new_tokens=request.max_new_tokens,
            temperature=request.temperature,
            top_p=request.top_p,
            top_k=request.top_k,
            num_return_sequences=request.num_return_sequences,
            do_sample=True,
            pad_token_id=pipe.tokenizer.eos_token_id
        )

        return {
            "results": results,
            "model": MODEL_NAME,
            "device": "cuda" if DEVICE >= 0 else "cpu"
        }

    except Exception as e:
        logger.error(f"Generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embed")
async def get_embeddings(request: EmbeddingRequest):
    """Get text embeddings"""

    if pipe is None:
        raise HTTPException(status_code=503, detail="Pipeline not loaded")

    if TASK != "feature-extraction":
        raise HTTPException(
            status_code=400,
            detail=f"This endpoint requires task='feature-extraction', got '{TASK}'"
        )

    try:
        embeddings = pipe(request.text)

        # Extract mean pooling
        if isinstance(embeddings, list) and len(embeddings) > 0:
            import numpy as np
            embedding_array = np.array(embeddings[0])
            mean_embedding = embedding_array.mean(axis=0)

            # Normalize if requested
            if request.normalize:
                norm = np.linalg.norm(mean_embedding)
                mean_embedding = mean_embedding / norm if norm > 0 else mean_embedding

            return {
                "embedding": mean_embedding.tolist(),
                "dimensions": len(mean_embedding),
                "model": MODEL_NAME
            }
        else:
            raise ValueError("Failed to generate embeddings")

    except Exception as e:
        logger.error(f"Embedding error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/classify")
async def classify_text(request: ClassificationRequest):
    """Classify text"""

    if pipe is None:
        raise HTTPException(status_code=503, detail="Pipeline not loaded")

    if TASK not in ["text-classification", "zero-shot-classification"]:
        raise HTTPException(
            status_code=400,
            detail=f"This endpoint requires text classification task, got '{TASK}'"
        )

    try:
        results = pipe(request.text, top_k=request.top_k)

        return {
            "results": results,
            "model": MODEL_NAME
        }

    except Exception as e:
        logger.error(f"Classification error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/model-info")
async def model_info():
    """Get model and pipeline information"""
    if pipe is None:
        raise HTTPException(status_code=503, detail="Pipeline not loaded")

    return {
        "model_name": MODEL_NAME,
        "task": TASK,
        "device": "cuda" if DEVICE >= 0 else "cpu",
        "framework": "pytorch",
        "tokenizer_vocab_size": len(pipe.tokenizer) if hasattr(pipe, 'tokenizer') else None
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
