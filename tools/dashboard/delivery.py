"""Delivery numbers for the dashboard's Delivery strip.

Stories, Units and Bolts come from the AI-DLC record (stories.md, the Unit story map,
bolt-plan.md) and the audit trail (UNIT_STARTED / UNIT_COMPLETED). Tests and lines of
code come from the workspace: tests/<uN>/ and e2e/<uN>/ hold each Unit's tests, and the
test commands write test-results/unit.json and test-results/e2e.json.

Issues need history, which one test-results file cannot give: a background poller
remembers every test's last result, and counts a test that fails as an issue found and
the same test passing later as that issue fixed. It also notes each Unit's line counts
when its Code Generation starts and ends. That history lives beside this file in
.history/, never in the workspace, so the dashboard stays read-only there. Runs made
while the dashboard is closed are not seen; their final results still are.
"""
import json
import os
import re
import subprocess
import threading
import time
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
CODE_EXT = {".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".css", ".html", ".sql"}
SRC_ROOTS = ("server", "client", "src", "tests", "e2e")
TEST_ROOTS = {"tests", "e2e"}
SKIP_DIRS = {"node_modules", "dist", "build", "coverage", "test-results", "data", ".git", "public"}

STORY_HEAD = re.compile(r"^#{2,4}\s+(US\d+\.\d+)\b", re.M)
STORY_ROW = re.compile(r"^\|\s*(US\d+\.\d+)\s*\|([^|]*)\|", re.M)
BOLT_ROW = re.compile(r"^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*(U\d+)\s*`([a-z0-9-]+)`\s*\|([^\n]*)$", re.M)
UNIT_CASE = re.compile(r"^\s*(?:it|test)(?:\.(?:only|concurrent|fails))?\s*\(", re.M)
E2E_CASE = re.compile(r"^\s*test(?:\.only)?\s*\(\s*['\"`]", re.M)


def _read(path):
    try:
        with open(path, encoding="utf-8", errors="replace") as fh:
            return fh.read()
    except OSError:
        return ""


def _load_json(path):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh), os.path.getmtime(path)
    except (OSError, ValueError):
        return None, None


def _prefix(slug):
    m = re.match(r"(u\d+)", slug or "")
    return m.group(1) if m else slug


def _lines(path):
    try:
        with open(path, encoding="utf-8", errors="replace") as fh:
            return sum(1 for line in fh if line.strip())
    except OSError:
        return 0


def _walk_code(root):
    for dirpath, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
        for fn in files:
            if os.path.splitext(fn)[1].lower() in CODE_EXT:
                yield os.path.join(dirpath, fn)


def loc_snapshot(ws):
    """Non-blank lines per source file: the source folders plus code files at the root."""
    out = {}
    for top in SRC_ROOTS:
        root = os.path.join(ws, top)
        if os.path.isdir(root):
            for p in _walk_code(root):
                out[os.path.relpath(p, ws).replace(os.sep, "/")] = _lines(p)
    try:
        for fn in os.listdir(ws):
            p = os.path.join(ws, fn)
            if os.path.isfile(p) and os.path.splitext(fn)[1].lower() in CODE_EXT:
                out[fn] = _lines(p)
    except OSError:
        pass
    return out


def _unit_dirs(ws, top, prefix):
    """A Unit's test folders under top: <uN>/ and <uN>-<name>/ (the team's e2e/<unit>/ layout)."""
    base = os.path.join(ws, top)
    try:
        names = os.listdir(base)
    except OSError:
        return []
    return [os.path.join(base, n) for n in names
            if (n == prefix or n.startswith(prefix + "-")) and os.path.isdir(os.path.join(base, n))]


def _count_cases(ws, top, prefix, pattern):
    return sum(len(pattern.findall(_read(p))) for root in _unit_dirs(ws, top, prefix) for p in _walk_code(root))


def bolt_plan(intent_dir):
    """Bolts in build order from bolt-plan.md: n, name, Unit label and slug, Code Generation timebox."""
    text = _read(os.path.join(intent_dir, "inception", "delivery-planning", "bolt-plan.md")) if intent_dir else ""
    out = []
    for n, name, label, slug, rest in BOLT_ROW.findall(text):
        m = re.search(r"(\d+)\s*min", rest)
        out.append({"n": int(n), "name": name.strip(), "label": label, "unit": slug,
                    "timebox": int(m.group(1)) if m else None})
    return out


def _unit_test_results(ws, data):
    """(id, unit prefix, title, status) for each Vitest/Jest assertion in unit.json."""
    for f in data.get("testResults") or []:
        path = os.path.relpath(f.get("name") or "", ws).replace(os.sep, "/")
        m = re.search(r"(?:^|/)tests/(u\d+)(?:-[a-z0-9-]*)?/", path)
        for a in f.get("assertionResults") or []:
            status = a.get("status")
            if status not in ("passed", "failed"):
                continue
            title = a.get("fullName") or a.get("title") or "?"
            yield f"{path} > {title}", m.group(1) if m else None, title, status


def _e2e_results(data):
    """(id, unit prefix, title, status) for each Playwright spec in e2e.json."""
    def walk(suites, prefix):
        for s in suites or []:
            title = " › ".join(t for t in (prefix, s.get("title")) if t)
            for spec in s.get("specs") or []:
                results = [r for t in spec.get("tests") or [] for r in t.get("results") or []]
                if results and all(r.get("status") == "skipped" for r in results):
                    continue
                file = (spec.get("file") or s.get("file") or "").replace("\\", "/")
                m = re.match(r"(u\d+)(?:-[a-z0-9-]*)?/", file)
                name = " › ".join(t for t in (title, spec.get("title")) if t)
                yield f"e2e/{file} > {name}", m.group(1) if m else None, name, \
                    "passed" if spec.get("ok", True) else "failed"
            yield from walk(s.get("suites"), title)
    yield from walk(data.get("suites"), "")


class Tracker:
    """Background poller that keeps test and line-count history for one workspace."""

    def __init__(self, ws, find_intent, parse_events, every=3.0, on_poll=None):
        self.ws, self.find_intent, self.parse_events, self.every = ws, find_intent, parse_events, every
        self.on_poll = on_poll  # called after each poll, outside the lock (the server files test results)
        safe = re.sub(r"[^A-Za-z0-9]+", "-", os.path.abspath(ws)).strip("-")[-120:]
        self.path = os.path.join(HERE, ".history", safe + ".json")
        self.lock = threading.Lock()
        # results: record name -> the last test results of that piece of work (the files hold only the newest run)
        self.state = {"tests": {}, "issues": [], "seen": {}, "loc": {}, "accept": {}, "results": {}}
        data, _ = _load_json(self.path)
        if isinstance(data, dict):
            self.state.update({k: data[k] for k in self.state if k in data})

    def start(self):
        threading.Thread(target=self._loop, daemon=True).start()
        return self

    def _loop(self):
        while True:
            try:
                self.poll()
            except Exception as exc:  # a half-written results file; try again next round
                print(f"Delivery history: {exc}")
            time.sleep(self.every)

    def _save(self):
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        tmp = self.path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(self.state, fh)
        os.replace(tmp, self.path)

    def _record(self, kind, results, at):
        tests, issues = self.state["tests"], self.state["issues"]
        for tid, unit, title, status in results:
            tests[tid] = {"kind": kind, "unit": unit, "status": status, "at": at}
            open_issue = next((i for i in issues if i["id"] == tid and not i["fixed"]), None)
            if status == "failed" and not open_issue:
                issues.append({"id": tid, "kind": kind, "unit": unit, "title": title, "found": at, "fixed": None})
            elif status == "passed" and open_issue:
                open_issue["fixed"] = at

    def poll(self):
        changed = False
        with self.lock:
            seen = self.state["seen"]
            for kind, rel_path, reader in (("unit", "test-results/unit.json", lambda d: _unit_test_results(self.ws, d)),
                                           ("e2e", "test-results/e2e.json", _e2e_results)):
                data, mt = _load_json(os.path.join(self.ws, *rel_path.split("/")))
                if isinstance(data, dict) and mt and mt != seen.get(kind):
                    at = datetime.fromtimestamp(mt, timezone.utc).isoformat()
                    self._record(kind, list(reader(data)), at)
                    seen[kind] = mt
                    changed = True

            found = self.find_intent(self.ws)
            if found:
                now = datetime.now(timezone.utc)
                events = self.parse_events(found[1])
                for slug, (start, done) in unit_code_windows(events).items():
                    loc = self.state["loc"].setdefault(slug, {})
                    # A start baseline only counts if taken as the build began, not mid-build.
                    if start and not done and "start" not in loc and (now - start).total_seconds() < 90:
                        loc["start"], changed = loc_snapshot(self.ws), True
                    if done and "start" in loc and "end" not in loc:
                        loc["end"], changed = loc_snapshot(self.ws), True
                    # AI line acceptance: the lines the AI wrote, as the build finished, and which
                    # of them are still there at sign-off. Taken only as it happens, never later.
                    acc = self.state["accept"].setdefault(slug, {})
                    if done and "built" not in acc and (now - done).total_seconds() < 120:
                        acc["built"], changed = _line_hashes(self.ws, _manifest_paths(found[1], self.ws, slug)), True
            if changed:
                self._save()
        if self.on_poll:
            self.on_poll()

    def keep_results(self, name, results):
        """File a test run's results under the piece of work it belongs to."""
        with self.lock:
            if self.state["results"].get(name, {}).get("updated") != results.get("updated"):
                self.state["results"][name] = results
                self._save()

    def results_for(self, name):
        with self.lock:
            r = self.state["results"].get(name)
            return json.loads(json.dumps(r)) if r else None

    def view(self):
        with self.lock:
            return json.loads(json.dumps(self.state))


def _unit_list(value):
    """'u2-a,u3-b' or '[u2-a, u3-b]' -> ['u2-a', 'u3-b']."""
    return [u.strip() for u in (value or "").strip("[]").split(",") if u.strip()]


PER_UNIT_STAGES = ("functional-design", "code-generation")


def paused_sec(pauses, a, b):
    """Seconds of [a, b] that fall inside a pause. The one pause rule every clock uses."""
    return sum(max(0.0, (min(b, e) - max(a, s)).total_seconds()) for s, e in pauses)


def covered_sec(wins, pauses, clock):
    """Active seconds covered by at least one window [(start, end or None)], pauses left out:
    a per-Unit stage's time is the time any of its Units' passes ran, never counted twice."""
    total, cur = 0.0, None
    for s, e in sorted((s, e or clock) for s, e in wins if s):
        if cur and s <= cur[1]:
            cur = (cur[0], max(cur[1], e))
            continue
        if cur:
            total += (cur[1] - cur[0]).total_seconds() - paused_sec(pauses, *cur)
        cur = (s, e)
    if cur:
        total += (cur[1] - cur[0]).total_seconds() - paused_sec(pauses, *cur)
    return total


FD, CG = PER_UNIT_STAGES
UNIT_MARKS = ("UNIT_STARTED", "UNIT_RESUMED", "UNIT_PAUSED", "UNIT_COMPLETED")


def stage_windows(events, clock, stages=PER_UNIT_STAGES, levels=None):
    """[(stage, start, end)]: how the per-Unit stages share Construction time, the windows their stage
    times and tokens use. Stage by stage, AI-DLC moves between Functional Design and Code Generation
    Unit by Unit without a stage event at each switch, so the time from the first per-Unit stage's
    start to the next stage's start (or clock) is cut at every mark, and each stretch goes to:
      - the stage of a Unit span open in it (UNIT_STARTED / RESUMED to UNIT_PAUSED / COMPLETED);
      - else Code Generation while a built Unit waits for its sign-off (its checkpoint, rework included);
      - else Code Generation while a first-batch Unit (the walking skeleton, levels: unit_levels) is
        designed and goes straight on to its build: its planning and plan approval;
      - else the stage last started (STAGE_STARTED).
    Only what has happened by then decides a stretch, never a later mark, so a stage's time never
    moves after the fact. Every minute of Construction lands in exactly one stage."""
    stages = tuple(x for x in PER_UNIT_STAGES if x in stages)  # in run order, whatever was passed
    first = next((ts for ts, ev in events if ev.get("Event") == "STAGE_STARTED" and ev.get("Stage") in stages), None)
    if first is None:
        return []
    end = next((ts for ts, ev in events if ts > first and ev.get("Event") == "STAGE_STARTED"
                and ev.get("Stage") and ev.get("Stage") not in stages), None) or clock
    last = [(ts, ev) for ts, ev in events if first <= ts <= end and ev.get("Stage") in stages
            and ev.get("Event") in ("STAGE_STARTED", "STAGE_COMPLETED")]
    if last and last[-1][1].get("Event") == "STAGE_COMPLETED" and last[-1][1].get("Stage") == stages[-1]:
        end = min(end, last[-1][0])  # the last per-Unit stage is done: what follows is between stages
    marks = [(ts, ev) for ts, ev in events if first <= ts <= end and ev.get("Stage") in stages
             and (ev.get("Event") in ("STAGE_STARTED", "STAGE_COMPLETED")
                  or (ev.get("Event") in UNIT_MARKS + ("GATE_APPROVED",) and ev.get("Unit")))]
    levels = levels or {}
    out, open_, built, designed, last_stage, i = [], {}, set(), set(), stages[0], 0
    cuts = sorted({first, end} | {ts for ts, _ in marks})
    for a, b in zip(cuts, cuts[1:]):
        while i < len(marks) and marks[i][0] <= a:
            ts, ev = marks[i]
            i += 1
            e, st, u = ev["Event"], ev.get("Stage"), ev.get("Unit")
            if e == "STAGE_STARTED":
                last_stage = st
            elif e in ("UNIT_STARTED", "UNIT_RESUMED"):
                open_[(st, u)] = ts
                built.discard(u)
                designed.discard(u)
            elif e == "UNIT_PAUSED":
                open_.pop((st, u), None)
            elif e == "UNIT_COMPLETED":
                open_.pop((st, u), None)
                if st == CG:
                    built.add(u)
                    designed.discard(u)
                elif st == FD and levels.get(u) == 1:
                    designed.add(u)
            elif e == "GATE_APPROVED":
                built.discard(u)
        if open_:
            stage = max(open_.items(), key=lambda kv: kv[1])[0][0]
        elif built or designed:
            stage = CG
        else:
            stage = last_stage
        if out and out[-1][0] == stage and out[-1][2] == a:
            out[-1] = (stage, out[-1][1], b)
        else:
            out.append((stage, a, b))
    return out


def expand_swarm(events):
    """Parallel Construction (AI-DLC's swarm) records batches, not Units: SWARM_STARTED names
    the batch's Units, each Unit lands with SWARM_SOURCE_MERGED, and one checkpoint approves the
    whole batch. Add the per-Unit events one-at-a-time Construction would have written, so every
    figure works the same: UNIT_STARTED at the batch start, UNIT_COMPLETED at the merge,
    GATE_APPROVED per Unit, UNIT_PAUSED for a failed Unit. Functional Design runs one Unit at a
    time and AI-DLC marks it itself; nothing is added for it, so no Unit starts before its own mark.
    Events already present are never duplicated. events: [(ts, fields)], sorted."""
    have = {(ev.get("Event"), ev.get("Stage"), ev.get("Unit")) for _, ev in events}
    extra, batch_stage = [], {}

    def add(ts, event, stage, unit, **more):
        if (event, stage, unit) not in have:
            have.add((event, stage, unit))
            extra.append((ts, {"Event": event, "Stage": stage, "Unit": unit, "_synthetic": "1", **more}))

    for ts, ev in events:
        e = ev.get("Event")
        if e == "SWARM_STARTED":
            for u in _unit_list(ev.get("Unit names")):
                batch_stage[u] = ev.get("Stage") or "code-generation"
                add(ts, "UNIT_STARTED", batch_stage[u], u)
        elif e == "SWARM_SOURCE_MERGED" and ev.get("Unit name"):
            u = ev["Unit name"]
            add(ts, "UNIT_COMPLETED", batch_stage.get(u, "code-generation"), u, **{"Merge commit": ev.get("Merge commit", "")})
        elif e == "SWARM_UNIT_FAILED" and ev.get("Unit name"):
            extra.append((ts, {"Event": "UNIT_PAUSED", "Stage": batch_stage.get(ev["Unit name"], "code-generation"),
                               "Unit": ev["Unit name"], "_synthetic": "1"}))
        elif e == "GATE_APPROVED" and not ev.get("Unit") and ev.get("Units"):
            for u in _unit_list(ev.get("Units")):
                extra.append((ts, {"Event": "GATE_APPROVED", "Stage": ev.get("Stage") or "code-generation",
                                   "Unit": u, "_synthetic": "1"}))
    return sorted(events + extra, key=lambda x: x[0])


def merge_commits(events):
    """unit slug -> merge commit of its parallel build (SWARM_SOURCE_MERGED)."""
    return {ev["Unit name"]: ev.get("Merge commit") for _, ev in events
            if ev.get("Event") == "SWARM_SOURCE_MERGED" and ev.get("Unit name") and ev.get("Merge commit")}


def _commit_lines(ws, commit):
    """Code lines a commit added (git numstat), or None when git cannot tell."""
    try:
        out = subprocess.run(["git", "-C", ws, "show", "--numstat", "--format=", commit],
                             capture_output=True, text=True, timeout=10)
    except (OSError, subprocess.SubprocessError):
        return None
    if out.returncode != 0:
        return None
    total = 0
    for line in out.stdout.splitlines():
        parts = line.split("\t")
        if len(parts) == 3 and parts[0].isdigit() and os.path.splitext(parts[2])[1].lower() in CODE_EXT:
            total += int(parts[0])
    return total


def unit_code_windows(events):
    """unit slug -> (latest Code Generation start, its completion or None)."""
    out = {}
    for ts, ev in events:
        if ev.get("Stage") != "code-generation" or not ev.get("Unit"):
            continue
        start, done = out.get(ev["Unit"], (None, None))
        if ev.get("Event") == "UNIT_STARTED":
            out[ev["Unit"]] = (ts, None)
        elif ev.get("Event") == "UNIT_COMPLETED" and start:
            out[ev["Unit"]] = (start, ts)
    return out


def unit_levels(deps):
    """unit slug -> its build batch from the edge block (unit_deps): 1 for a Unit built after nothing,
    else the batch after its latest dependency's. U1, then U2 with U3, then U4."""
    out = {}

    def level(u, seen=()):
        if u not in out:
            out[u] = 1 + max((level(d, seen + (u,)) for d in deps.get(u, []) if d in deps and d not in seen), default=0)
        return out[u]
    for u in deps:
        level(u)
    return out


def _units_of(ev):
    """The Units an event names: its Unit, or a Units / Unit names / Unit name list."""
    return _unit_list(ev.get("Unit") or ev.get("Units") or ev.get("Unit names") or ev.get("Unit name"))


def _minus(span, gaps, clock):
    """[(start, end)] of span (start, end or None) with the gaps (start, end or None) cut out."""
    out, (s, e) = [], (span[0], span[1] or clock)
    for gs, ge in sorted((gs, ge or clock) for gs, ge in gaps):
        if ge <= s or gs >= e:
            continue
        if gs > s:
            out.append((s, gs))
        s = max(s, ge)
    if s < e:
        out.append((s, e))
    return out


def bolt_tracks(events, levels, clock):
    """unit slug -> a Bolt's own time, the one definition its row, Bolt timer and cycle time use:
    {"start", "signoff", "windows", "status", "stage", "why", "since"}.
    - It starts at its Unit's own first UNIT_STARTED. A start written only as the pass completed (as
      U1's design was) starts that pass where it began: the stage's start or the step before it.
    - It runs to its checkpoint sign-off (a GATE_APPROVED naming the Unit after its build), counting
      its planning, plan approvals, rework and sign-off wait; the run's pauses never count.
    - It is Paused, its time standing still, only (a) from a UNIT_PAUSED to its resume, and (b) in a
      later batch (level 2 and up), from its design's completion to its batch's Code Generation start:
      its own UNIT_STARTED or BOLT_STARTED, or the Code Generation stage start after its design once
      every earlier batch is signed off. Bolt 4 waits for Bolts 2 and 3; Bolts 2 and 3 start together.
    - since: {stage: start of its current pass there}, for the Bolt timer. No mark yet: no track."""
    stage_starts = [(ts, ev.get("Stage")) for ts, ev in events if ev.get("Event") == "STAGE_STARTED"]
    by_unit = {}
    for ts, ev in events:
        e = ev.get("Event")
        if (e in UNIT_MARKS or e == "GATE_APPROVED") and ev.get("Unit") and "," not in ev["Unit"]:
            by_unit.setdefault(ev["Unit"], []).append((ts, ev))
        elif e == "BOLT_STARTED":
            for u in _units_of(ev):
                by_unit.setdefault(u, []).append((ts, {**ev, "Unit": u, "Stage": ev.get("Stage") or CG}))
    signoff = {}
    for u, evs in by_unit.items():
        built = None
        for ts, ev in evs:
            e = ev["Event"]
            if e == "UNIT_COMPLETED" and ev.get("Stage") == CG:
                built = ts
            elif e in ("UNIT_STARTED", "UNIT_RESUMED") and u not in signoff:
                built = None
            elif e == "GATE_APPROVED" and built and u not in signoff and (ev.get("Stage") or CG) == CG:
                signoff[u] = ts

    def batch_start(u, after):
        lvl = levels.get(u)
        if not lvl or lvl < 2:
            return None
        earlier = [x for x, n in levels.items() if n < lvl]
        if any(x not in signoff for x in earlier):
            return None
        st = next((ts for ts, s in stage_starts if s == CG and ts >= after), None)
        return max([st] + [signoff[x] for x in earlier]) if st else None

    out = {}
    for u, evs in by_unit.items():
        first = next(((ts, ev) for ts, ev in evs if ev["Event"] in ("UNIT_STARTED", "BOLT_STARTED")), None) \
            or next(((ts, ev) for ts, ev in evs if ev["Event"] == "UNIT_COMPLETED"), None)
        if not first:
            continue
        ts0, st0 = first[0], first[1].get("Stage")
        start = ts0
        if any(ev["Event"] == "UNIT_COMPLETED" and ev.get("Stage") == st0 and ts == ts0 for ts, ev in evs):
            # Marked started only as it completed: the pass began at its stage's start or the step before.
            start = max([ts for ts, s in stage_starts if s == st0 and ts <= ts0]
                        + [ts for ts, ev in events if ts <= ts0 and ev.get("Stage") == st0
                           and ev.get("Event") == "UNIT_COMPLETED" and ev.get("Unit") != u]
                        + [ts for ts in signoff.values() if ts <= ts0], default=ts0)
        end = signoff.get(u)
        gaps, gap, why, stage, since, cg_done = [], None, None, st0, {st0: start}, None
        for ts, ev in evs:
            if end and ts > end:
                break
            e, st = ev["Event"], ev.get("Stage")
            if e in ("UNIT_STARTED", "UNIT_RESUMED", "BOLT_STARTED"):
                if gap is not None:
                    gaps.append((gap, ts))
                    gap = None
                stage = st or stage
                if e == "UNIT_STARTED" and st == FD and ts > start and not any(
                        x["Event"] == "UNIT_COMPLETED" and x.get("Stage") == FD and t == ts for t, x in evs):
                    since[FD] = ts
                elif e != "UNIT_RESUMED" and st == CG and (CG not in since or (cg_done and cg_done > since[CG])):
                    since[CG] = ts
            elif e == "UNIT_PAUSED" and gap is None:
                gap, why = ts, "paused"
            elif e == "UNIT_COMPLETED" and st == CG:
                cg_done = ts
                if gap is not None:
                    gaps.append((gap, ts))
                    gap = None
            elif e == "UNIT_COMPLETED" and st == FD:
                if gap is not None:
                    gaps.append((gap, ts))
                    gap = None
                stage = CG
                if levels.get(u, 1) >= 2:
                    own = next((t for t, x in evs if t > ts and x["Event"] in ("UNIT_STARTED", "BOLT_STARTED", "UNIT_RESUMED")), None)
                    gend = min([c for c in (own, batch_start(u, ts)) if c], default=None)
                    if gend is None:
                        gap, why = ts, "design done"
                    else:
                        gaps.append((ts, gend))
                        since[CG] = gend  # its batch's Code Generation pass starts here
        if gap is not None:
            gaps.append((gap, None))
        last_cg_start = max((ts for ts, ev in evs if ev["Event"] in ("UNIT_STARTED", "UNIT_RESUMED") and (not end or ts <= end)), default=None)
        status = "done" if end else "paused" if gap is not None else \
            "signoff" if cg_done and (last_cg_start is None or last_cg_start <= cg_done) else "running"
        out[u] = {"start": start, "signoff": end, "windows": _minus((start, end), gaps, clock),
                  "status": status, "stage": CG if status in ("done", "signoff") else stage,
                  "why": why if status == "paused" else None, "since": since}
    return out


def unit_deps(intent_dir):
    """unit slug -> the Units it is built after, from the edge block in unit-of-work-dependency.md."""
    text = _read(os.path.join(intent_dir, "inception", "units-generation", "unit-of-work-dependency.md")) if intent_dir else ""
    deps, name = {}, None
    for line in text.splitlines():
        m = re.match(r"^\s*-\s*name:\s*([a-z0-9-]+)\s*$", line)
        if m:
            name = m.group(1)
            deps.setdefault(name, [])
            continue
        m = re.match(r"^\s*depends_on:\s*\[([^\]]*)\]", line)
        if m and name:
            deps[name] = _unit_list(m.group(1))
    return deps


def _active_min(a, b, pauses):
    """Minutes from a to b, leaving out paused time."""
    return round(((b - a).total_seconds() - paused_sec(pauses, a, b)) / 60, 1)


def record_tracks(intent_dir, events, clock):
    """bolt_tracks for a record: its build batches from the Unit edge block."""
    return bolt_tracks(events, unit_levels(unit_deps(intent_dir)), clock)


def _manifest_paths(intent_dir, ws, slug):
    """Workspace-relative code files a Unit's source-manifest.json claims (directories expanded)."""
    data, _ = _load_json(os.path.join(intent_dir, "construction", slug, "code-generation", "source-manifest.json"))
    out = []
    for w in (data or {}).get("writes") or []:
        p = os.path.join(ws, (w.get("path") or "").rstrip("/"))
        if os.path.isdir(p):
            out += [os.path.relpath(f, ws).replace(os.sep, "/") for f in _walk_code(p)]
        elif os.path.splitext(p)[1].lower() in CODE_EXT:
            out.append(os.path.relpath(p, ws).replace(os.sep, "/"))
    return out


def _line_hashes(ws, paths):
    """file -> {short hash of a non-blank line: count}, so kept lines can be counted later."""
    import hashlib
    out = {}
    for rel_path in paths:
        counts = {}
        try:
            with open(os.path.join(ws, rel_path), encoding="utf-8", errors="replace") as fh:
                for line in fh:
                    s = line.strip()
                    if s:
                        h = hashlib.md5(s.encode("utf-8")).hexdigest()[:12]
                        counts[h] = counts.get(h, 0) + 1
        except OSError:
            pass
        out[rel_path] = counts
    return out


def _acceptance(ws, acc, flagged=(), unnamed=0):
    """(kept, written, exact, flagged_lines) for one Bolt: of the lines the AI wrote as the
    build finished, how many are accepted. A line is not accepted when it has been rewritten
    since (to fix a bug, a review finding or anything else), or when it is in a file the
    architect's code review raised a finding on, even before that finding is fixed. A finding
    that names no code file counts as one average-sized file of the Bolt's code. Without a
    build snapshot there is no measure."""
    built = acc.get("built")
    if not built:
        return None, None, False, 0
    now = _line_hashes(ws, list(built))
    written = sum(sum(c.values()) for c in built.values())
    kept = flagged_lines = 0
    for f, c in built.items():
        surviving = sum(min(n, now.get(f, {}).get(h, 0)) for h, n in c.items())
        if any(f == p or f.endswith("/" + p) for p in flagged):
            flagged_lines += surviving
        else:
            kept += surviving
    if unnamed and built:
        extra = min(kept, round(unnamed * written / len(built)))
        kept, flagged_lines = kept - extra, flagged_lines + extra
    return kept, written, True, flagged_lines


REVIEW_ROW = re.compile(r"^\|\s*R-\d+\s*\|\s*(Critical|Major|Minor)\s*\|(.*)$", re.M | re.I)
CODE_PATH = re.compile(r"[\w./-]+\.(?:js|jsx|mjs|cjs|ts|tsx|css|html|sql)\b")


def review_findings(intent_dir, slug):
    """Severity counts of the code review findings for a Unit (the architect's review of its
    Code Generation), from the latest readable review copy, plus the code files the findings
    name, and how many findings name no code file at all."""
    folder = os.path.join(intent_dir, "construction", slug, "code-generation", "reviews")
    try:
        latest = sorted(f for f in os.listdir(folder) if f.startswith("review-") and f.endswith(".md"))[-1:]
    except OSError:
        latest = []
    counts, files, unnamed = {"critical": 0, "major": 0, "minor": 0}, set(), 0
    for f in latest:
        for sev, rest in REVIEW_ROW.findall(_read(os.path.join(folder, f))):
            counts[sev.lower()] += 1
            named = {p.lstrip("./") for p in CODE_PATH.findall(rest)}
            files.update(named)
            unnamed += 0 if named else 1
    counts["total"] = sum(counts.values())
    counts["files"] = sorted(files)
    counts["unnamed"] = unnamed
    return counts


def _manifest_lines(intent_dir, ws, slug):
    data, _ = _load_json(os.path.join(intent_dir, "construction", slug, "code-generation", "source-manifest.json"))
    if not isinstance(data, dict):
        return None
    total = 0
    for w in data.get("writes") or []:
        p = os.path.join(ws, (w.get("path") or "").rstrip("/"))
        if os.path.isdir(p):
            total += sum(_lines(f) for f in _walk_code(p))
        elif os.path.splitext(p)[1].lower() in CODE_EXT:
            total += _lines(p)
    return total


def delivery(ws, intent_dir, events, tracker, pauses=(), now=None, tracks=None, until=None):
    """The Delivery strip: totals plus one row per Bolt. tracks: the server's bolt_tracks.
    until: for an earlier piece of work, its end: issues the tests found after it belong to later work."""
    if not intent_dir:
        return None
    now = now or datetime.now(timezone.utc)
    tracks = record_tracks(intent_dir, events, now) if tracks is None else tracks
    deps = unit_deps(intent_dir)
    levels = unit_levels(deps)
    inc = os.path.join(intent_dir, "inception")
    story_ids = sorted(set(STORY_HEAD.findall(_read(os.path.join(inc, "user-stories", "stories.md")))))
    story_units = {s: re.findall(r"U\d+", cols)
                   for s, cols in STORY_ROW.findall(_read(os.path.join(inc, "units-generation", "unit-of-work-story-map.md")))}
    bolts = bolt_plan(intent_dir)
    label_to_slug = {b["label"]: b["unit"] for b in bolts}
    unit_labels = sorted({u for us in story_units.values() for u in us} | set(label_to_slug), key=lambda u: int(u[1:]))

    status = {u: {"status": t["status"], "stage": t["stage"], "why": t["why"]} for u, t in tracks.items()}
    commits = merge_commits(events)
    hist = tracker.view() if tracker else {"tests": {}, "issues": [], "loc": {}}
    if until:
        hist["issues"] = [i for i in hist["issues"] if datetime.fromisoformat(i["found"]) <= until]
    current = loc_snapshot(ws)
    if until:
        # Its line counts as its last Bolt left them, not today's code with later work in it.
        ends = [hist["loc"][b["unit"]]["end"] for b in bolt_plan(intent_dir) if "end" in hist["loc"].get(b["unit"], {})]
        current = max(ends, key=lambda s: sum(s.values()), default=current)
    code_started = [s for s, (st, _) in sorted(unit_code_windows(events).items(), key=lambda kv: kv[1][0])]

    rows = []
    for b in bolts:
        slug, pre = b["unit"], _prefix(b["unit"])
        st = status.get(slug, {"status": "todo", "stage": None})
        tests = {k: v for k, v in hist["tests"].items()
                 if v.get("unit") == pre and os.path.exists(os.path.join(ws, k.split(" > ", 1)[0]))}

        # Tests that ever failed in a run the dashboard saw: they pass now, but not first time.
        failed_ever = {i["id"] for i in hist["issues"] if i.get("unit") == pre}

        def ran(kind, added):
            # Tests made in loops or with .each are under-counted from the source; a run counts each one.
            got = {k: v for k, v in tests.items() if v["kind"] == kind}
            return {"added": max(added, len(got)), "ran": len(got),
                    "passed": sum(1 for v in got.values() if v["status"] == "passed"),
                    "firstTime": sum(1 for k, v in got.items() if v["status"] == "passed" and k not in failed_ever)}

        issues = [i for i in hist["issues"] if i.get("unit") == pre]
        loc, lines, exact = hist["loc"].get(slug, {}), None, True
        merged = _commit_lines(ws, commits[slug]) if commits.get(slug) else None
        if merged is not None:
            lines = merged  # built in parallel: exactly what its merge commit added
        elif "start" in loc:
            after = loc.get("end") or current
            lines = sum(max(0, n - loc["start"].get(f, 0)) for f, n in after.items())
        elif slug in code_started:
            exact = False
            lines = _manifest_lines(intent_dir, ws, slug)
            if lines is None and code_started[0] == slug:
                lines = sum(current.values())  # the first Unit built: everything is its own
        # Stories this Bolt delivers (all or part of), for its time per story.
        n_stories = sum(1 for us in story_units.values() if b["label"] in us)
        tr = tracks.get(slug)
        cycle_min = round(covered_sec(tr["windows"], pauses, now) / 60, 1) if tr else None
        # Paused: say what it waits for (Bolts of earlier batches not yet signed off).
        why = None
        if st["status"] == "paused":
            wait = [x["n"] for x in bolts if levels.get(x["unit"], 0) < levels.get(slug, 0) and status.get(x["unit"], {}).get("status") != "done"]
            why = (f"waiting for Bolt{'s' if len(wait) > 1 else ''} " + " and ".join(", ".join(map(str, wait)).rsplit(", ", 1))
                   if wait and st.get("why") == "design done" else "design done, waiting for its build"
                   if st.get("why") == "design done" else "on hold until AI-DLC resumes it")
        reviewed = review_findings(intent_dir, slug)
        kept, written, acc_exact, flagged_lines = _acceptance(ws, hist.get("accept", {}).get(slug, {}),
                                                              reviewed["files"], reviewed["unnamed"]) \
            if st["status"] in ("done", "signoff") else (None, None, False, 0)
        rows.append({
            **b, "status": st["status"], "stage": st["stage"], "waiting": why,
            "stories": n_stories,
            "perStoryMin": round(cycle_min / n_stories, 1) if cycle_min is not None and n_stories else None,
            "accepted": {"kept": kept, "written": written, "exact": acc_exact, "flagged": flagged_lines},
            "unitTests": ran("unit", _count_cases(ws, "tests", pre, UNIT_CASE)),
            "e2eTests": ran("e2e", _count_cases(ws, "e2e", pre, E2E_CASE)),
            "issues": {"found": len(issues), "fixed": sum(1 for i in issues if i["fixed"]),
                       "unit": sum(1 for i in issues if i["kind"] == "unit"),
                       "e2e": sum(1 for i in issues if i["kind"] == "e2e"),
                       "review": reviewed["total"], "reviewMajor": reviewed["major"] + reviewed["critical"]},
            "lines": lines, "linesExact": exact,
            "cycleMin": cycle_min,
            "cycleDone": bool(tr and tr["signoff"]),
        })

    def label_status(label):
        slug = label_to_slug.get(label)
        return status.get(slug, {}).get("status", "todo") if slug else "todo"

    def tally(states):
        return {"total": len(states), "done": states.count("done"),
                "running": sum(1 for s in states if s in ("running", "paused", "signoff")),
                "todo": states.count("todo")}

    story_states = []
    for s in story_ids:
        us = [label_status(u) for u in story_units.get(s, [])]
        story_states.append("done" if us and all(x == "done" for x in us)
                            else "running" if any(x != "todo" for x in us) else "todo")
    # A story's cycle runs from the first design step of any of its Units to the last of their
    # sign-offs; it is done once every Unit it maps to is signed off.
    story_cycles = []
    for s in story_ids:
        slugs = [label_to_slug.get(u) for u in story_units.get(s, [])]
        spans = [(tracks[x]["start"], tracks[x]["signoff"]) if x in tracks else None for x in slugs if x]
        if spans and len(spans) == len(slugs) and all(sp and sp[1] for sp in spans):
            story_cycles.append({"id": s, "min": _active_min(min(sp[0] for sp in spans), max(sp[1] for sp in spans), pauses)})
    done_bolts = [r["cycleMin"] for r in rows if r["cycleDone"]]
    done_rows = [r for r in rows if r["cycleDone"] and r["stories"]]
    # AI line acceptance across the Bolts measured (those whose build the dashboard saw finish).
    acc_rows = [r["accepted"] for r in rows if r["accepted"]["kept"] is not None]
    kept_sum, written_sum = sum(a["kept"] for a in acc_rows), sum(a["written"] for a in acc_rows)
    unit_states = [label_status(u) for u in unit_labels]
    test_lines = sum(n for f, n in current.items() if f.split("/", 1)[0] in TEST_ROOTS)
    return {
        "stories": tally(story_states),
        "units": tally(unit_states),
        "bolts": tally([r["status"] for r in rows]),
        "lines": {"total": sum(current.values()), "tests": test_lines, "app": sum(current.values()) - test_lines},
        "issues": {"found": sum(r["issues"]["found"] for r in rows), "fixed": sum(r["issues"]["fixed"] for r in rows)},
        "boltCycle": {"avg": round(sum(done_bolts) / len(done_bolts), 1) if done_bolts else None, "done": len(done_bolts),
                      "running": next((r["cycleMin"] for r in rows if r["status"] == "running" and r["cycleMin"] is not None), None)},
        "storyCycle": {"avg": round(sum(c["min"] for c in story_cycles) / len(story_cycles), 1) if story_cycles else None,
                       "done": len(story_cycles), "stories": story_cycles},
        "perStory": {"avg": round(sum(r["cycleMin"] for r in done_rows) / sum(r["stories"] for r in done_rows), 1)
                     if done_rows else None, "bolts": len(done_rows)},
        "aiAcceptance": {"pct": round(100 * kept_sum / written_sum, 1) if written_sum else None,
                         "bolts": len(acc_rows), "kept": kept_sum, "written": written_sum,
                         "unmeasured": [r["label"] for r in rows if r["status"] == "done" and r["accepted"]["kept"] is None]},
        "review": {"found": sum(r["issues"]["review"] for r in rows), "major": sum(r["issues"]["reviewMajor"] for r in rows)},
        "rows": rows,
    }
