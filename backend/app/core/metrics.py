"""In-process metric collection in the Prometheus exposition format.

Written by hand rather than pulled from ``prometheus_client`` on purpose: the
surface we need is three metric types and a text renderer, and a hand-rolled
registry keeps the process free of a global default registry with its own
collectors (which behave badly under multiple uvicorn workers) and lets the
scrape endpoint mix in gauges read from the database at scrape time.

Everything here is process-local. Counters reset when the process restarts —
that is normal for Prometheus, which handles counter resets itself.
"""

from __future__ import annotations

import threading
import time
from collections.abc import Iterable, Iterator, Mapping, Sequence
from typing import Literal

__all__ = [
    "Counter",
    "Gauge",
    "Histogram",
    "Registry",
    "REGISTRY",
    "render",
]

# A metric sample: the (ordered) label values it is keyed by, and its value.
_Key = tuple[str, ...]


def _escape_help(text: str) -> str:
    return text.replace("\\", r"\\").replace("\n", r"\n")


def _escape_label(value: str) -> str:
    return (
        value.replace("\\", r"\\").replace('"', r"\"").replace("\n", r"\n")
    )


def _format_value(value: float) -> str:
    """Render a float the way Prometheus expects.

    Integral values are written without a decimal point so counters read as
    ``5`` rather than ``5.0``; ``+Inf`` has its own spelling.
    """
    if value == float("inf"):
        return "+Inf"
    if value == float("-inf"):
        return "-Inf"
    if value != value:  # NaN
        return "NaN"
    if float(value).is_integer() and abs(value) < 1e15:
        return str(int(value))
    return repr(float(value))


def _labels_to_text(names: Sequence[str], values: _Key, extra: str = "") -> str:
    parts = [f'{n}="{_escape_label(v)}"' for n, v in zip(names, values, strict=True)]
    if extra:
        parts.append(extra)
    return "{" + ",".join(parts) + "}" if parts else ""


class _Metric:
    """Shared bookkeeping: a name, a help string and a label schema."""

    kind: Literal["counter", "gauge", "histogram"]

    def __init__(
        self, name: str, help_text: str, labels: Sequence[str] = ()
    ) -> None:
        self.name = name
        self.help_text = help_text
        self.labels = tuple(labels)
        self._lock = threading.Lock()

    def _key(self, values: Mapping[str, str]) -> _Key:
        try:
            return tuple(str(values[label]) for label in self.labels)
        except KeyError as exc:  # pragma: no cover - a programming error
            raise ValueError(
                f"{self.name} needs labels {self.labels}, missing {exc}"
            ) from exc

    def render(self) -> Iterator[str]:  # pragma: no cover - overridden
        raise NotImplementedError

    def _header(self, name: str | None = None) -> Iterator[str]:
        shown = name or self.name
        yield f"# HELP {shown} {_escape_help(self.help_text)}"
        yield f"# TYPE {shown} {self.kind}"


class Counter(_Metric):
    """A value that only ever goes up."""

    kind = "counter"

    def __init__(
        self, name: str, help_text: str, labels: Sequence[str] = ()
    ) -> None:
        super().__init__(name, help_text, labels)
        self._values: dict[_Key, float] = {}
        if not self.labels:
            self._values[()] = 0.0

    def inc(self, amount: float = 1.0, **labels: str) -> None:
        key = self._key(labels)
        with self._lock:
            self._values[key] = self._values.get(key, 0.0) + amount

    def value(self, **labels: str) -> float:
        return self._values.get(self._key(labels), 0.0)

    def render(self) -> Iterator[str]:
        with self._lock:
            items = sorted(self._values.items())
        yield from self._header()
        for key, value in items:
            labels = _labels_to_text(self.labels, key)
            yield f"{self.name}{labels} {_format_value(value)}"


class Gauge(_Metric):
    """A value that goes up and down."""

    kind = "gauge"

    def __init__(
        self, name: str, help_text: str, labels: Sequence[str] = ()
    ) -> None:
        super().__init__(name, help_text, labels)
        self._values: dict[_Key, float] = {}
        if not self.labels:
            self._values[()] = 0.0

    def set(self, value: float, **labels: str) -> None:
        key = self._key(labels)
        with self._lock:
            self._values[key] = float(value)

    def inc(self, amount: float = 1.0, **labels: str) -> None:
        key = self._key(labels)
        with self._lock:
            self._values[key] = self._values.get(key, 0.0) + amount

    def dec(self, amount: float = 1.0, **labels: str) -> None:
        self.inc(-amount, **labels)

    def clear(self) -> None:
        """Drop every sample — used before refilling gauges from the database.

        Without this, a label combination that stops occurring (a status no
        device is in any more) would keep reporting its last value forever.
        """
        with self._lock:
            self._values.clear()
            if not self.labels:
                self._values[()] = 0.0

    def value(self, **labels: str) -> float:
        return self._values.get(self._key(labels), 0.0)

    def render(self) -> Iterator[str]:
        with self._lock:
            items = sorted(self._values.items())
        yield from self._header()
        for key, value in items:
            labels = _labels_to_text(self.labels, key)
            yield f"{self.name}{labels} {_format_value(value)}"


class Histogram(_Metric):
    """Bucketed observations — latency, and anything else with a distribution.

    Buckets are cumulative in the exposition, as Prometheus requires: each
    ``le`` line counts every observation at or below that bound.
    """

    kind = "histogram"

    # Suited to an HTTP API in front of an LLM: sub-millisecond through half a
    # minute, which is where the provider timeout sits.
    DEFAULT_BUCKETS: tuple[float, ...] = (
        0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0,
    )

    def __init__(
        self,
        name: str,
        help_text: str,
        labels: Sequence[str] = (),
        buckets: Iterable[float] = DEFAULT_BUCKETS,
    ) -> None:
        super().__init__(name, help_text, labels)
        bounds = sorted(float(b) for b in buckets)
        if not bounds:
            raise ValueError("a histogram needs at least one bucket")
        self.buckets = tuple(bounds)
        self._counts: dict[_Key, list[int]] = {}
        self._sums: dict[_Key, float] = {}
        self._totals: dict[_Key, int] = {}

    def observe(self, value: float, **labels: str) -> None:
        key = self._key(labels)
        with self._lock:
            counts = self._counts.get(key)
            if counts is None:
                counts = [0] * len(self.buckets)
                self._counts[key] = counts
                self._sums[key] = 0.0
                self._totals[key] = 0
            for index, bound in enumerate(self.buckets):
                if value <= bound:
                    counts[index] += 1
            self._sums[key] += value
            self._totals[key] += 1

    def count(self, **labels: str) -> int:
        return self._totals.get(self._key(labels), 0)

    def render(self) -> Iterator[str]:
        with self._lock:
            keys = sorted(self._counts)
            snapshot = {
                key: (list(self._counts[key]), self._sums[key], self._totals[key])
                for key in keys
            }
        yield from self._header()
        for key in keys:
            counts, total_sum, total_count = snapshot[key]
            for bound, count in zip(self.buckets, counts, strict=True):
                le = _labels_to_text(
                    self.labels, key, f'le="{_format_value(bound)}"'
                )
                yield f"{self.name}_bucket{le} {count}"
            inf = _labels_to_text(self.labels, key, 'le="+Inf"')
            yield f"{self.name}_bucket{inf} {total_count}"
            base = _labels_to_text(self.labels, key)
            yield f"{self.name}_sum{base} {_format_value(total_sum)}"
            yield f"{self.name}_count{base} {total_count}"


class Registry:
    """The set of metrics rendered by a scrape."""

    def __init__(self) -> None:
        self._metrics: list[_Metric] = []

    def register(self, metric: _Metric) -> _Metric:
        if any(m.name == metric.name for m in self._metrics):
            raise ValueError(f"metric {metric.name} is already registered")
        self._metrics.append(metric)
        return metric

    def counter(self, name: str, help_text: str, labels: Sequence[str] = ()) -> Counter:
        metric = Counter(name, help_text, labels)
        self.register(metric)
        return metric

    def gauge(self, name: str, help_text: str, labels: Sequence[str] = ()) -> Gauge:
        metric = Gauge(name, help_text, labels)
        self.register(metric)
        return metric

    def histogram(
        self,
        name: str,
        help_text: str,
        labels: Sequence[str] = (),
        buckets: Iterable[float] = Histogram.DEFAULT_BUCKETS,
    ) -> Histogram:
        metric = Histogram(name, help_text, labels, buckets)
        self.register(metric)
        return metric

    def render(self) -> str:
        lines: list[str] = []
        for metric in self._metrics:
            lines.extend(metric.render())
        # The exposition format requires a trailing newline.
        return "\n".join(lines) + "\n"


REGISTRY = Registry()


# --- The metrics themselves -------------------------------------------------
#
# Everything is prefixed `mevratek_` so a shared Prometheus can tell our series
# apart from anything else scraping the same host.

BUILD_INFO = REGISTRY.gauge(
    "mevratek_build_info",
    "Always 1; the labels carry the build and runtime configuration.",
    ["version", "environment", "provider", "model"],
)

HTTP_REQUESTS = REGISTRY.counter(
    "mevratek_http_requests_total",
    "HTTP requests handled, by route template and response status.",
    ["method", "route", "status"],
)

HTTP_DURATION = REGISTRY.histogram(
    "mevratek_http_request_duration_seconds",
    "Wall-clock time spent handling an HTTP request.",
    ["method", "route"],
)

HTTP_IN_FLIGHT = REGISTRY.gauge(
    "mevratek_http_requests_in_flight",
    "Requests currently being handled.",
)

HTTP_EXCEPTIONS = REGISTRY.counter(
    "mevratek_http_exceptions_total",
    "Requests that ended in an unhandled exception.",
    ["route"],
)

DECISIONS = REGISTRY.counter(
    "mevratek_decisions_total",
    (
        "Decisions produced by the engine. outcome=fallback means the provider "
        "failed and a deterministic placeholder was returned instead."
    ),
    ["provider", "outcome"],
)

DECISION_DURATION = REGISTRY.histogram(
    "mevratek_decision_duration_seconds",
    "Time the LLM provider took to return a decision.",
    ["provider", "outcome"],
)

DECISION_CONFIDENCE = REGISTRY.histogram(
    "mevratek_decision_confidence",
    "Confidence the model reported for its decision.",
    ["provider", "outcome"],
    buckets=(0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0),
)

DROPPED_ACTIONS = REGISTRY.counter(
    "mevratek_dropped_actions_total",
    "Universal actions the translator could not map onto a device.",
)

EMAILS = REGISTRY.counter(
    "mevratek_emails_total",
    "Outgoing email attempts, by outcome.",
    ["outcome"],
)

# Gauges filled from the database on each scrape, not incremented in flight.

ORGANIZATIONS = REGISTRY.gauge(
    "mevratek_organizations", "Organizations in the database."
)
USERS = REGISTRY.gauge("mevratek_users", "User accounts in the database.")
DEVICES = REGISTRY.gauge(
    "mevratek_devices", "Registered devices, by status.", ["status"]
)
TASKS = REGISTRY.gauge("mevratek_tasks", "Tasks, by status.", ["status"])
EXECUTIONS = REGISTRY.gauge(
    "mevratek_executions", "Action executions on record, by status.", ["status"]
)
DECISION_LOGS = REGISTRY.gauge(
    "mevratek_decision_logs",
    "Decisions on record in the last 24 hours, by outcome.",
    ["outcome"],
)
DECISION_LATENCY_MS = REGISTRY.gauge(
    "mevratek_decision_latency_ms",
    "Decision latency over the last 24 hours, read back from the log.",
    ["quantile"],
)
SCRAPE_DURATION = REGISTRY.gauge(
    "mevratek_scrape_duration_seconds",
    "How long it took to collect the database gauges for this scrape.",
)


def render() -> str:
    return REGISTRY.render()


class Stopwatch:
    """``with Stopwatch() as t:`` … ``t.seconds``."""

    __slots__ = ("_start", "seconds")

    def __enter__(self) -> Stopwatch:
        self._start = time.perf_counter()
        self.seconds = 0.0
        return self

    def __exit__(self, *_exc: object) -> Literal[False]:
        self.seconds = time.perf_counter() - self._start
        return False
