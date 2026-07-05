"""
Pydantic schemas for asynchronous daily digest generation.
"""

from datetime import date, datetime, timedelta
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.schemas.summarize import TokenUsage


class DigestTopic(BaseModel):
    """Topic subscribed by the user."""

    id: str = Field(..., description="Topic ID supplied by the internal caller")
    name: str = Field(..., min_length=1, max_length=80, description="Topic name")


class DigestGenerateRequest(BaseModel):
    """Request body for POST /api/v1/genai/digests/generate."""

    requestId: str | None = Field(
        default=None,
        max_length=120,
        description="Optional caller correlation ID, not an idempotency key",
    )
    userId: str | None = Field(default=None, description="Optional user receiving the digest")
    digestDate: date = Field(..., description="Calendar date represented by the digest")
    periodStart: datetime = Field(..., description="Inclusive start of the content window")
    periodEnd: datetime = Field(..., description="Exclusive end of the content window")
    timezone: str = Field(..., min_length=1, description="IANA timezone for the digest")
    topics: list[DigestTopic] = Field(..., min_length=1, max_length=50)
    maxSourcesPerTopic: int = Field(5, ge=1, le=20)
    maxEvents: int = Field(8, ge=1, le=20)
    tone: Literal["concise", "technical", "executive"] = "technical"

    @model_validator(mode="after")
    def validate_period(self):
        """Ensure callers provide a positive one-day-or-shorter window."""
        if self.periodEnd <= self.periodStart:
            raise ValueError("periodEnd must be after periodStart")
        if self.periodEnd - self.periodStart > timedelta(hours=24):
            raise ValueError("periodEnd must be no more than 24 hours after periodStart")
        return self


class DigestSource(BaseModel):
    """A single external source cited by a digest event."""

    url: str
    sourceName: str | None = Field(default=None, description="Human-readable source/domain name")
    provider: str | None = Field(default=None, description="Upstream provider (github, gnews, huggingface)")
    publishedAt: datetime | None = Field(default=None, description="Absolute publish time; the client computes the relative label")
    title: str | None = Field(default=None, description="Source article/item title")


class DigestEvent(BaseModel):
    """One digest-worthy development synthesized from one or more sources."""

    headline: str
    summaryBullets: list[str] = Field(..., min_length=1, max_length=3)
    topicIds: list[str]
    sources: list[DigestSource]


class DigestGenerateResponse(BaseModel):
    """Generated digest payload stored on a succeeded job."""

    digestDate: date
    periodStart: datetime
    periodEnd: datetime
    title: str
    topStorySubtitle: str
    summary: str
    topics: list[DigestTopic]
    events: list[DigestEvent]
    eventCount: int
    sourceCount: int
    readTimeMinutes: int
    generatedAt: datetime
    model: str
    usage: TokenUsage | None = None


DigestJobStatusValue = Literal["QUEUED", "RUNNING", "SUCCEEDED", "FAILED"]
DigestWarningProvider = Literal["github", "gnews", "huggingface", "all"]
DigestWarningCode = Literal["missing_credentials", "provider_error", "no_sources_for_topic"]
DigestErrorCode = Literal[
    "no_sources_found",
    "llm_error",
    "llm_parse_error",
    "job_not_found",
    "unexpected_error",
]


class DigestJobWarning(BaseModel):
    """Non-fatal provider or topic issue encountered during generation."""

    provider: DigestWarningProvider
    code: DigestWarningCode
    message: str
    topicId: str | None = None


class DigestJobError(BaseModel):
    """Fatal job error."""

    code: DigestErrorCode
    message: str
    details: str | None = None


class DigestJobAccepted(BaseModel):
    """Response returned when a digest job is accepted."""

    jobId: str
    status: DigestJobStatusValue
    statusUrl: str
    submittedAt: datetime
    requestId: str | None = None
    userId: str | None = None


class DigestJobStatus(BaseModel):
    """Current digest job state."""

    jobId: str
    status: DigestJobStatusValue
    submittedAt: datetime
    warnings: list[DigestJobWarning] = Field(default_factory=list)
    requestId: str | None = None
    userId: str | None = None
    startedAt: datetime | None = None
    completedAt: datetime | None = None
    result: DigestGenerateResponse | None = None
    error: DigestJobError | None = None
