from datetime import datetime, timezone
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class ProgressIn(BaseModel):
    """Client-side progress snapshot. Server merges monotonically (max / union)."""
    display_name: str = Field(default="Fremen", max_length=40)
    wins: int = Field(default=0, ge=0)
    losses: int = Field(default=0, ge=0)
    spice: int = Field(default=0, ge=0)
    xp: Dict[str, int] = Field(default_factory=dict)
    unlocked: List[str] = Field(default_factory=list)
    best_streak: int = Field(default=0, ge=0)
    highest_combo: int = Field(default=0, ge=0)
    hard_wins: int = Field(default=0, ge=0)
    favorite_fighter: Optional[str] = None
    tower_best: int = Field(default=0, ge=0)
    owned_cosmetics: List[str] = Field(default_factory=list)
    equipped: Dict[str, Dict[str, str]] = Field(default_factory=dict)
    skill: int = Field(default=0, ge=0, le=100)
    spice_earned: int = Field(default=0, ge=0)
    spice_spent: int = Field(default=0, ge=0)


class Progress(ProgressIn):
    user_id: str
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LeaderboardEntry(BaseModel):
    rank: int
    display_name: str
    wins: int
    losses: int
    spice: int
    win_rate: float
    best_streak: int
    highest_combo: int
    hard_wins: int
    favorite_fighter: Optional[str] = None
    is_me: bool = False