"""
Face match provider interface.
Each provider implements compare(image1_path, image2_path) -> (distance, similarity, match).
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class MatchResult:
    distance: float
    similarity: float
    match: bool
    error: str | None = None


class BaseProvider(ABC):
    @abstractmethod
    def compare(self, id_path: str, selfie_path: str, threshold: float) -> MatchResult:
        ...
