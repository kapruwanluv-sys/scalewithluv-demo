"""Build the public demo site into site/: landing page, owner dashboard + manager app, and the console.

  python -I tools/build.py            (needs ../host-dashboard, ../scalewithluv-console, ../whatsapp-ai-engine)

Every app talks to https://script.google.com/macros/s/DEMOn/exec, which demo-sheet.js answers in the browser by running
the real Code.gs over made-up data. No real client, key, number or link goes into site/.
"""
import json, pathlib, re, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = ROOT.parent
HD, CON, ENG = DOCS / "host-dashboard", DOCS / "scalewithluv-console", DOCS / "whatsapp-ai-engine"
SITE, BUILD = ROOT / "site", ROOT / "build"
DEMO = lambda n: f"https://script.google.com/macros/s/DEMO{n}/exec"

shutil.rmtree(SITE, ignore_errors=True)
SITE.mkdir()
BUILD.mkdir(exist_ok=True)

# 1. made-up Register data
subprocess.run([sys.executable, "-I", str(ROOT / "src/make_seed.py"), str(BUILD / "seed.json")], check=True)

# 2. owner dashboard + manager app from the dashboard foundation, pointed at demo sheet 1
client = json.loads((HD / "clients/demo/client.json").read_text(encoding="utf-8"))
client.update({"api_url": DEMO(1), "bot_url": "", "google_client_id": "demo-cid", "brand": "Pinewood Stays"})
client["app"].update({"app_name": "Pinewood Stays", "short_name": "Pinewood"})
cdir = BUILD / "client"
shutil.rmtree(cdir, ignore_errors=True)
cdir.mkdir()
(cdir / "client.json").write_text(json.dumps(client, ensure_ascii=False, indent=1), encoding="utf-8")
subprocess.run([sys.executable, "-I", str(HD / "scripts/build.py"), str(cdir), "--out", str(SITE / "dashboard")], check=True)

# 3. the console with three demo clients (no real ones)
(SITE / "console").mkdir()
for f in ("index.html", "tiers.js", "releases.js"):
    shutil.copy(CON / f, SITE / "console" / f)
shutil.copytree(CON / "img", SITE / "console/img", ignore=shutil.ignore_patterns("jabula*"))
color = ["#1d5bd8", "#0f8a6a", "#b4462f"]
names = ["Pinewood Stays", "Parvati Valley Homes", "Ridge & Pine Shimla"]
(SITE / "console/clients.json").write_text(json.dumps({"google_client_id": "demo-cid", "clients": [
    {"id": f"demo-{i}", "name": names[i - 1], "api_url": DEMO(i), "since": "2025-11",
     "dashboard_url": "../dashboard/" if i == 1 else "", "manager_url": "../dashboard/manager/" if i == 1 else "",
     "bot_url": "", "repo": "", "color": color[i - 1]} for i in (1, 2, 3)]}, indent=1), encoding="utf-8")

# 4. the in-browser sheet: real Code.gs + the seed
code = (ENG / "extras/apps_script/Code.gs").read_text(encoding="utf-8")
js = (ROOT / "src/sheet.js").read_text(encoding="utf-8")
js = js.replace("/*__CODE_GS__*/''", json.dumps(code)).replace(
    "/*__SEED__*/{base: '2026-01-15', tabs: {}}", (BUILD / "seed.json").read_text(encoding="utf-8"))
assert "__CODE_GS__" not in js and "__SEED__" not in js
(SITE / "demo-sheet.js").write_text(js, encoding="utf-8")
ver = re.search(r"CODE_VERSION\s*=\s*'([\d.]+)'", code).group(1)

# 5. each page loads the demo sheet before its own scripts
def inject(page, rel, kind):
    t = page.read_text(encoding="utf-8")
    tag = f'<script>window.SWL_DEMO={{page:"{kind}"}}</script><script src="{rel}demo-sheet.js"></script>'
    t, n = re.subn(r"(<head[^>]*>)", r"\1" + tag.replace("\\", "\\\\"), t, count=1)
    assert n == 1, page
    page.write_text(t, encoding="utf-8", newline="\n")
inject(SITE / "dashboard/index.html", "../", "dashboard")
inject(SITE / "dashboard/manager/index.html", "../../", "manager")
inject(SITE / "console/index.html", "../", "console")

# 6. landing page
shutil.copy(ROOT / "src/index.html", SITE / "index.html")
(SITE / ".nojekyll").write_text("")
dash = json.loads((SITE / "dashboard/version.json").read_text(encoding="utf-8")).get("version", "")
print(f"site/ ready · dashboard {dash} · Code.gs {ver} · demo-sheet.js {(SITE / 'demo-sheet.js').stat().st_size // 1024} KB")
