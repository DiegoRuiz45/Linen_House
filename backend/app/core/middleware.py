from collections.abc import Callable
from collections import defaultdict, deque
from secrets import token_hex
from time import monotonic

from starlette.responses import JSONResponse
from app.db.session import SessionLocal
from app.modules.audit.model import AdminAuditLog


class SecurityHeadersMiddleware:
    def __init__(self, app, hsts: bool = False):
        self.app = app
        self.hsts = hsts

    async def __call__(
        self,
        scope,
        receive: Callable,
        send: Callable,
    ) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.extend(
                    [
                        (b"x-content-type-options", b"nosniff"),
                        (b"x-frame-options", b"DENY"),
                        (b"referrer-policy", b"no-referrer"),
                        (
                            b"permissions-policy",
                            b"camera=(), microphone=(), geolocation=()",
                        ),
                        (
                            b"cache-control",
                            b"no-store" if scope["path"].startswith("/api/") else b"public, max-age=300",
                        ),
                    ]
                )
                if scope["path"].startswith("/api/"):
                    headers.append(
                        (
                            b"content-security-policy",
                            b"default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
                        )
                    )
                if self.hsts:
                    headers.append(
                        (b"strict-transport-security", b"max-age=31536000; includeSubDomains")
                    )
                message["headers"] = headers

            await send(message)

        await self.app(scope, receive, send_with_headers)


class AdminAuditMiddleware:
    MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

    def __init__(self, app, admin_path_prefix: str):
        self.app = app
        self.admin_path_prefix = admin_path_prefix

    async def __call__(self, scope, receive: Callable, send: Callable) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = token_hex(12)
        status_code = 500

        async def send_with_request_id(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", request_id.encode("ascii")))
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        finally:
            method = scope["method"].upper()
            path = scope["path"]
            if method in self.MUTATING_METHODS and path.startswith(self.admin_path_prefix):
                state = scope.get("state", {})
                user_id = state.get("admin_user_id")
                db = SessionLocal()
                try:
                    db.add(
                        AdminAuditLog(
                            user_id=user_id,
                            request_id=request_id,
                            method=method,
                            path=path[:500],
                            status_code=status_code,
                        )
                    )
                    db.commit()
                except Exception:
                    db.rollback()
                finally:
                    db.close()


class LoginRateLimitMiddleware:
    def __init__(
        self,
        app,
        *,
        path: str,
        limit: int,
        window_seconds: int,
    ):
        self.app = app
        self.path = path
        self.limit = limit
        self.window_seconds = window_seconds
        self.attempts = defaultdict(deque)

    async def __call__(self, scope, receive: Callable, send: Callable) -> None:
        if (
            scope["type"] != "http"
            or scope["method"].upper() != "POST"
            or scope["path"] != self.path
        ):
            await self.app(scope, receive, send)
            return

        client = scope.get("client")
        client_ip = client[0] if client else "unknown"
        if client_ip not in self.attempts and len(self.attempts) >= 10_000:
            self.attempts.pop(next(iter(self.attempts)))
        now = monotonic()
        bucket = self.attempts[client_ip]
        cutoff = now - self.window_seconds

        while bucket and bucket[0] <= cutoff:
            bucket.popleft()

        if len(bucket) >= self.limit:
            response = JSONResponse(
                {"detail": "Demasiados intentos. Intenta nuevamente más tarde."},
                status_code=429,
                headers={"Retry-After": str(self.window_seconds)},
            )
            await response(scope, receive, send)
            return

        bucket.append(now)
        await self.app(scope, receive, send)
