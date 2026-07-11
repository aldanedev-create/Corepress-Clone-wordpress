# python-services/app/main.py
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Optional, List, Dict, Any
import uvicorn
import os
from dotenv import load_dotenv

# Import service modules
from .ai_writer import AIWriter
from .seo_checker import SEOChecker
from .image_optimizer import ImageOptimizer
from .spam_detector import SpamDetector

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="CorePress Python Services",
    description="AI-powered services for CorePress CMS",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5000",
        "http://localhost:5173",
        os.getenv("FRONTEND_URL", "*"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
ai_writer = AIWriter()
seo_checker = SEOChecker()
image_optimizer = ImageOptimizer()
spam_detector = SpamDetector()

# Health check endpoint
@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint for service monitoring."""
    return {
        "status": "healthy",
        "service": "CorePress Python Services",
        "version": "1.0.0",
        "ai_writer": ai_writer.is_available(),
        "seo_checker": seo_checker.is_available(),
        "image_optimizer": image_optimizer.is_available(),
        "spam_detector": spam_detector.is_available(),
    }

# AI Writer endpoints
@app.post("/ai/generate-post")
async def generate_post(
    topic: str = Form(...),
    keywords: Optional[str] = Form(None),
    tone: Optional[str] = Form("neutral"),
    length: Optional[str] = Form("medium"),
) -> Dict[str, Any]:
    """Generate a blog post using AI."""
    try:
        if not ai_writer.is_available():
            raise HTTPException(
                status_code=503,
                detail="AI writer service is not available"
            )
        
        keywords_list = keywords.split(",") if keywords else []
        result = await ai_writer.generate_post(
            topic=topic,
            keywords=keywords_list,
            tone=tone,
            length=length
        )
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/generate-title")
async def generate_title(
    topic: str = Form(...),
    options: Optional[int] = Form(5),
) -> Dict[str, Any]:
    """Generate title suggestions using AI."""
    try:
        if not ai_writer.is_available():
            raise HTTPException(
                status_code=503,
                detail="AI writer service is not available"
            )
        
        titles = await ai_writer.generate_titles(topic, options)
        
        return {
            "success": True,
            "data": titles
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/rewrite")
async def rewrite_content(
    content: str = Form(...),
    style: Optional[str] = Form("professional"),
) -> Dict[str, Any]:
    """Rewrite content using AI."""
    try:
        if not ai_writer.is_available():
            raise HTTPException(
                status_code=503,
                detail="AI writer service is not available"
            )
        
        rewritten = await ai_writer.rewrite(content, style)
        
        return {
            "success": True,
            "data": {
                "original": content,
                "rewritten": rewritten
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# SEO Checker endpoints
@app.post("/seo/analyze")
async def analyze_seo(
    content: str = Form(...),
    title: str = Form(...),
    keywords: Optional[str] = Form(None),
) -> Dict[str, Any]:
    """Analyze content for SEO optimization."""
    try:
        if not seo_checker.is_available():
            raise HTTPException(
                status_code=503,
                detail="SEO checker service is not available"
            )
        
        keywords_list = keywords.split(",") if keywords else []
        result = await seo_checker.analyze(
            content=content,
            title=title,
            keywords=keywords_list
        )
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/seo/suggest")
async def suggest_seo(
    content: str = Form(...),
    title: str = Form(...),
) -> Dict[str, Any]:
    """Generate SEO suggestions for content."""
    try:
        if not seo_checker.is_available():
            raise HTTPException(
                status_code=503,
                detail="SEO checker service is not available"
            )
        
        suggestions = await seo_checker.suggest(content, title)
        
        return {
            "success": True,
            "data": suggestions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Image Optimizer endpoints
@app.post("/image/optimize")
async def optimize_image(
    file: UploadFile = File(...),
    width: Optional[int] = Form(None),
    height: Optional[int] = Form(None),
    quality: Optional[int] = Form(80),
    format: Optional[str] = Form("webp"),
) -> StreamingResponse:
    """Optimize an image."""
    try:
        if not image_optimizer.is_available():
            raise HTTPException(
                status_code=503,
                detail="Image optimizer service is not available"
            )
        
        # Read file
        image_data = await file.read()
        
        # Optimize
        result = await image_optimizer.optimize(
            image_data=image_data,
            width=width,
            height=height,
            quality=quality,
            format=format
        )
        
        # Return optimized image
        return StreamingResponse(
            iter([result["data"]]),
            media_type=result["mime_type"],
            headers={
                "X-Image-Width": str(result["width"]),
                "X-Image-Height": str(result["height"]),
                "X-Image-Format": result["format"],
                "X-Image-Size": str(result["size"]),
                "Content-Disposition": f"inline; filename=optimized.{result['format']}",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/image/resize")
async def resize_image(
    file: UploadFile = File(...),
    width: int = Form(...),
    height: int = Form(...),
    fit: Optional[str] = Form("cover"),
) -> StreamingResponse:
    """Resize an image."""
    try:
        if not image_optimizer.is_available():
            raise HTTPException(
                status_code=503,
                detail="Image optimizer service is not available"
            )
        
        image_data = await file.read()
        result = await image_optimizer.resize(
            image_data=image_data,
            width=width,
            height=height,
            fit=fit
        )
        
        return StreamingResponse(
            iter([result["data"]]),
            media_type=result["mime_type"],
            headers={
                "X-Image-Width": str(result["width"]),
                "X-Image-Height": str(result["height"]),
                "Content-Disposition": f"inline; filename=resized.{result['format']}",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Spam Detector endpoints
@app.post("/spam/check")
async def check_spam(
    content: str = Form(...),
    email: Optional[str] = Form(None),
    ip: Optional[str] = Form(None),
) -> Dict[str, Any]:
    """Check content for spam."""
    try:
        if not spam_detector.is_available():
            raise HTTPException(
                status_code=503,
                detail="Spam detector service is not available"
            )
        
        result = await spam_detector.check(
            content=content,
            email=email,
            ip=ip
        )
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "status_code": exc.status_code
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "An unexpected error occurred",
            "status_code": 500
        }
    )

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=os.getenv("ENV", "development") == "development",
    )