#!/usr/bin/env python3
"""
SearchAdapter — the seam that makes the data source pluggable.

Every source (licensed API, polite scrape, sample fixtures) implements this one
method. The rest of the pipeline (store, matcher, alerter) only ever sees
canonical `Listing` objects, so you can add, swap, or drop a source without
touching anything downstream.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Iterable

from ..models import Listing, Want


class SearchAdapter(ABC):
    #: short, stable id used on the CLI and stored on every Listing
    name: str = "base"

    #: True if this adapter is ready to run (key present, network allowed, ...).
    #: run.py checks this and prints a helpful reason via `unavailable_reason`.
    def available(self) -> bool:  # noqa: D401
        return True

    def unavailable_reason(self) -> str:
        return ""

    @abstractmethod
    def search(self, want: Want) -> Iterable[Listing]:
        """Return the listings this source currently has that *broadly* match
        `want`. Coarse filtering here (make/model/price) is fine and reduces
        traffic; the precise matching is the matcher's job, not the adapter's."""
        raise NotImplementedError
