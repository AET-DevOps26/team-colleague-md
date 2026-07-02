"""
Daily digest router.
"""

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.schemas.digest import DigestGenerateRequest, DigestJobAccepted, DigestJobStatus
from app.security import require_internal_service
from app.services.digest_jobs import create_job, get_job
from app.services.digest_runner import run_digest_job

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/genai",
    tags=["Digests"],
    dependencies=[Depends(require_internal_service)],
)


@router.post(
    "/digests/generate",
    response_model=DigestJobAccepted,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Start daily digest generation",
)
async def create_daily_digest_job(
    request: DigestGenerateRequest,
    background_tasks: BackgroundTasks,
) -> DigestJobAccepted:
    """Create an asynchronous digest job and return its polling URL."""
    accepted = create_job(request)
    logger.info(
        "Daily digest job accepted jobId=%s requestId=%s userId=%s topicCount=%d periodStart=%s periodEnd=%s maxSourcesPerTopic=%d maxEvents=%d",
        accepted.jobId,
        request.requestId,
        request.userId,
        len(request.topics),
        request.periodStart.isoformat(),
        request.periodEnd.isoformat(),
        request.maxSourcesPerTopic,
        request.maxEvents,
    )
    background_tasks.add_task(run_digest_job, accepted.jobId)
    return accepted


@router.get(
    "/digests/jobs/{jobId}",
    response_model=DigestJobStatus,
    summary="Get daily digest job status",
)
async def get_daily_digest_job(jobId: str) -> DigestJobStatus:
    """Return current digest job status, result, warnings, or error."""
    job = get_job(jobId)
    if job is None:
        logger.warning("Daily digest job lookup failed jobId=%s error=job_not_found", jobId)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "job_not_found",
                "message": "Digest job was not found.",
            },
        )
    logger.info(
        "Daily digest job status requested jobId=%s status=%s warningCount=%d hasResult=%s hasError=%s",
        jobId,
        job.status,
        len(job.warnings),
        job.result is not None,
        job.error is not None,
    )
    return job
