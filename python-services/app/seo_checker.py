# python-services/app/seo_checker.py
import re
import os
from typing import List, Dict, Any, Optional
from collections import Counter
import openai
import json

class SEOChecker:
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4")
        
        if self.openai_api_key:
            openai.api_key = self.openai_api_key
    
    def is_available(self) -> bool:
        """Check if SEO checker is available."""
        return True  # Always available for basic checks
    
    async def analyze(
        self,
        content: str,
        title: str,
        keywords: List[str] = []
    ) -> Dict[str, Any]:
        """Analyze content for SEO optimization."""
        # Basic SEO checks
        word_count = len(content.split())
        
        # Count headings
        h1_count = len(re.findall(r'<h1[^>]*>', content))
        h2_count = len(re.findall(r'<h2[^>]*>', content))
        h3_count = len(re.findall(r'<h3[^>]*>', content))
        
        # Count images
        images_total = len(re.findall(r'<img[^>]*>', content))
        images_with_alt = len(re.findall(r'<img[^>]*alt="[^"]*"[^>]*>', content))
        
        # Count links
        internal_links = len(re.findall(r'<a[^>]*href="(/[^"]*)"[^>]*>', content))
        external_links = len(re.findall(r'<a[^>]*href="(https?://[^"]*)"[^>]*>', content))
        
        # Keyword density
        keyword_density = {}
        for keyword in keywords:
            if keyword:
                count = len(re.findall(r'\b' + re.escape(keyword.lower()) + r'\b', content.lower()))
                density = (count / max(1, word_count)) * 100
                keyword_density[keyword] = round(density, 2)
        
        # Readability (simple calculation)
        sentences = len(re.findall(r'[.!?]+', content))
        readability_score = min(100, max(0, 100 - (word_count / max(1, sentences) - 20) * 2))
        
        # Generate suggestions
        suggestions = []
        
        if word_count < 300:
            suggestions.append("Consider increasing content length to at least 300 words")
        elif word_count < 600:
            suggestions.append("Content length is good, but could be expanded for better depth")
        
        if h1_count == 0:
            suggestions.append("Add an H1 heading to your content")
        elif h1_count > 1:
            suggestions.append("Use only one H1 heading per page")
        
        if h2_count < 2:
            suggestions.append("Add more H2 subheadings to structure your content")
        
        if images_total > 0 and images_with_alt < images_total:
            suggestions.append(f"Add alt text to {images_total - images_with_alt} image(s)")
        
        if keywords and not any(k in content.lower() for k in keywords):
            suggestions.append("Include your target keywords in the content")
        
        if len(title) < 30:
            suggestions.append("SEO title is too short. Aim for 30-60 characters")
        elif len(title) > 60:
            suggestions.append("SEO title is too long. Aim for 30-60 characters")
        
        # Get AI suggestions if available
        ai_suggestions = []
        if self.openai_api_key:
            try:
                ai_suggestions = await self._get_ai_suggestions(content, title, keywords)
            except Exception:
                pass
        
        # Combine suggestions
        all_suggestions = suggestions + ai_suggestions
        
        # Calculate score
        score = 100
        deduction_per_suggestion = 5
        score = max(0, score - len(all_suggestions) * deduction_per_suggestion)
        score = min(100, score + (images_with_alt / max(1, images_total) * 10))
        score = min(100, score + (min(h2_count, 5) / 5 * 10))
        score = min(100, score + (min(word_count / 100, 5) / 5 * 10))
        score = round(min(100, score))
        
        return {
            "score": score,
            "suggestions": all_suggestions[:10],
            "readability": {
                "score": round(readability_score),
                "level": self._get_readability_level(readability_score)
            },
            "keyword_density": keyword_density,
            "title_tag": title,
            "meta_description": content[:160] if content else "",
            "headings": {
                "h1": h1_count,
                "h2": h2_count,
                "h3": h3_count
            },
            "images": {
                "total": images_total,
                "with_alt": images_with_alt
            },
            "links": {
                "internal": internal_links,
                "external": external_links
            },
            "word_count": word_count,
            "reading_time": max(1, round(word_count / 200))
        }
    
    async def suggest(self, content: str, title: str) -> Dict[str, Any]:
        """Generate SEO suggestions for content."""
        if not self.openai_api_key:
            return {
                "title_suggestions": [],
                "meta_description_suggestions": [],
                "content_suggestions": [],
                "keyword_suggestions": []
            }
        
        prompt = f"""Analyze this content and provide SEO optimization suggestions.
        
        Title: {title}
        Content: {content[:1000]}...
        
        Provide:
        1. Title suggestions (5 alternatives)
        2. Meta description suggestions (3 alternatives)
        3. Content improvement suggestions (5 specific recommendations)
        4. Keyword suggestions (10 relevant keywords)
        
        Return as JSON.
        """
        
        try:
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an SEO expert."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            
            return {
                "title_suggestions": result.get("title_suggestions", []),
                "meta_description_suggestions": result.get("meta_description_suggestions", []),
                "content_suggestions": result.get("content_suggestions", []),
                "keyword_suggestions": result.get("keyword_suggestions", [])
            }
        except Exception:
            return {
                "title_suggestions": [],
                "meta_description_suggestions": [],
                "content_suggestions": [],
                "keyword_suggestions": []
            }
    
    async def _get_ai_suggestions(self, content: str, title: str, keywords: List[str]) -> List[str]:
        """Get AI-powered SEO suggestions."""
        if not self.openai_api_key:
            return []
        
        prompt = f"""Provide 5 specific SEO improvement suggestions for this content.
        
        Title: {title}
        Keywords: {', '.join(keywords) if keywords else 'No specific keywords'}
        Content excerpt: {content[:500]}...
        
        Focus on:
        - Title optimization
        - Meta description
        - Content structure
        - Keyword usage
        - Readability
        
        Return as a JSON array of strings.
        """
        
        try:
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an SEO expert."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return result.get("suggestions", [])
        except Exception:
            return []
    
    def _get_readability_level(self, score: float) -> str:
        """Get readability level based on score."""
        if score >= 80:
            return "Excellent"
        elif score >= 60:
            return "Good"
        elif score >= 40:
            return "Fair"
        else:
            return "Needs Improvement"