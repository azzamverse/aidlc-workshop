"""Token use and its price for an AI-DLC run, read from Claude Code's own session logs.

Claude Code writes one JSONL log per chat (plus one per sub-agent) under
~/.claude/projects/<workspace path with every non-alphanumeric character as '-'>/
(or $CLAUDE_CONFIG_DIR/projects/...). Every model reply is an "assistant" line
carrying its usage and model; a reply is logged several times while it streams, so each
message id is counted once.

Only the AI-DLC run's own chat counts: the session IDs its audit trail records,
plus their sub-agents. Other Claude Code chats, other terminals and Claude Desktop
are never read. Within those, only replies inside the run window count (first
audit event of the run to the workflow's completion, or now while it runs), paused
time is left out, and each reply is given to the stage that was running at that moment.

The price is what the same tokens would cost at Anthropic's API list prices, per model,
with cache reads and cache writes (5-minute and 1-hour) priced separately. A Claude
subscription is not billed per token, so for one it is an equivalent, not a bill.
Read-only.
"""
import glob
import json
import os
import re
from datetime import datetime

# USD per million tokens: input, output, cache read, cache write (5 min), cache write (1 h).
# First match on the model id wins, so the specific ids come before their family.
# Prices as of 2026-10; cache writes are 1.25x (5 min) and 2x (1 h) the input price.
PRICES = [
    ("fable", (10.00, 50.00, 0.25, 12.50, 20.00)),
    ("mythos", (10.00, 50.00, 0.25, 12.50, 20.00)),
    ("opus-5-5", (4.00, 20.00, 0.20, 5.00, 8.00)),
    ("opus", (5.00, 25.00, 0.50, 6.25, 10.00)),        # Opus 5, 4.8, 4.7, 4.6
    ("sonnet-5", (2.00, 10.00, 0.20, 2.50, 4.00)),     # Sonnet 5.5 and 5
    ("sonnet", (3.00, 15.00, 0.30, 3.75, 6.00)),       # Sonnet 4.6
    ("haiku-5-5", (0.10, 0.50, 0.01, 0.125, 0.20)),    # prompts up to 100K tokens
    ("haiku", (1.00, 5.00, 0.10, 1.25, 2.00)),         # Haiku 4.5
]
DEFAULT_PRICE = dict(PRICES)["opus-5-5"]


def price_of(model):
    m = (model or "").lower()
    return next((p for key, p in PRICES if key in m), DEFAULT_PRICE)


def projects_dir(ws):
    base = os.environ.get("CLAUDE_CONFIG_DIR") or os.path.join(os.path.expanduser("~"), ".claude")
    return os.path.join(base, "projects", re.sub(r"[^A-Za-z0-9]", "-", os.path.abspath(ws)))


def run_sessions(events):
    """Session IDs the AI-DLC audit trail recorded for this run (its '**Session**:' field).
    events: iterable of field dicts."""
    return {f.get("Session") for f in events if f.get("Session")}


def _in_sessions(path, sessions):
    """A main log is <session>.jsonl; a sub-agent log sits under <session>/subagents/."""
    if not sessions:
        return True
    parts = os.path.normpath(path).split(os.sep)
    return os.path.splitext(parts[-1])[0] in sessions or any(p in sessions for p in parts[:-1])


def _replies(ws, since, sessions=None):
    """{message id: (timestamp, usage, model)} for every reply at or after `since`, from
    the given sessions only (all sessions when none are known)."""
    out = {}
    for path in glob.glob(os.path.join(projects_dir(ws), "**", "*.jsonl"), recursive=True):
        if not _in_sessions(path, sessions):
            continue
        try:
            if datetime.fromtimestamp(os.path.getmtime(path)).astimezone() < since:
                continue  # last written before the run began
            with open(path, encoding="utf-8", errors="replace") as fh:
                for line in fh:
                    if '"assistant"' not in line or '"usage"' not in line:
                        continue
                    try:
                        d = json.loads(line)
                    except ValueError:
                        continue
                    msg = d.get("message") or {}
                    usage, mid, ts = msg.get("usage"), msg.get("id"), d.get("timestamp")
                    if d.get("type") != "assistant" or not usage or not mid or not ts:
                        continue
                    t = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                    if t >= since:
                        out[mid] = (t, usage, msg.get("model"))
        except OSError:
            continue
    return out


def _split(u, model):
    inp, outp = u.get("input_tokens") or 0, u.get("output_tokens") or 0
    read = u.get("cache_read_input_tokens") or 0
    write = u.get("cache_creation_input_tokens") or 0
    tiers = u.get("cache_creation") or {}
    write_1h = tiers.get("ephemeral_1h_input_tokens") or 0
    write_5m = write - write_1h  # untiered writes are 5-minute writes
    p_in, p_out, p_read, p_w5, p_w1 = price_of(model)
    cost = (inp * p_in + outp * p_out + read * p_read + write_5m * p_w5 + write_1h * p_w1) / 1e6
    if u.get("speed") == "fast":
        cost *= 2  # fast mode is billed at twice the standard rates
    return {"input": inp, "output": outp, "cacheRead": read, "cacheWrite": write,
            "cache": read + write, "total": inp + outp + read + write, "cost": cost}


def _add(acc, part):
    for k, v in part.items():
        acc[k] = acc.get(k, 0) + v


def run_tokens(ws, run_start, run_end, stage_windows, pauses, sessions=None):
    """Token totals and their API price for the run, per stage and per model.

    run_end: the workflow's completion, or now while it runs.
    stage_windows: [(slug, start, end_or_None)] in run order.
    pauses: [(start, end)] to leave out.
    sessions: Claude Code session IDs of the AI-DLC run (from run_sessions); other chats
    in the same folder are then never counted.
    Returns {"total": {...}, "byStage": {slug: {...}}, "byModel": {model: {...}}},
    or None when no log is found.
    """
    if not run_start:
        return None
    replies = _replies(ws, run_start, sessions)
    if not replies and not os.path.isdir(projects_dir(ws)):
        return None
    total, by_stage, by_model = {}, {}, {}
    _add(total, _split({}, None))
    for t, usage, model in replies.values():
        if t > run_end or any(s <= t <= e for s, e in pauses):
            continue
        part = _split(usage, model)
        _add(total, part)
        _add(by_model.setdefault(model or "unknown", {}), part)
        for slug, s, e in reversed(stage_windows):
            if s and s <= t and (e is None or t <= e):
                _add(by_stage.setdefault(slug, {}), part)
                break
    by_model.pop("<synthetic>", None)  # Claude Code's own placeholder replies: no tokens
    return {"total": total, "byStage": by_stage, "byModel": by_model}
