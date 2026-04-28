from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
from pathlib import Path
from label_engine import LabelRecommendationEngine, EngineConfig

app = FastAPI(title="Label Recommendation API", version="1.0.0")

# Enable CORS so the webapp (likely running on a different port) can call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with explicit origins in production, e.g., ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = Path(__file__).parent / "taxonomy_enriched.jsonl"
config = EngineConfig(csv_path=str(DATA_PATH), debug_mode=True)
engine = LabelRecommendationEngine(config)


class RecommendationRequest(BaseModel):
    input_text: str
    category: str
    language: Optional[str] = None
    allow_generation: bool = True


@app.get("/")
def root():
    return {"message": "Label Recommendation Engine API", "version": "1.0.0"}


@app.post("/recommend")
def recommend(request: RecommendationRequest):
    try:
        return engine.recommend(
            input_text=request.input_text,
            category=request.category,
            language=request.language,
            allow_generation=request.allow_generation
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/jsonl/contents")
def get_jsonl():
    try:
        path = Path(config.csv_path)
        if not path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {config.csv_path}")

        with open(path, 'r', encoding='utf-8') as f:
            records = [json.loads(line) for line in f]

        return {"file": str(path), "total_records": len(records), "records": records}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/categories")
def get_categories():
    try:
        categories = engine.available_categories()
        return {"total": len(categories), "categories": categories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
