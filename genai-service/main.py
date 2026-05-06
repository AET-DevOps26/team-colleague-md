from fastapi import FastAPI

app = FastAPI(title="GenAI Service", version="1.0.0")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "GenAI Service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
