#!/usr/bin/env python3
"""A throwaway SMTP server that the end-to-end tests read their mail from.

The dashboard's sign-in, password change and recovery flows all send a code by
email, so a browser test cannot get past them without seeing that mail. This
accepts SMTP on one port, keeps the messages in memory, and serves them as JSON
on another so a test can pull the code out.

Standard library only — CI installs nothing for it.

    python3 e2e/mailsink.py [--smtp-port 1025] [--http-port 8026]

    GET    /messages          every message, newest last
    GET    /messages?to=x     only those addressed to x
    DELETE /messages          forget everything (call between tests)
    GET    /health            readiness probe
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import email
import email.header
import email.policy
import json
import re
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

# Received mail, oldest first. Guarded by _LOCK because the SMTP side runs on
# an asyncio loop in one thread and the HTTP side serves from another.
_MESSAGES: list[dict[str, object]] = []
_LOCK = threading.Lock()

CODE_PATTERN = re.compile(r"\b(\d{4,8})\b")


def _decode(raw: str) -> str:
    """Decode an RFC 2047 header (the subjects are Russian, so encoded)."""
    parts = email.header.decode_header(raw)
    out = []
    for value, charset in parts:
        if isinstance(value, bytes):
            out.append(value.decode(charset or "utf-8", errors="replace"))
        else:
            out.append(value)
    return "".join(out)


def _body(message: email.message.Message) -> str:
    """The plain-text part, falling back to whatever single part exists."""
    if message.is_multipart():
        for part in message.walk():
            if part.get_content_type() == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    return payload.decode(charset, errors="replace")
        return ""
    payload = message.get_payload(decode=True)
    if payload is None:
        return str(message.get_payload())
    charset = message.get_content_charset() or "utf-8"
    return payload.decode(charset, errors="replace")


def _store(recipients: list[str], raw: bytes) -> None:
    message = email.message_from_bytes(raw, policy=email.policy.default)
    subject = _decode(message.get("Subject", ""))
    text = _body(message)

    # The codes are the only thing tests actually want, so pull them out here
    # rather than making every test re-parse the body.
    codes = CODE_PATTERN.findall(text)

    with _LOCK:
        for recipient in recipients:
            _MESSAGES.append(
                {
                    "to": recipient,
                    "subject": subject,
                    "text": text,
                    "codes": codes,
                    "code": codes[0] if codes else None,
                }
            )


# ----------------------------------------------------------------- SMTP ----


class SmtpSession:
    """One client connection. Enough of RFC 5321 for aiosmtplib to be happy."""

    def __init__(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        self.reader = reader
        self.writer = writer
        self.recipients: list[str] = []

    async def send(self, line: str) -> None:
        self.writer.write(f"{line}\r\n".encode())
        await self.writer.drain()

    async def read_line(self) -> str:
        raw = await self.reader.readline()
        return raw.decode("utf-8", errors="replace").strip()

    async def read_data(self) -> bytes:
        """Read until the lone-dot terminator, undoing dot-stuffing."""
        lines: list[bytes] = []
        while True:
            raw = await self.reader.readline()
            if not raw:
                break
            if raw.rstrip(b"\r\n") == b".":
                break
            if raw.startswith(b".."):
                raw = raw[1:]
            lines.append(raw)
        return b"".join(lines)

    async def run(self) -> None:
        await self.send("220 mailsink ready")

        while True:
            line = await self.read_line()
            if not line:
                break
            upper = line.upper()

            if upper.startswith("EHLO"):
                # The multi-line greeting has to advertise AUTH: aiosmtplib is
                # given a username and password, so it will try to use them.
                await self.send("250-mailsink")
                await self.send("250-AUTH PLAIN LOGIN")
                await self.send("250-8BITMIME")
                await self.send("250 SMTPUTF8")
            elif upper.startswith("HELO"):
                await self.send("250 mailsink")
            elif upper.startswith("AUTH"):
                # Accept anything: this sink authenticates nobody.
                if "LOGIN" in upper and len(line.split()) == 2:
                    await self.send(f"334 {base64.b64encode(b'Username:').decode()}")
                    await self.read_line()
                    await self.send(f"334 {base64.b64encode(b'Password:').decode()}")
                    await self.read_line()
                await self.send("235 authentication succeeded")
            elif upper.startswith("MAIL FROM"):
                self.recipients = []
                await self.send("250 sender ok")
            elif upper.startswith("RCPT TO"):
                match = re.search(r"<([^>]*)>", line)
                if match:
                    self.recipients.append(match.group(1))
                await self.send("250 recipient ok")
            elif upper.startswith("DATA"):
                await self.send("354 end with <CRLF>.<CRLF>")
                raw = await self.read_data()
                _store(self.recipients, raw)
                await self.send("250 queued")
            elif upper.startswith("RSET"):
                self.recipients = []
                await self.send("250 reset")
            elif upper.startswith("NOOP"):
                await self.send("250 ok")
            elif upper.startswith("QUIT"):
                await self.send("221 bye")
                break
            else:
                await self.send("250 ok")

        self.writer.close()


async def _handle(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    try:
        await SmtpSession(reader, writer).run()
    except (ConnectionResetError, asyncio.IncompleteReadError):
        pass
    except Exception as exc:  # noqa: BLE001 - a sink must never take the run down
        print(f"mailsink: session error: {exc}", flush=True)


async def _serve_smtp(port: int) -> None:
    server = await asyncio.start_server(_handle, "127.0.0.1", port)
    print(f"mailsink: SMTP on 127.0.0.1:{port}", flush=True)
    async with server:
        await server.serve_forever()


# ----------------------------------------------------------------- HTTP ----


class MailboxHandler(BaseHTTPRequestHandler):
    def _reply(self, status: int, payload: object) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler's spelling
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self._reply(200, {"status": "ok"})
            return
        if parsed.path != "/messages":
            self._reply(404, {"error": "not found"})
            return

        wanted = parse_qs(parsed.query).get("to", [None])[0]
        with _LOCK:
            messages = [m for m in _MESSAGES if wanted is None or m["to"] == wanted]
        self._reply(200, messages)

    def do_DELETE(self) -> None:  # noqa: N802
        if urlparse(self.path).path != "/messages":
            self._reply(404, {"error": "not found"})
            return
        with _LOCK:
            _MESSAGES.clear()
        self._reply(200, {"cleared": True})

    def log_message(self, *args: object) -> None:
        """Silence the per-request logging; the tests are noisy enough."""


def _serve_http(port: int) -> None:
    server = ThreadingHTTPServer(("127.0.0.1", port), MailboxHandler)
    print(f"mailsink: HTTP on 127.0.0.1:{port}", flush=True)
    server.serve_forever()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--smtp-port", type=int, default=1025)
    parser.add_argument("--http-port", type=int, default=8026)
    args = parser.parse_args()

    threading.Thread(target=_serve_http, args=(args.http_port,), daemon=True).start()
    asyncio.run(_serve_smtp(args.smtp_port))


if __name__ == "__main__":
    main()
