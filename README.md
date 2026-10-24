# PayShield

Check before you click, pay or share. PayShield analyses a suspicious message or payment and explains in plain language why it is risky and what to do next.
VIT AI Innovate-A-Thon, Question 18. **Awareness aid, not a guarantee.** All data is synthetic. Fully offline.

Full requirements: [docs/PRD.md](docs/PRD.md).

## Setup (Python 3.10+, run from the repo root)

Windows PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python scripts/check_env.py
python -m pip install -r requirements.txt
```

macOS / Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
python scripts/check_env.py
python -m pip install -r requirements.txt
```

`check_env.py` must print `OK`. Never install into the global Python.

## Run the API

```powershell
python -m uvicorn backend.app.main:app --reload --port 8000
```

Check it: http://localhost:8000/api/health (interactive docs: http://localhost:8000/docs)

Endpoints (contract: [PRD section 8](docs/PRD.md)):

- `GET /api/health`
- `POST /api/analyze/message` with `{"text": "...", "sender": "..."}`
- `GET /api/samples`

Rules, weights, keywords and advice live in `backend/app/rules/signals.json`; thresholds in `backend/app/config.py`.

## Run the tests

```powershell
python -m pytest
```

## Layout

- `backend/app/`: FastAPI app, rule engine, ML, fusion, transactions, advice
- `backend/tests/`: pytest suite
- `data/`: synthetic datasets
- `eval/`: evaluation script and results
- `scripts/check_env.py`: fails if not inside `.venv`
- `frontend/`: React UI (built separately)
