"""
Background job runner for daily digest generation.
"""

from collections import Counter
import logging

from app.schemas.digest import DigestJobError
from app.services.digest_generator import DigestJsonParseError, generate_digest
from app.services.digest_jobs import complete_job, fail_job, get_request, mark_running
from app.services.external_sources import fetch_and_select_sources

logger = logging.getLogger(__name__)


async def run_digest_job(job_id: str) -> None:
    """Execute one digest generation job and store its final state."""
    request = get_request(job_id)
    if request is None:
        logger.warning("Digest job request missing jobId=%s", job_id)
        return

    warnings = []
    try:
        logger.info(
            "Digest job started jobId=%s requestId=%s userId=%s topicCount=%d periodStart=%s periodEnd=%s",
            job_id,
            request.requestId,
            request.userId,
            len(request.topics),
            request.periodStart.isoformat(),
            request.periodEnd.isoformat(),
        )
        mark_running(job_id)
        sources, warnings = await fetch_and_select_sources(request)
        logger.info(
            "Digest job source selection completed jobId=%s sourceCount=%d warningCount=%d providerCounts=%s topicCounts=%s",
            job_id,
            len(sources),
            len(warnings),
            dict(Counter(source.provider for source in sources)),
            dict(Counter(source.topicName for source in sources)),
        )
        if not sources:
            logger.warning(
                "Digest job failed before LLM jobId=%s error=no_sources_found warningCount=%d",
                job_id,
                len(warnings),
            )
            fail_job(
                job_id,
                DigestJobError(
                    code="no_sources_found",
                    message="No external sources were found for any requested topic.",
                ),
                warnings,
            )
            return

        try:
            logger.info("Digest job LLM generation started jobId=%s sourceCount=%d", job_id, len(sources))
            result = await generate_digest(request, sources)
        except DigestJsonParseError:
            raise
        except Exception as exc:
            logger.warning("Digest job LLM provider failed jobId=%s error=%s", job_id, exc)
            fail_job(
                job_id,
                DigestJobError(
                    code="llm_error",
                    message="LLM provider failed during digest generation.",
                    details=str(exc),
                ),
                warnings,
            )
            return

        complete_job(job_id, result, warnings)
        cited_source_count = len(
            {source.url for event in result.events for source in event.sources}
        )
        logger.info(
            "Digest job succeeded jobId=%s eventCount=%d sourceCount=%d citedSourceCount=%d warningCount=%d readTimeMinutes=%d",
            job_id,
            result.eventCount,
            result.sourceCount,
            cited_source_count,
            len(warnings),
            result.readTimeMinutes,
        )
    except DigestJsonParseError as exc:
        logger.warning("Digest LLM parse failed for job %s: %s", job_id, exc)
        fail_job(
            job_id,
            DigestJobError(
                code="llm_parse_error",
                message="LLM returned invalid digest JSON.",
                details=str(exc),
            ),
            warnings,
        )
    except Exception as exc:
        logger.error("Digest generation failed for job %s: %s", job_id, exc, exc_info=True)
        fail_job(
            job_id,
            DigestJobError(
                code="unexpected_error",
                message="Digest generation failed unexpectedly.",
                details=str(exc),
            ),
            warnings,
        )
