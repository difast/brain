"""S3-compatible object storage for robot camera frames.

Frames sent to the brain are persisted so decisions can be replayed/audited
and shown in the dashboard. Works against MinIO locally and any S3-compatible
store (AWS S3, R2, etc.) in production.
"""

from __future__ import annotations

import datetime as dt
import uuid

import aioboto3

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("storage")


class FrameStorage:
    def __init__(self) -> None:
        self._session = aioboto3.Session()
        self._bucket = settings.s3_bucket

    def _client(self):
        return self._session.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            region_name=settings.s3_region,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
        )

    async def ensure_bucket(self) -> None:
        """Create the bucket if it doesn't exist (idempotent, dev convenience)."""
        async with self._client() as s3:
            try:
                await s3.head_bucket(Bucket=self._bucket)
            except Exception:  # noqa: BLE001
                try:
                    await s3.create_bucket(Bucket=self._bucket)
                    logger.info("bucket_created", bucket=self._bucket)
                except Exception as exc:  # noqa: BLE001
                    logger.warning(
                        "bucket_create_failed", bucket=self._bucket, error=str(exc)
                    )

    async def upload_frame(
        self, robot_id: str, data: bytes, content_type: str = "image/jpeg"
    ) -> str:
        """Upload a frame and return its object key/URL."""
        ts = dt.datetime.now(dt.UTC).strftime("%Y/%m/%d")
        ext = "jpg" if "jpeg" in content_type else content_type.split("/")[-1]
        key = f"frames/{robot_id}/{ts}/{uuid.uuid4().hex}.{ext}"
        async with self._client() as s3:
            await s3.put_object(
                Bucket=self._bucket,
                Key=key,
                Body=data,
                ContentType=content_type,
            )
        if settings.s3_public_url:
            return f"{settings.s3_public_url.rstrip('/')}/{key}"
        return key

    async def presign(self, key: str, expires: int = 3600) -> str:
        async with self._client() as s3:
            return await s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": self._bucket, "Key": key},
                ExpiresIn=expires,
            )
