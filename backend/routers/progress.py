from datetime import datetime, timezone
from typing import List, Literal

from fastapi import APIRouter, Depends, Request

from clerk_auth import require_user, verify_session_token
from lib.db import db
from models.progress import LeaderboardEntry, Progress, ProgressIn

router = APIRouter()


def _merge(old: dict | None, new: ProgressIn, user_id: str) -> Progress:
    if not old:
        return Progress(user_id=user_id, **new.model_dump())

    xp = dict(old.get("xp") or {})
    for k, v in new.xp.items():
        xp[k] = max(xp.get(k, 0), v)

    equipped = dict(old.get("equipped") or {})
    for fid, slots in (new.equipped or {}).items():
        equipped[fid] = {**equipped.get(fid, {}), **slots}

    spent = max(old.get("spice_spent", 0), new.spice_spent)
    old_earned = old.get("spice_earned") or old.get("spice", 0) + old.get("spice_spent", 0)
    earned = max(old_earned, new.spice_earned or new.spice + new.spice_spent)

    return Progress(
        user_id=user_id,
        display_name=new.display_name or old.get("display_name", "Fremen"),
        wins=max(old.get("wins", 0), new.wins),
        losses=max(old.get("losses", 0), new.losses),
        spice=max(0, earned - spent),
        spice_earned=earned,
        spice_spent=spent,
        skill=new.skill,
        xp=xp,
        unlocked=sorted(set(old.get("unlocked") or []) | set(new.unlocked)),
        best_streak=max(old.get("best_streak", 0), new.best_streak),
        highest_combo=max(old.get("highest_combo", 0), new.highest_combo),
        hard_wins=max(old.get("hard_wins", 0), new.hard_wins),
        favorite_fighter=new.favorite_fighter or old.get("favorite_fighter"),
        tower_best=max(old.get("tower_best", 0), new.tower_best),
        owned_cosmetics=sorted(set(old.get("owned_cosmetics") or []) | set(new.owned_cosmetics)),
        equipped=equipped,
    )


@router.get("/progress", response_model=Progress)
async def get_progress(user: dict = Depends(require_user)):
    doc = await db.progress.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not doc:
        return _merge(None, ProgressIn(), user["user_id"])
    return Progress(**doc)


@router.post("/progress/sync", response_model=Progress)
async def sync_progress(body: ProgressIn, user: dict = Depends(require_user)):
    uid = user["user_id"]
    old = await db.progress.find_one({"user_id": uid}, {"_id": 0})
    merged = _merge(old, body, uid)
    merged.updated_at = datetime.now(timezone.utc)
    await db.progress.update_one({"user_id": uid}, {"$set": merged.model_dump()}, upsert=True)
    return merged


def _optional_uid(request: Request) -> str | None:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        return None
    try:
        return verify_session_token(auth[7:])["sub"]
    except Exception:
        return None


SORTS = {
    "wins": [("wins", -1), ("spice", -1)],
    "spice": [("spice", -1), ("wins", -1)],
    "hard": [("hard_wins", -1), ("wins", -1)],
}


@router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def leaderboard(request: Request, sort: Literal["wins", "spice", "hard"] = "wins"):
    me = _optional_uid(request)
    docs = await db.progress.find({}, {"_id": 0}).sort(SORTS[sort]).limit(50).to_list(50)
    out = []

    for i, d in enumerate(docs):
        total = d.get("wins", 0) + d.get("losses", 0)
        out.append(LeaderboardEntry(
            rank=i + 1,
            display_name=d.get("display_name", "Fremen"),
            wins=d.get("wins", 0),
            losses=d.get("losses", 0),
            spice=d.get("spice", 0),
            win_rate=round(d.get("wins", 0) / total * 100, 1) if total else 0.0,
            best_streak=d.get("best_streak", 0),
            highest_combo=d.get("highest_combo", 0),
            hard_wins=d.get("hard_wins", 0),
            favorite_fighter=d.get("favorite_fighter"),
            is_me=bool(me and d.get("user_id") == me),
        ))

    return out