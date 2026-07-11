# python-services/app/ai_writer.py
import os
import openai
from typing import List, Dict, Any, Optional
import json

class AIWriter:
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4")
        
        if self.openai_api_key:
            openai.api_key = self.openai_api_key
    
    def is_available(self) -> bool:
        """Check if AI writer is available."""
        return bool(self.openai_api_key)
    
    async def generate_post(
        self,
        topic: str,
        keywords: List[str] = [],
        tone: str = "neutral",
        length: str = "medium"
    ) -> Dict[str, Any]:
        """Generate a blog post using AI."""
        if not self.is_available():
            raise Exception("OpenAI API key not configured")
        
        # Build prompt
        length_map = {
            "short": "around 300 words",
            "medium": "around 600 words",
            "long": "around 1000 words"
        }
        
        tone_map = {
            "neutral": "neutral and informative",
            "professional": "professional and authoritative",
            "casual": "casual and conversational",
            "enthusiastic": "enthusiastic and engaging"
        }
        
        prompt = f"""Write a blog post about "{topic}".
        
        Requirements:
        - Length: {length_map.get(length, 'around 600 words')}
        - Tone: {tone_map.get(tone, 'neutral and informative')}
        - Include these keywords naturally: {', '.join(keywords) if keywords else 'No specific keywords required'}
        - Structure: Include an engaging title, introduction, body with headings, and conclusion
        - Format: Return as JSON with title, content (HTML), excerpt, and tags
        
        The content should be well-researched, engaging, and provide value to readers.
        Use proper HTML formatting for the content (h2, h3, p, ul, ol tags).
        """
        
        try:
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert blog writer and content creator."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Ensure required fields
            return {
                "title": result.get("title", topic),
                "content": result.get("content", ""),
                "excerpt": result.get("excerpt", ""),
                "tags": result.get("tags", keywords),
                "word_count": len(result.get("content", "").split())
            }
        except Exception as e:
            raise Exception(f"Failed to generate post: {str(e)}")
    
    async def generate_titles(self, topic: str, options: int = 5) -> List[str]:
        """Generate title suggestions."""
        if not self.is_available():
            raise Exception("OpenAI API key not configured")
        
        prompt = f"""Generate {options} creative and SEO-friendly blog post titles about "{topic}".
        
        Each title should:
        - Be attention-grabbing and compelling
        - Include relevant keywords
        - Be between 50-60 characters if possible
        - Appeal to the target audience
        
        Return as a JSON array of titles.
        """
        
        try:
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert headline writer and content strategist."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.9,
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return result.get("titles", [])
        except Exception as e:
            raise Exception(f"Failed to generate titles: {str(e)}")
    
    async def rewrite(self, content: str, style: str = "professional") -> str:
        """Rewrite content in a different style."""
        if not self.is_available():
            raise Exception("OpenAI API key not configured")
        
        style_map = {
            "professional": "professional, formal, and authoritative",
            "casual": "casual, conversational, and friendly",
            "engaging": "engaging, persuasive, and compelling",
            "concise": "concise, clear, and to the point",
            "expanded": "detailed, comprehensive, and explanatory"
        }
        
        prompt = f"""Rewrite the following content in a {style_map.get(style, 'professional')} style.
        
        Content:
        {content}
        
        Maintain the same key information and structure, but improve:
        - Clarity and readability
        - Flow and transitions
        - Vocabulary and expression
        - Engagement and impact
        
        Return only the rewritten content.
        """
        
        try:
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert content editor and writer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.6,
                max_tokens=2500
            )
            
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"Failed to rewrite content: {str(e)}")