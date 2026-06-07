"""
In-memory job store for asynchronous digest generation.

This is intentionally simple for the MVP. Jobs are lost on process restart and
are not shared across service instances.
"""

from datetime import datetime, timezone
from threading import RLock
from uuid import uuid4

from app.schemas.digest import (
    DigestGenerateRequest,
    DigestGenerateResponse,
    DigestJobAccepted,
    DigestJobError,
    DigestJobStatus,
    DigestJobWarning,
)

_jobs: dict[str, DigestJobStatus] = {}
_requests: dict[str, DigestGenerateRequest] = {}
_lock = RLock()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_job(request: DigestGenerateRequest) -> DigestJobAccepted:
    """Create and store a queued digest job."""
    job_id = str(uuid4())
    submitted_at = _now()
    job = DigestJobStatus(
        jobId=job_id,
        status="QUEUED",
        requestId=request.requestId,
        userId=request.userId,
        submittedAt=submitted_at,
    )
    with _lock:
        _jobs[job_id] = job
        _requests[job_id] = request

    return DigestJobAccepted(
        jobId=job_id,
        status="QUEUED",
        statusUrl=f"/api/v1/genai/digests/jobs/{job_id}",
        requestId=request.requestId,
        userId=request.userId,
        submittedAt=submitted_at,
    )


def get_job(job_id: str) -> DigestJobStatus | None:
    """Return the current job state, if it exists."""
    with _lock:
        return _jobs.get(job_id)


def get_request(job_id: str) -> DigestGenerateRequest | None:
    """Return the original job request, if it exists."""
    with _lock:
        return _requests.get(job_id)


def mark_running(job_id: str) -> None:
    with _lock:
        job = _jobs[job_id]
        job.status = "RUNNING"
        job.startedAt = _now()


def complete_job(
    job_id: str,
    result: DigestGenerateResponse,
    warnings: list[DigestJobWarning],
) -> None:
    with _lock:
        job = _jobs[job_id]
        job.status = "SUCCEEDED"
        job.completedAt = _now()
        job.result = result
        job.error = None
        job.warnings = warnings


def fail_job(
    job_id: str,
    error: DigestJobError,
    warnings: list[DigestJobWarning] | None = None,
) -> None:
    with _lock:
        job = _jobs[job_id]
        job.status = "FAILED"
        job.completedAt = _now()
        job.result = None
        job.error = error
        if warnings is not None:
            job.warnings = warnings


def clear_jobs() -> None:
    """Clear all in-memory jobs. Intended for tests."""
    with _lock:
        _jobs.clear()
        _requests.clear()
