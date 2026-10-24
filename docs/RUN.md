# Run the PayShield backend (Windows PowerShell)

Run everything from the repo root. Python 3.10+ is required.

## 1. Set up and start the API

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python scripts/check_env.py
python -m pip install -r requirements.txt
python -m uvicorn backend.app.main:app --port 8000
```

`check_env.py` must print `OK`. If PowerShell blocks `Activate.ps1`, run
`Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in that window first.
Leave the server running and use a second PowerShell window for the checks below.
Interactive docs: http://localhost:8000/docs

## 2. Try each endpoint

Health (expect `status ok`, `model_loaded True`):

```powershell
Invoke-RestMethod http://localhost:8000/api/health
```

Samples for the dropdown and example chips:

```powershell
Invoke-RestMethod http://localhost:8000/api/samples | ConvertTo-Json -Depth 5
```

Analyse a message:

```powershell
$body = @{ text = "Dear customer your SBI KYC expires today. Click bit.ly/sbi-kyc now to avoid block"; sender = "+919876543210" } | ConvertTo-Json
Invoke-RestMethod http://localhost:8000/api/analyze/message -Method Post -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 5
```

Analyse a transaction:

```powershell
$body = @{ amount = 49999; payee = "Rahul Traders"; is_new_payee = $true; hour = 2; type = "collect_request"; recent_txn_count_1h = 3 } | ConvertTo-Json
Invoke-RestMethod http://localhost:8000/api/analyze/transaction -Method Post -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 5
```

Error cases: empty text returns 400 `{"error": ...}`; invalid fields (for example `hour = 24`) return 422.

## 3. CORS check for the frontend (http://localhost:5173)

Simple request: the response must echo the frontend origin.

```powershell
(Invoke-WebRequest http://localhost:8000/api/health -Headers @{ Origin = "http://localhost:5173" } -UseBasicParsing).Headers["Access-Control-Allow-Origin"]
```

Expected output: `http://localhost:5173`

Preflight for a JSON POST (what the browser sends before `/api/analyze/message`):

```powershell
(Invoke-WebRequest http://localhost:8000/api/analyze/message -Method Options -UseBasicParsing -Headers @{ Origin = "http://localhost:5173"; "Access-Control-Request-Method" = "POST"; "Access-Control-Request-Headers" = "content-type" }).StatusCode
```

Expected output: `200`. An origin that is not allowed (for example `http://localhost:9999`) gets a 400 on the preflight instead.

## curl equivalents

Use `curl.exe` (plain `curl` in PowerShell is an alias for `Invoke-WebRequest`):

```powershell
curl.exe http://localhost:8000/api/health
curl.exe -X POST http://localhost:8000/api/analyze/message -H "Content-Type: application/json" -d '{\"text\": \"Your OTP is 123456. Do not share it.\", \"sender\": \"VM-HDFCBK\"}'
curl.exe -i http://localhost:8000/api/health -H "Origin: http://localhost:5173"
```
