#!/usr/bin/env python3
"""Live workshop dashboard for an AI-DLC run.

Usage: python3 tools/dashboard/server.py [workspace] [--port 8787] [--open]

Runs on macOS and Windows; launch it with tools/dashboard.sh, or tools/dashboard.cmd on Windows.
With no workspace it uses the current folder, the folder holding tools/, or a
workspace folder beside tools/. --open opens it in a new browser window.

Serves the dashboard page on http://127.0.0.1:<port>/ and a JSON snapshot on
/api/state, built from the workspace's AI-DLC files (state, audit trail) and
Claude Code session logs (token use and its API price). Read-only: it never writes to the workspace; the
test and line-count history behind the Delivery strip is kept in tools/dashboard/.history/.
"""
import glob
import json
import os
import re
import sys
import threading
import time
import traceback
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from session_tokens import run_sessions, run_tokens  # noqa: E402
from delivery import (Tracker, bolt_plan, covered_sec, delivery, expand_swarm,  # noqa: E402
                      bolt_tracks, paused_sec, stage_windows, unit_deps, unit_levels)

HERE = os.path.dirname(os.path.abspath(__file__))
TRACKER = None  # test and line-count history, started in main()

# All 33 stages: slug, number, name, phase index, timebox (min), workshop note, spotlight.
STAGES = [
    ("workspace-scaffold", "0.1", "Workspace Scaffold", 0, None, "Automatic", False),
    ("workspace-detection", "0.2", "Workspace Detection", 0, None, "Automatic", False),
    ("state-init", "0.3", "State Initialization", 0, 5, "Automatic, then plan gate", False),
    ("intent-capture", "1.1", "Intent Capture & Framing", 1, 15, "", False),
    ("market-research", "1.2", "Market Research", 1, None, "The brief already settles what to build", False),
    ("feasibility", "1.3", "Feasibility & Constraints", 1, None, "Known stack, runs locally", False),
    ("scope-definition", "1.4", "Scope Definition", 1, 10, "", False),
    ("team-formation", "1.5", "Team Formation", 1, None, "Teams formed before today", False),
    ("rough-mockups", "1.6", "Rough Mockups", 1, None, "Straight to high-fidelity in 2.5", False),
    ("approval-handoff", "1.7", "Approval & Handoff", 1, None, "PO approves live at every gate", False),
    ("reverse-engineering", "2.1", "Reverse Engineering", 2, None, "Reads the existing code (v2 onwards)", False),
    ("practices-discovery", "2.2", "Practices Discovery", 2, None, "Framework defaults today", False),
    ("requirements-analysis", "2.3", "Requirements Analysis", 2, 15, "", False),
    ("user-stories", "2.4", "User Stories", 2, 10, "", False),
    ("refined-mockups", "2.5", "Refined Mockups", 2, 25, "Required: hi-fi design", True),
    ("domain-design", "2.6", "Domain Design", 2, 12, "Design decisions (ADRs)", True),
    ("units-generation", "2.7", "Units Generation", 2, 10, "Architecture: units", True),
    ("contract-design", "2.8", "Contract Design", 2, 10, "Architecture: contracts", True),
    ("delivery-planning", "2.9", "Delivery Planning", 2, 8, "", False),
    ("functional-design", "3.1", "Functional Design", 3, 30, "Business rules", True),
    ("nfr-requirements", "3.2", "NFR Requirements", 3, None, "No targets for a local demo", False),
    ("nfr-design", "3.3", "NFR Design", 3, None, "Follows 3.2", False),
    ("infrastructure-design", "3.4", "Infrastructure Design", 3, None, "Runs locally", False),
    ("code-generation", "3.5", "Code Generation", 3, 105, "Skeleton first, then Bolts in parallel", False),
    ("build-and-test", "3.6", "Build and Test", 3, 15, "", False),
    ("ci-pipeline", "3.7", "CI Pipeline", 3, None, "No git or CI today", False),
    ("deployment-pipeline", "4.1", "Deployment Pipeline", 4, None, "", False),
    ("environment-provisioning", "4.2", "Environment Provisioning", 4, None, "", False),
    ("deployment-execution", "4.3", "Deployment Execution", 4, None, "", False),
    ("observability-setup", "4.4", "Observability Setup", 4, None, "", False),
    ("incident-response", "4.5", "Incident Response", 4, None, "", False),
    ("performance-validation", "4.6", "Performance Validation", 4, None, "", False),
    ("feedback-optimization", "4.7", "Feedback & Optimization", 4, None, "", False),
]
PHASES = ["Initialization", "Ideation", "Inception", "Construction", "Operation"]
STAGE_BOX = {s[0]: s[4] for s in STAGES}
PER_UNIT = {"functional-design", "code-generation"}  # stages that run once per Unit, Bolt by Bolt
# Workshop plan used before AI-DLC has written its own plan.
WORKSHOP_RUN = {"workspace-scaffold", "workspace-detection", "state-init", "intent-capture",
                "scope-definition", "requirements-analysis", "user-stories", "refined-mockups",
                "domain-design", "units-generation", "contract-design", "delivery-planning",
                "functional-design", "code-generation", "build-and-test"}
# The run day, in minutes of run time from the start command: 5 hours in all. The theory
# presentation before it and the break (a pause) are not run time.
KICKOFF_MIN = 0
DAY_MIN = 300

BOX = {"x": "done", "-": "running", "?": "gate", "R": "revising", "S": "skipped", " ": "pending"}
STAGE_LINE = re.compile(r"^- \[(.)\] ([a-z0-9-]+)\s*[—–-]+\s*(EXECUTE|SKIP)", re.M)
STATUS_FIELD = re.compile(r"^- \*\*(?P<k>[^*]+)\*\*:\s*(?P<v>.*)$", re.M)
FIELD = re.compile(r"^\*\*(?P<k>[^*]+)\*\*:\s*(?P<v>.*)$")

SKIP_DIRS = {"node_modules", ".git", ".claude", ".aidlc-engine", ".aidlc-sessions", "audit",
             "dist", "build", ".next", "coverage", "checkpoints", "__pycache__"}
OUTPUT_EXT = {".md", ".html", ".htm", ".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".sql"}
SKIP_FILES = {"aidlc-state.md", "package-lock.json", "project-description.json", "CLAUDE.md",
              "intents.json", "runtime-graph.json"}


def rel(p, ws):
    """Workspace-relative path with forward slashes, as the page expects (also on Windows)."""
    return os.path.relpath(p, ws).replace(os.sep, "/")


def find_intent(ws, want=None):
    """(mtime, record dir, space, name) of the named record, else of the live one: the record
    AI-DLC changed last, the piece of work under way."""
    base = os.path.join(ws, "aidlc", "spaces")
    best = None
    if not os.path.isdir(base):
        return None
    for space in os.listdir(base):
        idir = os.path.join(base, space, "intents")
        if not os.path.isdir(idir):
            continue
        for name in os.listdir(idir):
            st = os.path.join(idir, name, "aidlc-state.md")
            if os.path.isfile(st):
                m = os.path.getmtime(st)
                if want is not None:
                    if name == want:
                        return (m, os.path.join(idir, name), space, name)
                elif best is None or m > best[0]:
                    best = (m, os.path.join(idir, name), space, name)
    return best


START_DATE = re.compile(r"^- \*\*Start Date\*\*:\s*(\S+)", re.M)


def list_intents(ws):
    """Every record, in the order the work started, labelled v1, v2, … The live one is find_intent's."""
    live = find_intent(ws)
    out = []
    base = os.path.join(ws, "aidlc", "spaces")
    for space in (os.listdir(base) if os.path.isdir(base) else []):
        idir = os.path.join(base, space, "intents")
        for name in (os.listdir(idir) if os.path.isdir(idir) else []):
            st = os.path.join(idir, name, "aidlc-state.md")
            if not os.path.isfile(st):
                continue
            m = START_DATE.search(read_state(st))
            try:
                start = datetime.fromisoformat(m.group(1).replace("Z", "+00:00")) if m else None
            except ValueError:
                start = None
            start = start or datetime.fromtimestamp(os.path.getmtime(st), timezone.utc)
            out.append({"name": name, "dir": os.path.join(idir, name), "start": start,
                        "live": bool(live) and live[3] == name})
    out.sort(key=lambda x: x["start"])
    for i, x in enumerate(out):
        x["label"] = f"v{i + 1}"
    return out


def remember_results(ws):
    """The test files hold only the newest run: file each run under the piece of work under way when
    it ran (the latest one started before it), so an earlier piece keeps its last results."""
    tests = read_tests(ws)
    if not tests["updated"] or not TRACKER:
        return
    at = datetime.fromisoformat(tests["updated"])
    owner = None
    for x in list_intents(ws):
        if x["start"] <= at:
            owner = x["name"]
    if owner:
        TRACKER.keep_results(owner, tests)


EARLIER = {}  # record dir -> (its audit files' mtimes, its Delivery figures as it ended)


def ended_delivery(ws, intent_dir):
    """An earlier piece of work's Delivery figures as it ended, worked out again only when its
    audit trail changes: its Bolts stay in the live view's table."""
    sig = tuple(sorted((p, os.path.getmtime(p)) for p in glob.glob(os.path.join(glob.escape(intent_dir), "audit", "*.md"))))
    hit = EARLIER.get(intent_dir)
    if hit and hit[0] == sig:
        return hit[1]
    events = expand_swarm(parse_events(intent_dir))
    if not events:
        return None
    clock = events[-1][0]
    pauses, _ = pause_windows(events, clock)
    tracks = bolt_tracks(events, unit_levels(unit_deps(intent_dir)), clock)
    dl = delivery(ws, intent_dir, events, TRACKER, pauses, clock, tracks, until=clock)
    EARLIER[intent_dir] = (sig, dl)
    return dl


def parse_events(intent_dir):
    """Every audit event of the record, sorted. A shard may be mid-write: its last block counts only
    once the separator after it is written, or the file has been still for a second."""
    events = []
    adir = os.path.join(intent_dir, "audit")
    if not os.path.isdir(adir):
        return events
    for fn in os.listdir(adir):
        if not fn.endswith(".md"):
            continue
        path = os.path.join(adir, fn)
        try:
            with open(path, encoding="utf-8", errors="replace") as fh:
                text = fh.read()
            settled = time.time() - os.path.getmtime(path) > 1.0
        except OSError as exc:
            log(f"audit shard {fn} unreadable: {exc}")
            continue
        blocks = text.split("\n---")
        if blocks and blocks[-1].strip() and not settled:
            blocks = blocks[:-1]  # a half-written last block: wait for the rest
        for block in blocks:
            fields, title = {}, ""
            for line in block.splitlines():
                s = line.strip()
                if s.startswith("## ") and not title:
                    title = s[3:]
                m = FIELD.match(s)
                if m:
                    fields.setdefault(m["k"].strip(), m["v"].strip())
            if "Timestamp" in fields and "Event" in fields:
                try:
                    ts = datetime.fromisoformat(fields["Timestamp"].replace("Z", "+00:00"))
                except ValueError:
                    continue
                fields["_title"] = title
                events.append((ts, fields))
    events.sort(key=lambda e: e[0])
    return events


LAST_STATE = {}  # state file path -> its last complete text


def log(msg):
    """One line on the server console; the page keeps showing the last good figures."""
    print(f"{datetime.now():%H:%M:%S} dashboard: {msg}", file=sys.stderr, flush=True)


def read_state(path):
    """aidlc-state.md, or its last complete copy while AI-DLC is rewriting it (no Current Status yet)."""
    try:
        with open(path, encoding="utf-8", errors="replace") as fh:
            text = fh.read()
    except OSError as exc:
        text = ""
        log(f"state unreadable: {exc}")
    if "## Current Status" in text and STAGE_LINE.search(text):
        LAST_STATE[path] = text
        return text
    if path in LAST_STATE:
        log("state file mid-write: using its last complete copy")
        return LAST_STATE[path]
    return text


def checkpoint_pending(events):
    """The Units whose Code Generation is complete but not yet signed off, latest last.
    One Unit at a time there is at most one; a parallel batch waits for one sign-off together."""
    last = {}
    for _, ev in events:
        unit, e = ev.get("Unit"), ev.get("Event")
        if not unit:
            continue
        if e == "UNIT_COMPLETED" and ev.get("Stage") == "code-generation":
            last[unit] = "built"
        elif e == "UNIT_STARTED":
            last[unit] = "building"
        elif e == "GATE_APPROVED":
            last[unit] = "approved"
    return [u for u, s in last.items() if s == "built"]


def parallel_running(events):
    """(batch start, stage, [unit slugs]) of a parallel batch still building, else None.
    A Unit leaves the batch when it lands (SWARM_SOURCE_MERGED) or fails."""
    batch = None
    for ts, ev in events:
        e = ev.get("Event")
        if e == "SWARM_STARTED":
            batch = (ts, ev.get("Stage") or "code-generation",
                     [u.strip() for u in (ev.get("Unit names") or "").split(",") if u.strip()])
        elif batch and e in ("SWARM_SOURCE_MERGED", "SWARM_UNIT_FAILED") and ev.get("Unit name") in batch[2]:
            batch[2].remove(ev["Unit name"])
        elif e == "SWARM_COMPLETED":
            batch = None
    return batch if batch and batch[2] else None


def latest_output(ws, intent_dir, record_only=False):
    """The newest document or code file; for an earlier piece of work, the newest in its own record."""
    newest = None
    roots = [intent_dir] if record_only and intent_dir else [ws]
    for root in roots:
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
            top = rel(dirpath, ws).split("/")[0]
            if top in ("ideas", "tools"):
                continue
            for fn in filenames:
                ext = os.path.splitext(fn)[1].lower()
                if ext not in OUTPUT_EXT or fn in SKIP_FILES or fn.endswith("-questions.md"):
                    continue
                p = os.path.join(dirpath, fn)
                try:
                    m = os.path.getmtime(p)
                except OSError:
                    continue
                if newest is None or m > newest[0]:
                    newest = (m, p)
    if not newest:
        return None
    path = rel(newest[1], ws)
    ext = os.path.splitext(path)[1].lower()
    kind = "html" if ext in (".html", ".htm") else ("md" if ext == ".md" else "code")
    return {"path": path, "kind": kind,
            "updated": datetime.fromtimestamp(newest[0], timezone.utc).isoformat()}


CODE_EXT = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".html", ".json", ".sql", ".md"}
STAGE_BY_SLUG = {s[0]: s for s in STAGES}


BRIEF_PATH = re.compile(r"ideas/[\w./-]+?\.md")


def brief_files(ws, intent_dir):
    """The brief a piece of work was started from (named in its description), with the other notes
    beside it; the fixed question script stays out. The workshop brief when none is named."""
    desc = ""
    try:
        with open(os.path.join(intent_dir, "project-description.json"), encoding="utf-8") as fh:
            desc = json.dumps(json.load(fh))
    except (OSError, ValueError, TypeError):
        pass
    found = [os.path.join(ws, *p.split("/")) for p in BRIEF_PATH.findall(desc)]
    found = [p for p in found if os.path.isfile(p)] or [os.path.join(ws, "ideas", "table-order", "IDEA.md")]
    out = []
    for p in found:
        folder = os.path.dirname(p)
        for fn in [os.path.basename(p)] + sorted(f for f in os.listdir(folder) if f.endswith(".md")):
            q = os.path.join(folder, fn)
            if fn != "QUESTIONS.md" and os.path.isfile(q) and q not in out:
                out.append(q)
    return out


def list_files(ws, want=None):
    """Stage documents grouped by stage (in run order), then the app's code."""
    found = find_intent(ws, want) if want else find_intent(ws)
    groups = {}
    if found:
        intent_dir = found[1]
        for dirpath, dirnames, filenames in os.walk(intent_dir):
            dirnames[:] = [d for d in dirnames if d not in ("audit", "archive") and not d.startswith(".")]
            parts = os.path.relpath(dirpath, intent_dir).split(os.sep)
            stage = next((STAGE_BY_SLUG[p] for p in reversed(parts) if p in STAGE_BY_SLUG), None)
            unit = next((p for p in parts if p not in STAGE_BY_SLUG and p not in
                         ("ideation", "inception", "construction", "operation", "reviews", ".")), None)
            for fn in sorted(filenames):
                if os.path.splitext(fn)[1].lower() not in (".md", ".html", ".htm") or fn == "aidlc-state.md":
                    continue
                p = os.path.join(dirpath, fn)
                key = stage[0] if stage else "other"
                g = groups.setdefault(key, {"slug": key, "title": f"{stage[1]} {stage[2]}" if stage else "Other documents",
                                            "order": STAGES.index(stage) if stage else 98, "star": bool(stage and stage[6]),
                                            "files": []})
                label = fn
                if "reviews" in parts:
                    label = "review: " + fn
                if unit and stage and stage[3] == 3:
                    label = f"{unit}: {label}"
                g["files"].append({"path": rel(p, ws), "name": label, "mtime": os.path.getmtime(p)})
    code = []
    skip = SKIP_DIRS | {"aidlc", "ideas", "tools"}
    for dirpath, dirnames, filenames in os.walk(ws):
        dirnames[:] = sorted(d for d in dirnames if d not in skip and not d.startswith("."))
        for fn in sorted(filenames):
            if os.path.splitext(fn)[1].lower() in CODE_EXT and fn not in SKIP_FILES:
                p = os.path.join(dirpath, fn)
                code.append({"path": rel(p, ws), "name": rel(p, ws),
                             "mtime": os.path.getmtime(p)})
                if len(code) >= 500:
                    break
    out = sorted(groups.values(), key=lambda g: g["order"])
    briefs = [p for p in brief_files(ws, found[1] if found else ws) if os.path.isfile(p)]
    if briefs:
        out.insert(0, {"slug": "brief", "title": "The brief", "order": -1, "star": False,
                       "files": [{"path": rel(p, ws), "name": os.path.basename(p), "mtime": os.path.getmtime(p)} for p in briefs]})
    if code:
        out.append({"slug": "app-code", "title": "App code", "order": 99, "star": False, "code": True, "files": code})
    return out


def describe(ev):
    e = ev.get("Event", "")
    d = ev.get("Details") or ev.get("Person Reply") or ""
    names = {
        "STAGE_STARTED": "Stage started",
        "STAGE_AWAITING_APPROVAL": "Gate open: waiting for the team's decision",
        "STAGE_REVISING": "Revising after a change request",
        "STAGE_COMPLETED": "Stage completed",
        "STAGE_SKIPPED": "Stage skipped",
        "GATE_APPROVED": "Gate approved",
        "GATE_REJECTED": "Changes requested",
        "QUESTION_ASKED": "AI asked a question",
        "QUESTION_SHOWN": "AI asked a question",
        "DECISION_RECORDED": "AI asked the team",
        "QUESTION_ANSWERED": "Team answered",
        "QUESTION_REPLIED": "Team replied",
        "REVIEW_REQUESTED": "Review started",
        "REVIEW_COMPLETED": "Review finished",
        "ARTIFACT_CREATED": "File written",
        "ARTIFACT_UPDATED": "File updated",
        "SUBAGENT_DISPATCHED": "Specialist agent started",
        "SUBAGENT_COMPLETED": "Specialist agent finished",
        "UNIT_STARTED": "Unit started",
        "UNIT_COMPLETED": "Unit completed",
        "PLAN_APPROVAL_RECORDED": "Code plan approved",
        "WORKFLOW_COMPLETED": "Workflow completed",
        "SUMMARY_CONFIRMATION_RECORDED": "Summary confirmed",
        "DECISION_RECORDED": "Decision recorded",
    }
    if e in ("HUMAN_TURN", "NOTE") or e.startswith(("SENSOR", "GUARD", "HOOK", "STATE_")):
        return None
    text = names.get(e) or e.replace("_", " ").capitalize()
    extra = ev.get("Artifact") or ev.get("Path") or ev.get("File") or ev.get("Reviewer") \
        or ev.get("Agent") if e.startswith(("ARTIFACT", "REVIEW", "SUBAGENT")) else d
    return text, (extra or "")[:140]


QUESTION_HEAD = re.compile(r"^## Q(\d+)\.", re.M)
ANSWER_TAG = re.compile(r"^\[Answer\]:[ \t]*(\S.*)?$", re.M)
PHASE_DIRS = ["initialization", "ideation", "inception", "construction", "operation"]


def stage_questions(intent_dir, slug, phase):
    """(asked, answered) from the stage's questions file: one per '## Q<n>.' heading,
    answered when its [Answer]: tag is filled. A per-Unit stage keeps one file per Unit
    (<phase>/<unit>/<stage>/), and those are added up. None when no file exists."""
    if not intent_dir:
        return None
    name = f"{slug}-questions.md"
    paths = glob.glob(os.path.join(glob.escape(os.path.join(intent_dir, PHASE_DIRS[phase])), slug, name)) + \
        glob.glob(os.path.join(glob.escape(os.path.join(intent_dir, PHASE_DIRS[phase])), "*", slug, name))
    if not paths:
        return None
    asked = answered = 0
    for path in paths:
        try:
            with open(path, encoding="utf-8", errors="replace") as fh:
                text = fh.read()
        except OSError:
            continue
        heads = list(QUESTION_HEAD.finditer(text))
        asked += len(heads)
        for i, h in enumerate(heads):
            body = text[h.end():heads[i + 1].start() if i + 1 < len(heads) else len(text)]
            tag = ANSWER_TAG.search(body)
            if tag and tag.group(1):
                answered += 1
    return asked, answered


def _load_json(path):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh), os.path.getmtime(path)
    except (OSError, ValueError):
        return None, None


def read_tests(ws):
    """Latest test run, from the files the app's test commands write (see the U1 functional spec):
    test-results/unit.json (Jest-compatible JSON), test-results/e2e.json (Playwright JSON reporter),
    coverage/coverage-summary.json (istanbul json-summary). Missing files mean "not run yet"."""
    out = {"unit": None, "e2e": None, "coverage": None, "coverageDetail": None, "failing": [], "updated": None}
    stamps = []

    unit, mt = _load_json(os.path.join(ws, "test-results", "unit.json"))
    if isinstance(unit, dict):
        out["unit"] = {"passed": unit.get("numPassedTests", 0), "failed": unit.get("numFailedTests", 0),
                       "total": unit.get("numTotalTests", 0)}
        stamps.append(mt)
        for f in unit.get("testResults") or []:
            for a in f.get("assertionResults") or []:
                if a.get("status") == "failed":
                    out["failing"].append("Unit: " + (a.get("fullName") or a.get("title") or "?"))

    e2e, mt = _load_json(os.path.join(ws, "test-results", "e2e.json"))
    if isinstance(e2e, dict):
        st = e2e.get("stats") or {}
        passed, failed = st.get("expected", 0) + st.get("flaky", 0), st.get("unexpected", 0)
        out["e2e"] = {"passed": passed, "failed": failed, "total": passed + failed + st.get("skipped", 0)}
        stamps.append(mt)

        def walk(suites, prefix):
            for s in suites or []:
                title = " › ".join(t for t in (prefix, s.get("title")) if t)
                for spec in s.get("specs") or []:
                    if not spec.get("ok", True):
                        out["failing"].append("Browser: " + " › ".join(t for t in (title, spec.get("title")) if t))
                walk(s.get("suites"), title)
        walk(e2e.get("suites"), "")

    cov, mt = _load_json(os.path.join(ws, "coverage", "coverage-summary.json"))
    if isinstance(cov, dict):
        tot = cov.get("total") or {}
        pct = (tot.get("lines") or {}).get("pct")
        if isinstance(pct, (int, float)):
            out["coverage"] = round(pct, 1)
            out["coverageDetail"] = {k: round(v["pct"], 1) for k, v in
                                     ((k, tot.get(k) or {}) for k in ("lines", "statements", "functions", "branches"))
                                     if isinstance(v.get("pct"), (int, float))}
            stamps.append(mt)

    if stamps:
        out["updated"] = datetime.fromtimestamp(max(stamps), timezone.utc).isoformat()
    out["failing"] = out["failing"][:8]
    return out


def is_work_event(e):
    """An event that only happens while the workflow runs: stages, gates, answers and files.
    Chat (HUMAN_TURN), sensors, subagent notices and compaction can happen while paused, so they don't count."""
    return bool(e) and (e.startswith(("STAGE_", "GATE_", "ARTIFACT_", "PHASE_", "UNIT_", "BOLT_"))
                        or e in ("QUESTION_ANSWERED", "DECISION_RECORDED"))


PARK_EVENTS = ("WORKFLOW_PARKED", "RUN_PARKED")
UNPARK_EVENTS = ("WORKFLOW_UNPARKED", "RUN_UNPARKED")


def pause_windows(events, now):
    """(start, end) of each run pause: a park (WORKFLOW_PARKED) to the next unpark, or now if still
    paused. A resume that wrote no unpark still ends the pause at the first work event after it. Every
    clock (run, stages, Bolt timers, cycle times) leaves these out, so a pause freezes all running ones
    at once and the resume restarts exactly those; a Bolt's own pause (UNIT_PAUSED) is separate."""
    wins, start = [], None
    for ts, ev in events:
        e = ev.get("Event")
        if e in PARK_EVENTS and start is None:
            start = ts
        elif start is not None and (e in UNPARK_EVENTS or is_work_event(e)):
            wins.append((start, ts))
            start = None
    if start is not None:
        wins.append((start, now))
    return wins, start is not None


# A follow-up piece of work (v2 onwards) has no workshop day, so its clocks count the hours worked
# only: a stretch of more than IDLE_MIN minutes with no AI-DLC activity (a night, a long break) is
# left out like a pause. The first piece of work (v1, the workshop day) keeps its clocks as they were.
IDLE_MIN = 60


def idle_windows(events, now=None):
    """(start, end) of each gap of more than IDLE_MIN minutes between AI-DLC events, and, for live
    work, from the last event to `now` once that is longer than IDLE_MIN."""
    limit = IDLE_MIN * 60
    times = [ts for ts, _ in events]
    wins = [(a, b) for a, b in zip(times, times[1:]) if (b - a).total_seconds() > limit]
    if now is not None and times and (now - times[-1]).total_seconds() > limit:
        wins.append((times[-1], now))
    return wins


def merge_windows(wins):
    """Overlapping or touching windows joined, so no second is left out twice."""
    out = []
    for s, e in sorted(wins):
        if out and s <= out[-1][1]:
            out[-1] = (out[-1][0], max(out[-1][1], e))
        else:
            out.append((s, e))
    return out


def first_intent(ws, name):
    """True for the first piece of work in the workspace (v1)."""
    lst = list_intents(ws)
    return not lst or lst[0]["name"] == name


def next_unit(bolts, events, approved, stage):
    """The Bolt a per-Unit stage is on when no Unit has an open span and the state names no Active
    Unit (between two Units): the first Bolt, in build order, not signed off that has not completed
    this stage yet, or whose Code Generation has run (a built Unit back for rework); else the first
    Bolt not signed off. Stage by stage, once U2's Functional Design completes that is U3, Not started."""
    done = {(ev.get("Stage"), ev.get("Unit")) for _, ev in events if ev.get("Event") == "UNIT_COMPLETED"}
    left = [x["unit"] for x in bolts if x["unit"] not in approved]
    return next((u for u in left if (stage, u) not in done or ("code-generation", u) in done),
                left[0] if left else None)


def snapshot(ws, want=None):
    now = datetime.now(timezone.utc)
    live_rec = find_intent(ws)
    found = (find_intent(ws, want) if want else None) or live_rec
    # An earlier piece of work is shown as it ended: its clocks stop at its last event.
    is_live = not found or not live_rec or found[3] == live_rec[3]
    plan, current, status_fields, events, intent_name, active_unit = {}, None, {}, [], None, None
    checkpoint_unit = completed_at = parallel_units = None
    if found:
        _, intent_dir, space, intent_name = found
        state = read_state(os.path.join(intent_dir, "aidlc-state.md"))
        for box, slug, action in STAGE_LINE.findall(state):
            plan[slug] = {"action": action, "box": BOX.get(box, "pending")}
        cs = state.split("## Current Status", 1)
        if len(cs) == 2:
            for m in STATUS_FIELD.finditer(cs[1].split("\n## ", 1)[0]):
                status_fields[m["k"].strip()] = m["v"].strip()
        current = status_fields.get("Current Stage")
        # One Unit at a time: Current Stage stays on the first per-Unit stage until every Unit
        # has passed it, and the Unit's own step is in Active Unit / Unit Stage / Unit State.
        unit_fields = {m["k"].strip(): m["v"].strip() for m in STATUS_FIELD.finditer(state)
                       if m["k"].strip() in ("Active Unit", "Unit Stage", "Unit State")}
        if unit_fields.get("Unit Stage") and unit_fields.get("Unit State", "").lower() in ("in-progress", "running", "paused"):
            current, active_unit = unit_fields["Unit Stage"], unit_fields.get("Active Unit")
            if plan.get(current, {}).get("box") == "pending":
                plan[current]["box"] = "running"
        events = expand_swarm(parse_events(intent_dir))
        if status_fields.get("Status", "").lower().startswith("completed"):
            completed_at = next((ts for ts, ev in reversed(events) if ev.get("Event") == "WORKFLOW_COMPLETED"), None)
        # A built Unit waiting for its checkpoint sign-off has no Active Unit in the state:
        # Code Generation completed it, and only a GATE_APPROVED naming the Unit signs it off.
        # A parallel batch building, or built and waiting for its one sign-off.
        running = parallel_running(events) if not active_unit else None
        if running:
            current, parallel_units = running[1], running[2]
            active_unit = parallel_units[0]
            if plan.get(current, {}).get("box") == "pending":
                plan[current]["box"] = "running"
        elif not active_unit:
            pending = checkpoint_pending(events)
            if pending:
                current, active_unit, checkpoint_unit = "code-generation", pending[-1], pending[-1]
                parallel_units = pending if len(pending) > 1 else None
                if plan.get(current, {}).get("box") == "pending":
                    plan[current]["box"] = "gate"
    else:
        intent_dir = None

    stage_events = {}
    for ts, ev in events:
        stage_events.setdefault(ev.get("Stage", ""), []).append((ts, ev))
    # Every clock (stages, Bolts, the day, tokens) runs to `clock`: now, or the completion,
    # or for an earlier piece of work its last event.
    clock = completed_at or (now if is_live or not events else events[-1][0])
    pauses, paused = pause_windows(events, clock)
    followup = bool(found) and not first_intent(ws, intent_name)
    idle = False
    if followup:
        idle = is_live and bool(events) and (clock - events[-1][0]).total_seconds() > IDLE_MIN * 60
        pauses = merge_windows(pauses + idle_windows(events, clock if is_live else None))

    # Construction, stage by stage: delivery.stage_windows shares its time between Functional Design
    # and Code Generation (their stage times and tokens), and delivery.bolt_tracks is each Bolt's own
    # time: its row, its Bolt timer and its cycle time. A Bolt is shown with the stage it is in.
    levels = unit_levels(unit_deps(intent_dir)) if intent_dir else {}
    unit_windows = stage_windows(events, clock, PER_UNIT, levels)
    tracks = bolt_tracks(events, levels, clock)
    if current in PER_UNIT and unit_windows and unit_windows[-1][2] >= clock and unit_windows[-1][0] != current:
        # Stage by stage, Current Stage can lag (U1 planning its build while it still says Functional
        # Design): the Now card shows the stage the time is going to, so its timer always runs.
        current = unit_windows[-1][0]
        if plan.get(current, {}).get("box") == "pending":
            plan[current]["box"] = "running"
    bolt, b, unit, unit_since, bolt_wins = None, None, None, None, []
    bolts = bolt_plan(intent_dir) if intent_dir else []
    if bolts and current in PER_UNIT:
        approved = {u for u, t in tracks.items() if t["status"] == "done"}
        here = [x["unit"] for x in bolts if tracks.get(x["unit"], {}).get("status") == "running"
                and tracks[x["unit"]]["stage"] == current]
        if not parallel_units and not checkpoint_unit and len(here) > 1 and (not active_unit or active_unit in here):
            parallel_units = here  # a batch planning or building together
        if active_unit and not checkpoint_unit and here and tracks.get(active_unit, {}).get("status") != "running":
            # The state's Active Unit is paused on its own while other Bolts are In progress: show those.
            active_unit, parallel_units = here[0], (here if len(here) > 1 else None)
        if parallel_units and not checkpoint_unit:
            # A Bolt of the batch paused on its own (UNIT_PAUSED) drops out of the batch's timer.
            parallel_units = [u for u in parallel_units if u in here] or parallel_units
            if active_unit not in parallel_units:
                active_unit = parallel_units[0]
        unit = active_unit or (here[0] if here else next_unit(bolts, events, approved, current))
        b = next((x for x in bolts if x["unit"] == unit), None)
        group = [x for x in bolts if x["unit"] in (parallel_units or [])]
        if len(group) > 1:
            # Bolts built in parallel: one line for the whole batch.
            b = {**group[0], "n": ", ".join(str(x["n"]) for x in group),
                 "name": " · ".join(x["name"] for x in group), "label": ", ".join(x["label"] for x in group),
                 "timebox": max((x.get("timebox") or 0) for x in group) or None, "units": [x["unit"] for x in group]}
        if b:
            mine = b.get("units", [unit])
            if checkpoint_unit:
                marks = [t for t, ev in events if ev.get("Unit") == unit and ev.get("Event") == "UNIT_COMPLETED"
                         and ev.get("Stage") == "code-generation"]
                unit_since = max(marks) if marks else None
            else:
                # The Bolt timer: this pass of the Bolt(s) through the current stage, from its start
                # (bolt_tracks' since), its paused stretches left out; it runs while the Bolt is In progress.
                sinces = [tracks[u]["since"].get(current) for u in mine if u in tracks
                          and tracks[u]["status"] == "running" and tracks[u]["stage"] == current]
                sinces = [x for x in sinces if x]
                if sinces:
                    unit_since = min(sinces)
                    bolt_wins = [(max(ws_, unit_since), we) for u in mine if u in tracks
                                 for ws_, we in tracks[u]["windows"] if we > unit_since]

    windows = []
    stages = []
    for slug, num, name, ph, box, note, star in STAGES:
        p = plan.get(slug)
        run = (p["action"] == "EXECUTE") if p else (slug in WORKSHOP_RUN)
        status = p["box"] if p else "pending"
        if not run:
            status = "skipped"
        evs = stage_events.get(slug, [])
        starts = [t for t, e in evs if e.get("Event") == "STAGE_STARTED"]
        dones = [t for t, e in evs if e.get("Event") == "STAGE_COMPLETED"]
        start = starts[0] if starts else (evs[0][0] if evs else None)
        end = dones[-1] if dones and status == "done" else None
        active = ((end or clock) - start).total_seconds() - paused_sec(pauses, start, end or clock) \
            if start and status != "pending" else None
        own = [(s, e) for st, s, e in unit_windows if st == slug]
        if own:
            # A per-Unit stage's time is its share of Construction (stage_windows), whatever its box
            # says: stage by stage, AI-DLC puts Code Generation back to pending while Units are designed.
            start, active = min(s for s, _ in own), covered_sec(own, pauses, clock)
        elapsed = active / 60 if active is not None else None
        qa = stage_questions(intent_dir, slug, ph)
        if run and start and status != "pending":
            windows.append((slug, start, end))
        stages.append({
            "slug": slug, "num": num, "name": name, "phase": ph, "run": run, "status": status,
            "timebox": box, "note": note, "star": star,
            "start": start.isoformat() if start else None,
            "elapsed": round(elapsed, 1) if elapsed is not None else None,
            "activeSec": round(active) if active is not None else None,
            "questions": qa[0] if qa else 0,
            "answered": qa[1] if qa else 0,
            "rounds": sum(1 for _, e in evs if e.get("Event") == "GATE_REJECTED"),
            "reviews": sum(1 for _, e in evs if e.get("Event") == "REVIEW_COMPLETED"),
            "tokens": None,
        })

    # A per-Unit stage's tokens are those spent in its share of Construction, the same windows as its
    # time; its stage-wide window spans every Bolt and would swallow the other stage's tokens.
    if unit_windows:
        windows = [w for w in windows if w[0] not in PER_UNIT] + list(unit_windows)
        windows.sort(key=lambda w: w[1])
    # Tokens of this AI-DLC run only (Claude Code session logs, run window, pauses left out).
    usage = run_tokens(ws, events[0][0] if events else None, clock, windows, pauses,
                       run_sessions(ev for _, ev in events))
    for s in stages:
        s["tokens"] = (usage or {}).get("byStage", {}).get(s["slug"])

    if bolts:
        for s in stages:
            if s["slug"] in PER_UNIT:
                s["units"] = {"done": len({ev.get("Unit") for _, ev in events if ev.get("Event") == "UNIT_COMPLETED"
                                           and ev.get("Stage") == s["slug"] and ev.get("Unit")}), "total": len(bolts)}
    if b:
        active = covered_sec(bolt_wins, pauses, clock) if unit_since and not checkpoint_unit else \
            ((clock - unit_since).total_seconds() - paused_sec(pauses, unit_since, clock)) if unit_since else None
        per_fd = max(1, round(STAGE_BOX["functional-design"] / len(bolts)))
        bolt = {**b, "total": len(bolts), "started": bool(unit_since), "signoff": bool(checkpoint_unit),
                "stageStart": unit_since.isoformat() if unit_since else None,
                "stageActiveSec": round(active) if active is not None else None,
                "stageTimebox": None if checkpoint_unit else (b["timebox"] if current == "code-generation" else per_fd)}

    dl = delivery(ws, intent_dir, events, TRACKER, pauses, clock, tracks, until=None if is_live else clock)
    row = next((r for r in (dl or {}).get("rows", []) if bolt and r["unit"] == bolt["unit"]), None)
    intents = list_intents(ws)
    if dl is not None:
        # The Bolts of earlier pieces of work stay in the table, as they ended, above this one's.
        mine = next((x for x in intents if x["name"] == intent_name), None)
        dl["earlier"] = [{"label": x["label"], "name": x["name"], "rows": e["rows"], "bolts": e["bolts"]}
                         for x in intents if mine and x["start"] < mine["start"]
                         for e in [ended_delivery(ws, x["dir"])] if e and e["rows"]]

    # What is happening right now in the current stage.
    activity = "Waiting to start"
    cur = next((s for s in stages if s["slug"] == current), None)
    if cur is None:
        cur = next((s for s in stages if s["status"] in ("running", "gate", "revising")), None)
    if cur:
        evs = stage_events.get(cur["slug"], [])
        if bolt:  # only this Unit's pass through the stage
            evs = [e for e in evs if unit_since and e[0] >= unit_since]
        last_q = max((t for t, e in evs if e.get("Event") in ("QUESTION_ASKED", "QUESTION_SHOWN", "DECISION_RECORDED")), default=None)
        last_a = max((t for t, e in evs if e.get("Event") in ("QUESTION_ANSWERED", "QUESTION_REPLIED")), default=None)
        last_rr = max((t for t, e in evs if e.get("Event") == "REVIEW_REQUESTED"), default=None)
        last_rc = max((t for t, e in evs if e.get("Event") == "REVIEW_COMPLETED"), default=None)
        if cur["status"] == "gate":
            activity = "Gate open: team reviews the output and decides"
        elif cur["status"] == "revising":
            activity = "AI is revising after the team's change request"
        elif last_rr and (not last_rc or last_rc < last_rr):
            activity = "Specialist review in progress"
        elif last_q and (not last_a or last_a < last_q):
            activity = "Waiting for the team's answers"
        else:
            activity = "AI is working"
    if bolt and bolt["signoff"]:
        activity = (f"Bolts {bolt['n']} sign-off: the team tries {bolt['label']} in the browser and approves them together"
                    if bolt.get("units") else f"Bolt {bolt['n']} sign-off: the team tries {bolt['label']} in the browser and approves it")
    elif bolt and not bolt["started"] and row and row["status"] == "paused":
        activity = f"Bolt {bolt['n']} paused: {row['waiting']}"
    elif bolt and not bolt["started"]:
        activity = f"Starting Bolt {bolt['n']}: {bolt['name']} ({bolt['label']})"
    if paused:
        activity = "Paused: clocks stopped until the workflow resumes"
    elif idle and not completed_at:
        activity = f"Idle: no AI-DLC activity for over {IDLE_MIN} minutes, so the clocks are stopped until work resumes"
    if not is_live and events:
        activity = f"Earlier piece of work: shown as it stood at its last step ({clock:%d %b %H:%M} UTC)"
    if status_fields.get("Status", "").lower().startswith("completed"):
        activity = "Workflow complete"

    feed = []
    for ts, ev in reversed(events):
        d = describe(ev)
        if not d:
            continue
        st = next((s for s in STAGES if s[0] == ev.get("Stage")), None)
        feed.append({"time": ts.isoformat(), "text": d[0], "detail": d[1],
                     "stage": f"{st[1]} {st[2]}" if st else ""})
        if len(feed) >= 14:
            break

    run_start = events[0][0] if events else None
    run_min = ((clock - run_start).total_seconds() - paused_sec(pauses, run_start, clock)) / 60 if run_start else 0
    # Run time no stage covers: real gaps between stages (a gate approved before the next stage starts).
    # Its own row, so the stage times and it add up to the run time.
    # Shown as the run time less the stage times as shown, so the figures on the page add up exactly.
    outside = max(0, round(run_min * 60) - sum(s["activeSec"] or 0 for s in stages)) if run_start else None

    return {
        "now": now.isoformat(),
        "workspace": os.path.basename(ws),
        "intent": intent_name,
        "live": is_live,
        "intents": [{"name": x["name"], "label": x["label"], "live": x["live"]} for x in intents],
        "started": bool(found),
        "phases": PHASES,
        "phaseState": status_fields.get("Lifecycle Phase"),
        "workflowStatus": status_fields.get("Status"),
        "current": cur["slug"] if cur else None,
        "activeUnit": active_unit if cur and cur["slug"] == current else None,
        "bolt": bolt,
        "activity": activity,
        "paused": paused,
        "stopped": paused or idle or bool(completed_at) or not is_live,  # the page stops advancing its clocks
        "stages": stages,
        "outside": {"activeSec": outside, "elapsed": round(outside / 60, 1)} if outside is not None else None,
        "lastEvent": events[-1][0].isoformat() if events else None,
        "feed": feed,
        "tokens": (usage or {}).get("total"),
        "tokensByModel": (usage or {}).get("byModel"),
        # An earlier piece of work: its own last run, kept by remember_results (later runs overwrite the files).
        "tests": read_tests(ws) if is_live else (TRACKER.results_for(intent_name) if TRACKER else None),
        "delivery": dl,
        # v2 onwards: hours worked only, with no workshop-day length.
        "day": {"elapsed": round(run_min + KICKOFF_MIN if run_start else 0, 1), "length": None if followup else DAY_MIN,
                "activeSec": round((run_min + KICKOFF_MIN) * 60) if run_start else 0,
                "runStart": run_start.isoformat() if run_start else None},
        "output": latest_output(ws, intent_dir, record_only=not is_live),
    }


LAST_GOOD = {}  # piece of work asked for (None: the live one) -> its last good snapshot
SNAP_LOCK = threading.Lock()


def safe_snapshot(ws, want=None):
    """snapshot(), never empty or partial: on any error the last good snapshot, marked stale with the
    error (the page keeps its figures and shows a small mark), and the traceback on the console."""
    with SNAP_LOCK:  # one at a time: polls never interleave their reads of the record
        try:
            snap = snapshot(ws, want)
            LAST_GOOD[want] = snap
            return snap
        except Exception as exc:
            log("snapshot failed, serving the last good one:\n" + traceback.format_exc().rstrip())
            if LAST_GOOD.get(want):
                return {**LAST_GOOD[want], "stale": True, "error": f"{type(exc).__name__}: {exc}"}
            return {"error": f"{type(exc).__name__}: {exc}", "started": False}


class Handler(SimpleHTTPRequestHandler):
    ws = "."

    def log_message(self, *args):
        pass

    def send_body(self, code, body, ctype):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        url = urlparse(self.path)
        path = unquote(url.path)
        want = (parse_qs(url.query).get("intent") or [None])[0]  # a piece of work; none: the live one
        if path in ("/", "/index.html"):
            with open(os.path.join(HERE, "index.html"), "rb") as fh:
                return self.send_body(200, fh.read(), "text/html; charset=utf-8")
        if path == "/api/state":
            return self.send_body(200, json.dumps(safe_snapshot(self.ws, want)).encode(), "application/json")
        if path == "/api/files":
            try:
                return self.send_body(200, json.dumps(list_files(self.ws, want)).encode(), "application/json")
            except Exception as exc:
                return self.send_body(500, json.dumps({"error": str(exc)}).encode(), "application/json")
        if path.startswith("/ws/"):
            target = os.path.realpath(os.path.join(self.ws, path[4:]))
            if not target.startswith(os.path.realpath(self.ws) + os.sep) or not os.path.isfile(target):
                return self.send_body(404, b"not found", "text/plain")
            ext = os.path.splitext(target)[1].lower()
            ctype = {".html": "text/html", ".htm": "text/html", ".css": "text/css",
                     ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png",
                     ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".json": "application/json"
                     }.get(ext, "text/plain")
            with open(target, "rb") as fh:
                return self.send_body(200, fh.read(), ctype + ("; charset=utf-8" if ctype.startswith("text") else ""))
        return self.send_body(404, b"not found", "text/plain")


def find_workspace():
    """The AI-DLC workspace when none is given: the current folder, the folder holding
    tools/, or a workspace folder beside tools/ (table-order-dryrun first)."""
    up = os.path.abspath(os.path.join(HERE, "..", ".."))
    beside = sorted(os.path.join(up, d) for d in os.listdir(up) if d != "table-order-dryrun")
    for cand in [os.getcwd(), up, os.path.join(up, "table-order-dryrun")] + beside:
        if os.path.isdir(os.path.join(cand, "aidlc")) or os.path.isdir(os.path.join(cand, ".claude")):
            return os.path.abspath(cand)
    return None


def open_browser(url):
    """Open the dashboard in its own Chrome (or Edge) window, else the default browser."""
    import subprocess
    import webbrowser
    try:
        if sys.platform == "darwin":
            for app in ("Google Chrome", "Microsoft Edge"):
                if subprocess.run(["open", "-na", app, "--args", "--new-window", url],
                                  stderr=subprocess.DEVNULL).returncode == 0:
                    return
        elif sys.platform == "win32":
            import winreg
            for exe in ("chrome.exe", "msedge.exe"):
                for hive in (winreg.HKEY_CURRENT_USER, winreg.HKEY_LOCAL_MACHINE):
                    try:
                        key = rf"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\{exe}"
                        path = winreg.QueryValue(hive, key)
                    except OSError:
                        continue
                    if path and os.path.isfile(path.strip('"')):
                        subprocess.Popen([path.strip('"'), "--new-window", url])
                        return
    except OSError:
        pass
    webbrowser.open_new(url)


def main(argv):
    port = 8787
    if "--port" in argv:
        i = argv.index("--port")
        port = int(argv[i + 1])
        argv = argv[:i] + argv[i + 2:]
    want_open = "--open" in argv
    argv = [a for a in argv if a != "--open"]
    ws = os.path.abspath(argv[0]) if argv else find_workspace()
    if not ws or not os.path.isdir(ws):
        sys.exit(f"Workspace not found: {ws or 'none found'}. "
                 "Run this from the workspace folder, or pass its path.")
    Handler.ws = ws
    global TRACKER
    TRACKER = Tracker(ws, find_intent, lambda d: expand_swarm(parse_events(d)),
                      on_poll=lambda: remember_results(ws)).start()
    try:
        srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    except OSError:
        sys.exit(f"Port {port} is in use: the dashboard may already be running at "
                 f"http://127.0.0.1:{port}/ (or pass --port <other>).")
    url = f"http://127.0.0.1:{port}/"
    print(f"Dashboard for {ws}\nOpen {url}   (Ctrl+C to stop)")
    if want_open:
        open_browser(url)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main(sys.argv[1:])
