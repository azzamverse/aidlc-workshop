# AI-DLC Workshop: Machine Setup

Please do this **before the workshop day**. It takes about 30 minutes per team machine.

On the day, each team works on **one shared machine** with **two screens**. That machine runs everything: Claude Code, the browser, the editor and the live dashboard. These steps set it up and check it works, so the day starts on time.

Works on **macOS** and **Windows**. Where the commands differ, both are given.

> **Use Claude Code in a terminal (the CLI) all day.** Run `claude` in **Terminal** (macOS) or **PowerShell** (Windows), or in VS Code's built-in terminal. Don't use the Claude desktop app, the VS Code or JetBrains extension panel, or Claude Code on the web. AI-DLC's hooks get their settings from the terminal that starts Claude Code, and every step in this guide assumes a terminal.

---

## 1. What you need

| | Notes |
|---|---|
| A Claude account with Claude Code access | A plan that includes the **Opus** model. One login per team machine. |
| Two screens | Screen 1 for the work, screen 2 for the live dashboard. |
| Google Chrome (Safari is fine for viewing on macOS) | To view the designs, the app and the dashboard. The app's automated browser tests also run in Chrome. |
| VS Code (or any Markdown viewer) | To read the documents AI-DLC writes. |
| The **workshop starter folder** | Sent to you by the facilitator (zip). |

---

## 2. Install the software

Open a terminal: **Terminal** on macOS, **PowerShell** on Windows. After each install, close the terminal and open a new one, so it picks up the new command.

### 2.1 Node.js (LTS version)

Download and install it from <https://nodejs.org>. The app built during the workshop runs on it.

### 2.2 Python 3

It runs the live dashboard.

- **macOS:** type `python3 --version`. If macOS offers to install developer tools, accept. Otherwise install from <https://www.python.org/downloads/>.
- **Windows:** install from <https://www.python.org/downloads/>. Keep the "py launcher" option ticked, and tick **Add python.exe to PATH**.

### 2.3 Claude Code

- **macOS:** `curl -fsSL https://claude.ai/install.sh | bash`
- **Windows:** first install **Git for Windows** from <https://git-scm.com/downloads/win>, which Claude Code uses on Windows. Then, in PowerShell: `irm https://claude.ai/install.ps1 | iex`

Then run `claude` once **in the terminal** and sign in with the team's Claude account. Type `/exit` to leave. This command-line Claude Code is the one you use all day; don't install or use the desktop app or an editor extension for the workshop.

### 2.4 AI-DLC

- **macOS:** `curl -fsSL https://github.com/awslabs/aidlc-workflows/releases/latest/download/install.sh | sh`
- **Windows:** `irm https://github.com/awslabs/aidlc-workflows/releases/latest/download/install.ps1 | iex`

Already installed? Run `aidlc update` instead.

### 2.5 The test browsers (Playwright)

The AI tests every part of the app in a real browser before your team sees it. It uses Playwright, which needs its own copy of Chromium (about 150 MB). On macOS it also uses WebKit, Safari's engine. Download them now, so it doesn't happen on the day's shared Wi-Fi:

- **macOS:** `npx -y playwright@1.64.1 install chromium webkit`
- **Windows:** `npx -y playwright@1.64.1 install chromium`

**Don't install Firefox for Playwright.** The workshop doesn't test in it.

### 2.6 Git: your name and email

The app is built in parallel parts, which needs git. Git comes with Git for Windows (step 2.3), and on macOS with the developer tools: `git --version` offers to install them if they're missing.

Git labels its saves with a name and email. Set them once per machine, if `git config user.name` prints nothing:

```
git config --global user.name "Team 1"
git config --global user.email "team1@example.com"
```

### 2.7 Check the installs

In a new terminal, each of these should print a version number:

```
node -v                (must be 22 or later)
aidlc --version
claude --version
python3 --version      (Windows: py -3 --version)
npx playwright --version
git --version
```

---

## 3. Set up the starter folder

Unzip the starter folder somewhere easy to find, for example your Desktop. Avoid synced folders such as OneDrive or Google Drive: syncing while AI-DLC writes files can cause conflicts. You get:

```
aidlc-workshop/
├── table-order/       your team's workspace: Claude Code works in here
│   ├── ideas/table-order/IDEA.md   the brief for what you will build
│   └── aidlc/         the saved workshop plan (dpl-workshop) and the team's rules (see below)
│                      (table-order/ is already a git repository: don't delete its hidden .git folder)
├── tools/             the live dashboard
└── checkpoints/       catch-up copies (used only if your team falls behind)
```

The workspace already holds the **team's rules** in `table-order/aidlc/spaces/default/memory/project.md`. AI-DLC follows them at every stage, so you don't have to ask for them. In short:
- Every question puts the recommended option first, and each stage asks only a few questions.
- Every review finding is fixed before moving on. The AI decides most fixes itself; your team decides only the first Major finding and any Critical one.
- The app is built as 4 Units in 4 Bolts: the walking skeleton, the diner screens, the kitchen board, and the bill and Close table.
- The diner's tabs sit in a bar at the bottom of the screen. The built app must match the mockups.
- Each part of the app (a "Unit") gets browser tests and is compared with its design mockups.
- The AI runs all the tests itself, and only then opens the app for you to try and sign off.

Don't edit that file unless the facilitator asks you to.

Then set up the workspace for Claude Code. In a terminal:

```
cd path/to/aidlc-workshop/table-order
aidlc config --harness claude
aidlc doctor
```

`aidlc doctor` must report **0 problems**. At this point two warnings are normal: "AIDLC hooks have not run in this project yet" and "Runtime hook PATH". The next step clears the first one. If it lists problems, fix them or send the output to the facilitator.

Next, approve AI-DLC's hooks (small scripts it runs automatically). In the same folder, start Claude Code with `claude`. When it asks you to approve the project's hooks, approve them (you can also review them with `/hooks`). Then **quit Claude Code completely** (`/exit`) and start it again with `claude`. `/clear` is not enough. Type `/aidlc --doctor`; it should report no problems. Then `/exit`.

Back in the terminal, run `aidlc doctor` again. It should now end with **"Your install is ready."** If only the "Runtime hook PATH" warning is left, that's fine, as long as you always start Claude Code from a terminal.

---

## 4. Test the live dashboard

The dashboard shows the whole run on the second screen:
- **Stages:** all of them, and the one running now with its timer. In Construction, it also shows which **Bolt** (build round) it is.
- **Delivery strip:**
  - stories, Units and Bolts done;
  - tests added, run and passing, and how many passed first time;
  - issues found by tests and by review;
  - unit test coverage;
  - **AI lines accepted**;
  - cycle times.
- **Tests panel:** the latest test results.
- **Tokens:** the tokens this AI-DLC run has used, and what they would cost at API prices.
- **Also:**
  - the AI's latest output;
  - its files, grouped by stage, with the current stage open;
  - an activity feed.

  A box blinks briefly when its figures change.

It only reads the workspace, so it cannot affect the run.

Open a **second** terminal window and start it from the workspace folder:

- **macOS:**
  ```
  cd path/to/aidlc-workshop/table-order
  ../tools/dashboard.sh
  ```
- **Windows:**
  ```
  cd path\to\aidlc-workshop\table-order
  ..\tools\dashboard.cmd
  ```
  You can also double-click `tools\dashboard.cmd` in File Explorer.

A browser window opens at <http://127.0.0.1:8787/> showing **"Waiting to start"** and the list of stages. That means it works. Press **Ctrl+C** in that terminal to stop it.

Each machine runs its own dashboard for its own workspace. It isn't shared over the network.

**Keep the dashboard running all day.** Some figures, such as AI lines accepted and issues found by tests, are only counted while it runs.

---

## 5. Check before the day

| Check | How |
|---|---|
| All installs print a version, and Node is 22 or later | Section 2.7 |
| Git has a name and email | `git config user.name` and `git config user.email` each print something (section 2.6) |
| Playwright's browsers are downloaded | Section 2.5 |
| `table-order/aidlc/spaces/default/memory/project.md` lists the team's rules | Open it: it has rules under Way of Working, Testing Posture, Mandated and Forbidden |
| `aidlc doctor` reports 0 problems, after the hooks are approved | Section 3 |
| Claude Code opens **in a terminal** in `table-order` and is signed in | `claude` in Terminal or PowerShell, not the desktop app or an editor extension |
| The dashboard opens in the browser | Section 4 |
| Ports 3000 (the app), 3100, 3200 and 3300 (the app's tests) and 8787 (the dashboard) are free | macOS: `lsof -iTCP:3000 -sTCP:LISTEN` should print nothing. Windows: `netstat -ano \| findstr :3000` should print nothing. Repeat for each port. |
| The machine won't sleep during the day | Turn off auto-sleep and screen lock for the workshop. |

Problems? Send the facilitator the command you ran and what it printed.

---

## 6. On the day: arrange the windows

| Screen 1 (the work) | Screen 2 (the dashboard) |
|---|---|
| **Terminal 1:** Claude Code, in `table-order` | **Dashboard browser window**, full screen |
| **Browser:** the designs and the app | |
| **VS Code:** open the `table-order` folder | |

**Terminal 2**, the one that runs the dashboard, can be minimised but **must stay open**. Closing it stops the dashboard.

Steps:

1. **Terminal 2:** start the dashboard (section 4). Drag its browser window to screen 2 and make it full screen: **Cmd+Ctrl+F** on macOS, **F11** on Windows.
2. **VS Code:** File → Open Folder → `aidlc-workshop/table-order`.
3. **Terminal 1:** start Claude Code from a terminal (not from the Dock or Start menu):
   ```
   cd path/to/aidlc-workshop/table-order
   claude
   ```
4. In Claude Code, set the model: type `/model` and choose **Opus**, then type `/effort high`.
5. Wait for the facilitator, then paste the start command:
   ```
   /aidlc --scope dpl-workshop "Build the Table Order web app based on ideas/table-order/IDEA.md"
   ```
   Type `dpl-workshop` exactly. AI-DLC also has a built-in `workshop` scope, which runs a different, longer plan.

**Every team gets the same questions.**
- The AI asks the questions written in `ideas/table-order/QUESTIONS.md`, stage by stage, with the same options. It adds none of its own.
- Unless the facilitator says otherwise, pick the option marked **(Recommended)**.
- The facilitator's printed handout, `facilitator-questions.html`, lists every question and the reply to give at each decision point.

**During Construction**, the app is built as **4 Units**, one per Bolt:

| Bolt | Unit | What it builds | How it's built | Time |
|---|---|---|---|---|
| 1 | U1 `u1-walking-skeleton` | The walking skeleton: everything the other Units share. The data model and seed menu, the order API, the live updates (Server-Sent Events), and the app shell with its navigation. | On its own, first, in the main folder | 45 min |
| 2 | U2 `u2-diner-screens` | The diner's Menu, Cart and My orders screens: the bottom tab bar, the category pills, placing an order, a cart that survives a refresh, and live order status. | In parallel with Bolt 3, in its own git worktree | 30 min |
| 3 | U3 `u3-kitchen-board` | The staff's kitchen board: new orders arrive live and highlighted, staff move them through Pending, Preparing and Completed, and mark items sold out. | In parallel with Bolt 2, in its own git worktree | 30 min |
| 4 | U4 `u4-bill-and-close` | The table bill (each order, then one total) and Close table, which archives the visit and resets the table. | On its own, after Bolts 2 and 3 are merged and signed off | 25 min |

Every Unit after the skeleton uses only the skeleton's code, never another Unit's. That is what lets Bolts 2 and 3 be built at the same time. The times are each Bolt's Code Generation timebox, shown on the dashboard.

The Bolts are built in this order:
1. **At the Delivery Planning step**, type: `Build Bolt 1 on its own, then Bolts 2 and 3 in parallel, then Bolt 4 on its own`.
2. **Bolt 1, the walking skeleton**, is built on its own.
3. **When AI-DLC asks how to continue,** choose **Review each checkpoint**.
4. **When it asks to commit the approved work,** say yes.
5. **Bolts 2 and 3 (diner screens and kitchen board) are built at the same time.** Your team approves their code plans together, in one question.
6. **Bolt 4 (bill and close) is built on its own,** after Bolts 2 and 3 are merged and signed off.

Every Bolt ends with the checkpoint routine. The AI:
1. Runs every test itself.
2. Compares every screen with its mockup.
3. Has the code reviewed.
4. Shares the results with you.
5. Only then opens the app in the browser, with steps for your team to try it.

Your team then signs the Bolts off. Answer each code-plan question on its own.

---

## 7. If something goes wrong on the day

| Problem | What to do |
|---|---|
| AI-DLC's steps aren't recorded, the dashboard stays on "Waiting to start", or `aidlc doctor` says the hooks haven't run | Make sure Claude Code was started with `claude` in a terminal, not from the desktop app, an editor extension or the web. Quit it with `/exit` and start it again from the terminal, in `table-order`. |
| `aidlc`, `claude`, `node` or `python3` "not found" | Open a new terminal. If it's still missing, repeat the install in section 2. |
| Dashboard says "Port 8787 is in use" | It's already running. Open <http://127.0.0.1:8787/> in the browser. |
| Dashboard says "Workspace not found" | Run it from inside `table-order` (section 4), or give the path: `tools/dashboard.sh path/to/table-order`. |
| Dashboard doesn't change | Check terminal 2 is still open, then refresh the browser. |
| The dashboard shows "3.1 Functional Design" again during Construction | That's expected: each Bolt starts with its own design step. The "Bolt N of 4" line shows which Bolt it is. |
| AI-DLC asks "Do you want me to have the new approach checked before you decide?" | It offers an extra review because the design documents changed after their review, when the review's findings were fixed. "No" is the usual answer: the code review already covered the result. |
| The "Reconnecting…" banner doesn't show when you go Offline in the browser's DevTools | DevTools Offline leaves a live connection that is already open untouched. To see the banner, ask the AI to stop the app for 15 seconds. |
| The app won't start because port 3000 is busy | Close other apps using that port, then ask Claude Code to start the app again. |
| Building the Bolts in parallel fails | Type `build them one at a time instead`. AI-DLC keeps the approved plans and builds the Bolts one after another. |
| Your team is more than 20 minutes behind | Ask the facilitator: they'll help you switch to the latest copy in `checkpoints/`, then continue with `/aidlc --resume`. |
