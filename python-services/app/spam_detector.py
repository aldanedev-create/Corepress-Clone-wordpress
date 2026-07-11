# python-services/app/image_optimizer.py
import io
import os
from PIL import Image, ImageEnhance, ImageFilter
from typing import Optional, Dict, Any, Tuple
import cv2
import numpy as np

class ImageOptimizer:
    def __init__(self):
        self.supported_formats = ['JPEG', 'PNG', 'WEBP', 'AVIF']
        self.max_image_size = 50 * 1024 * 1024  # 50MB
    
    def is_available(self) -> bool:
        """Check if image optimizer is available."""
        return True
    
    async def optimize(
        self,
        image_data: bytes,
        width: Optional[int] = None,
        height: Optional[int] = None,
        quality: int = 80,
        format: str = "webp"
    ) -> Dict[str, Any]:
        """Optimize an image."""
        try:
            # Open image
            img = Image.open(io.BytesIO(image_data))
            original_format = img.format
            
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Resize if dimensions provided
            if width or height:
                original_width, original_height = img.size
                
                if width and not height:
                    ratio = width / original_width
                    height = int(original_height * ratio)
                elif height and not width:
                    ratio = height / original_height
                    width = int(original_width * ratio)
                elif width and height:
                    # Maintain aspect ratio
                    ratio = min(width / original_width, height / original_height)
                    width = int(original_width * ratio)
                    height = int(original_height * ratio)
                
                img = img.resize((width, height), Image.Resampling.LANCZOS)
            
            # Save to buffer with optimization
            buffer = io.BytesIO()
            save_format = format.upper()
            
            if save_format == 'JPEG':
                img.save(buffer, format=save_format, quality=quality, optimize=True)
            elif save_format == 'WEBP':
                img.save(buffer, format=save_format, quality=quality, method=6)
            elif save_format == 'AVIF':
                # AVIF support requires Pillow with AVIF support
                img.save(buffer, format=save_format, quality=quality)
            else:
                img.save(buffer, format=save_format, optimize=True)
            
            optimized_data = buffer.getvalue()
            
            return {
                "data": optimized_data,
                "width": img.width,
                "height": img.height,
                "format": save_format.lower(),
                "size": len(optimized_data),
                "mime_type": f"image/{save_format.lower()}"
            }
        except Exception as e:
            raise Exception(f"Image optimization failed: {str(e)}")
    
    async def resize(
        self,
        image_data: bytes,
        width: int,
        height: int,
        fit: str = "cover"
    ) -> Dict[str, Any]:
        """Resize an image."""
        try:
            img = Image.open(io.BytesIO(image_data))
            original_format = img.format
            
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            original_width, original_height = img.size
            
            if fit == "cover":
                # Crop to cover aspect ratio
                ratio = max(width / original_width, height / original_height)
                new_width = int(original_width * ratio)
                new_height = int(original_height * ratio)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # Crop center
                left = (new_width - width) // 2
                top = (new_height - height) // 2
                right = left + width
                bottom = top + height
                img = img.crop((left, top, right, bottom))
            
            elif fit == "contain":
                # Fit within dimensions
                img.thumbnail((width, height), Image.Resampling.LANCZOS)
            
            else:
                # Stretch to fit
                img = img.resize((width, height), Image.Resampling.LANCZOS)
            
            # Save to buffer
            buffer = io.BytesIO()
            img.save(buffer, format=original_format, optimize=True)
            resized_data = buffer.getvalue()
            
            return {
                "data": resized_data,
                "width": img.width,
                "height": img.height,
                "format": original_format.lower(),
                "size": len(resized_data),
                "mime_type": f"image/{original_format.lower()}"
            }
        except Exception as e:
            raise Exception(f"Image resize failed: {str(e)}")
    
    async def compress(
        self,
        image_data: bytes,
        quality: int = 70
    ) -> bytes:
        """Compress an image."""
        try:
            img = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=quality, optimize=True)
            
            return buffer.getvalue()
        except Exception as e:
            raise Exception(f"Image compression failed: {str(e)}")
    
    async def convert_format(
        self,
        image_data: bytes,
        target_format: str = "webp"
    ) -> Dict[str, Any]:
        """Convert image to different format."""
        try:
            img = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            buffer = io.BytesIO()
            img.save(buffer, format=target_format.upper(), optimize=True)
            converted_data = buffer.getvalue()
            
            return {
                "data": converted_data,
                "width": img.width,
                "height": img.height,
                "format": target_format.lower(),
                "size": len(converted_data),
                "mime_type": f"image/{target_format.lower()}"
            }
        except Exception as e:
            raise Exception(f"Image conversion failed: {str(e)}")