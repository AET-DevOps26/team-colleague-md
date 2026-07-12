"""
Pydantic schemas (DTOs) for the summarization endpoint.

Equivalent to Spring Boot record/DTO classes — these define
the shape of request and response JSON bodies with validation.
"""

from pydantic import BaseModel, Field


class TokenUsage(BaseModel):
    """Token usage statistics from the LLM call."""

    input_tokens: int = Field(..., description="Number of tokens in the prompt")
    output_tokens: int = Field(..., description="Number of tokens in the response")
    total_tokens: int = Field(..., description="Total tokens used")


class SummarizeRequest(BaseModel):
    """
    Request body for POST /api/v1/genai/summarize.

    Attributes:
        content: The full post content to summarize. Must be at least 50 characters
                 to ensure there is enough substance to summarize.
        title:   Optional post title, provides additional context to the LLM.
    """

    postId: str = Field(
        ...,
        description="The ID of the post being summarized",
    )
    content: str = Field(
        ...,
        min_length=50,
        max_length=50000,
        description="The full post content to summarize",
    )
    title: str | None = Field(
        None,
        max_length=300,
        description="Optional post title for additional context",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "postId": "123e4567-e89b-12d3-a456-426614174000",
                    "content": (
                        "OpenAI just released GPT-5 with significant improvements in reasoning, "
                        "code generation, and multimodal understanding. The model shows 40% improvement "
                        "on HumanEval benchmarks and introduces a new 'thinking' mode that makes its "
                        "reasoning process transparent. Early benchmarks suggest it outperforms Claude "
                        "and Gemini on most coding tasks, though it struggles with very long context "
                        "windows. Pricing is set at $10/1M input tokens."
                    ),
                    "title": "GPT-5 Released: First Impressions and Benchmarks",
                }
            ]
        }
    }


class SummarizeResponse(BaseModel):
    """
    Response body for POST /api/v1/genai/summarize.

    Returns a 3 to 5 bullet summary of the input post content,
    along with metadata about the LLM call.
    """

    postId: str = Field(
        ...,
        description="The ID of the summarized post",
    )
    summary: list[str] = Field(
        ...,
        description="3 to 5 bullet summary of the post content",
    )
    model: str = Field(
        ...,
        description="LLM model used for generation",
    )
    usage: TokenUsage | None = Field(
        None,
        description="Token usage statistics (may be null if provider doesn't report)",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "postId": "123e4567-e89b-12d3-a456-426614174000",
                    "summary": [
                        "GPT-5 introduces 40% improvement on HumanEval benchmarks with a new transparent 'thinking' mode",
                        "Outperforms Claude and Gemini on most coding tasks but struggles with very long context windows",
                        "Priced at $10/1M input tokens, positioning it as a premium offering in the LLM market",
                    ],
                    "model": "gemini-2.0-flash",
                    "usage": {
                        "input_tokens": 150,
                        "output_tokens": 85,
                        "total_tokens": 235,
                    },
                }
            ]
        }
    }
