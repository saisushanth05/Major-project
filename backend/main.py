import os
import io
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response, FileResponse
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

from backend.stats_engine import (
    parse_csv_data,
    get_dataset_summary,
    perform_statistical_analysis,
    REQUIRED_FEATURES,
    TARGET_COLUMN
)
from backend.quantum_engine import quantum_pipeline

app = FastAPI(
    title="Quantum Hospitality Analytics & Machine Learning Platform",
    description="Publication-grade platform comparing Classical Econometric Modeling with Quantum Kernel SVM.",
    version="2.0.0"
)

# Enable CORS for maximum client compatibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-Memory State Storage (Strictly NO DATABASE)
class AppState:
    def __init__(self):
        self.active_df: Optional[pd.DataFrame] = None
        self.dataset_name: str = "No dataset loaded"
        self.stats_results: Optional[Dict[str, Any]] = None
        self.quantum_results: Optional[Dict[str, Any]] = None

state = AppState()


# Pydantic Schemas
class QuantumRunRequest(BaseModel):
    sample_size: int = Field(default=100, ge=20, le=200, description="Sample size for balanced quantum matrix computation")
    k_folds: int = Field(default=10, ge=3, le=10, description="Number of folds for cross validation")

class PredictRequest(BaseModel):
    CLEANLINESS: float = Field(..., ge=1.0, le=5.0)
    LOCATION: float = Field(..., ge=1.0, le=5.0)
    VALUE: float = Field(..., ge=1.0, le=5.0)
    ROOMS: float = Field(..., ge=1.0, le=5.0)
    SERVICE: float = Field(..., ge=1.0, le=5.0)
    SLEEP_QUALITY: float = Field(..., ge=1.0, le=5.0)


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "dataset_loaded": state.active_df is not None,
        "active_dataset": state.dataset_name,
        "rows": len(state.active_df) if state.active_df is not None else 0,
        "quantum_model_ready": quantum_pipeline.is_trained
    }


@app.post("/api/dataset/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """
    Manually uploads and parses a CSV dataset directly into memory.
    Validates column integrity and returns dataset statistics.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a standard CSV file (.csv).")
        
    try:
        content = await file.read()
        df = parse_csv_data(content, filename=file.filename)
        
        # Save to active in-memory state
        state.active_df = df
        state.dataset_name = file.filename
        state.stats_results = None
        state.quantum_results = None
        
        summary = get_dataset_summary(df)
        summary['filename'] = file.filename
        return {
            "message": f"Successfully loaded dataset '{file.filename}' with {len(df)} validated rows.",
            "data": summary
        }
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@app.post("/api/dataset/load-demo")
async def load_demo_dataset():
    """
    Loads the benchmark hotel customer satisfaction dataset in-memory.
    """
    sample_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sample_dataset.csv")
    if not os.path.exists(sample_path):
        raise HTTPException(status_code=404, detail="Demo dataset file not found.")
        
    try:
        with open(sample_path, "rb") as f:
            content = f.read()
            
        df = parse_csv_data(content, filename="sample_dataset.csv")
        state.active_df = df
        state.dataset_name = "Benchmark Hotel Review Dataset (sample_dataset.csv)"
        state.stats_results = None
        state.quantum_results = None
        
        summary = get_dataset_summary(df)
        summary['filename'] = "sample_dataset.csv"
        return {
            "message": "Benchmark dataset successfully loaded into memory.",
            "data": summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load demo dataset: {str(e)}")


@app.get("/api/dataset/template")
async def download_template():
    """
    Returns a downloadable CSV template with standard column headers.
    """
    csv_content = (
        "CLEANLINESS,LOCATION,VALUE,ROOMS,SERVICE,SLEEP_QUALITY,USER_OVERALL_RATING\n"
        "5,4,4,5,5,4,5\n"
        "3,4,2,3,3,3,3\n"
        "4,5,3,4,4,4,4\n"
        "2,2,1,2,2,2,2\n"
        "5,5,5,5,5,5,5\n"
    )
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=hotel_review_template.csv"}
    )


@app.get("/api/dataset/summary")
async def get_summary():
    """
    Retrieves the summary of the currently loaded in-memory dataset.
    """
    if state.active_df is None:
        raise HTTPException(status_code=400, detail="No dataset loaded in memory. Please upload a dataset first.")
    summary = get_dataset_summary(state.active_df)
    summary['filename'] = state.dataset_name
    return summary


@app.post("/api/analyze/statistical")
async def run_statistical_analysis():
    """
    Executes Pearson Correlation & OLS Multiple Linear Regression.
    """
    if state.active_df is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Please upload a dataset first.")
        
    try:
        results = perform_statistical_analysis(state.active_df)
        state.stats_results = results
        return {
            "status": "success",
            "dataset_name": state.dataset_name,
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Statistical analysis failed: {str(e)}")


@app.post("/api/analyze/quantum")
async def run_quantum_analysis(req: QuantumRunRequest = Body(...)):
    """
    Executes PennyLane quantum circuit Gram matrix calculation,
    10-fold cross-validation benchmarking, and paired Student's t-test.
    """
    if state.active_df is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Please upload a dataset first.")
        
    try:
        results = quantum_pipeline.run_benchmark(
            state.active_df,
            sample_size=req.sample_size,
            k_folds=req.k_folds
        )
        state.quantum_results = results
        return {
            "status": "success",
            "dataset_name": state.dataset_name,
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quantum pipeline execution failed: {str(e)}")


@app.post("/api/predict")
async def live_prediction(req: PredictRequest):
    """
    Provides real-time What-If inference for a given customer review profile
    across both the trained Classical SVM and Quantum Kernel SVM.
    """
    if not quantum_pipeline.is_trained:
        raise HTTPException(
            status_code=400,
            detail="Quantum model is not trained yet. Please run the Quantum ML Lab benchmark first."
        )
        
    try:
        features_dict = {
            'CLEANLINESS': req.CLEANLINESS,
            'LOCATION': req.LOCATION,
            'VALUE': req.VALUE,
            'ROOMS': req.ROOMS,
            'SERVICE': req.SERVICE,
            'SLEEP_QUALITY': req.SLEEP_QUALITY
        }
        res = quantum_pipeline.predict_single_instance(features_dict)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


# Serve static frontend files if frontend directory exists
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
