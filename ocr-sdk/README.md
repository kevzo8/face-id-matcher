# SVI Reusable ID OCR SDK (CPS-381)

Enterprise-grade, reusable ID OCR **front-end SDK** + **backend wrapper** that
extracts structured identity information from one or more identity document
images and returns a **standardized JSON contract** consumable by multiple
applications.

## Architecture

```
Consuming application (OWA, Passenger Manifest, ...)
        |
        |  base64 images (one or more)  + optional document_type hint
        v
   Front-End SDK (frontend/)   <-- framework-agnostic TypeScript, no rendering
        |
        |  POST /id-ocr/ocr/extract
        v
   Backend wrapper (backend/)  <-- Python FastAPI (server-side only)
        |-- AWS Rekognition DetectText  -> raw text lines (multi-image)
        |-- GROQ (llama-3.3-70b-versatile) -> normalized ExtractedData
        v
   Standardized JSON contract
```

## Key guarantees

- **SDK never determines front/back.** The consuming application supplies the
  image(s), the capture sequence, and whether front/back/both are required for
  the selected ID type.
- **No external service access from the client.** AWS credentials and the GROQ
  token live only in the backend environment. Every OCR request is routed
  through the backend wrapper.
- **Consistent output contract** across all ID types (see below).
- **Partial extraction.** If some images fail, the request still returns the
  successfully extracted text plus per-image diagnostics.
- **Sanitized errors.** Responses never leak internal or external API details.

## Identity configuration registry

Identity types are **not hardcoded**. They live in `backend/app/id_config.json`
and can be added/updated/disabled without code changes. Each entry:

- `id_type_code` — unique code used in API requests (e.g. `1`, `2`, `14`).
- `id_type_name` — human-readable name (e.g. `PWD ID`, `Bataeno Pass`).
- `is_active` — when `false`, requests using that code are rejected.
- `document_type` — canonical output key.

| code | id_type_name | document_type |
|------|--------------|---------------|
| 0 | Others | OTHER |
| 1 | Passport | PASSPORT |
| 2 | National ID (ePhilID) | PHILIPPINE_NATIONAL_ID |
| 3 | National ID (PhilID Card) | PHILIPPINE_NATIONAL_ID |
| 4 | UMID | UMID |
| 5 | PRC ID | PRC_ID |
| 6 | SSS ID | SSS_ID |
| 7 | GSIS ID | GSIS_ID |
| 8 | TIN Card | TIN |
| 9 | PWD ID | PWD_ID |
| 10 | Senior Citizen ID | SENIOR_CITIZEN_ID |
| 11 | PhilHealth ID | PHILHEALTH |
| 12 | Postal ID | POSTAL_ID |
| 13 | Driver's License | DRIVERS_LICENSE |
| 14 | Bataeno Pass | BATAENO_PASS_ID |

Edit `id_config.json` then call `POST /id-ocr/identity/types` (or restart) — no code
changes needed. A request with any unknown or inactive `id_type_code` is rejected
with `INVALID_ID_TYPE`.

## Standardized JSON output

```json
{
  "status": "SUCCESS",
  "id_type_code": 14,
  "id_type_name": "Bataeno Pass",
  "document_type": "BATAENO_PASS_ID",
  "extracted_data": {
    "id_number": "BP-2026-009841",
    "full_name": {
      "first_name": "JUAN",
      "middle_name": "DELA",
      "last_name": "CRUZ",
      "suffix": "JR"
    },
    "date_of_birth": "1990-05-14",
    "date_issued": "2025-12-02",
    "valid_until": "2030-12-01",
    "personal_data": [
      { "label": "first_name", "value": "JUAN" },
      { "label": "birth_date", "value": "1990-05-14" }
    ],
    "other_fields": [
      { "label": "gender", "value": "Male" },
      { "label": "blood_type", "value": "O+" }
    ],
    "additional_metadata": [
      { "label": "hotline", "value": "1388" }
    ],
    "id_information": [
      { "id_label": "ID 1", "id_type_code": 14, "id_type_name": "Bataeno Pass", "id_number": "BP-2026-009841" }
    ]
  },
  "raw_text_payload": "..."
}
```

Fields unavailable on the submitted document are returned as `null`/`[]`. The
contract is identical regardless of ID type.

`personal_data`, `other_fields`, and `id_information` mirror the POC's grouped
demographic/detail output; the standardized top-level fields are populated from
the same normalization pass.

## Field reference

Every field is derived from the same GROQ normalization pass. Fields with no
value are returned as `null`/`[]` — never invented.

| Field | Type | Description |
|-------|------|-------------|
| `id_number` | string\|null | Document / identification number. |
| `full_name` | object\|null | `first_name`, `middle_name`, `last_name`, `suffix`. |
| `date_of_birth` | string\|null | ISO `yyyy-mm-dd`. |
| `date_issued` | string\|null | ISO `yyyy-mm-dd`. |
| `valid_until` | string\|null | ISO `yyyy-mm-dd`. |
| `personal_data` | array | Known name + birth fields as `{label, value}` (`first_name`, `middle_name`, `last_name`, `birth_date`). |
| `other_fields` | array | **Known, structured** demographic/identity attributes as `{label, value}`. Canonical labels only: `gender`, `nationality`, `address`, `expiry_date`, `issue_date`, `blood_type`, `religion`, `marital_status`, `occupation`, `mother_maiden_name`, `father_name`, `place_of_birth`, `height`, `weight`, `eye_color`, `restrictions`, `id_number`. |
| `additional_metadata` | array | **Unstructured leftovers** that don't fit a canonical `other_fields` label (e.g. hotline numbers, website, QR/region codes, card serials, or an unrecognized label's raw value). Preserved as `{label, value}` so no OCR data is lost. |
| `id_information` | array | Per-ID info when multiple distinct IDs are present. Redundant entries (matching the primary `id_number`/type) are removed, so a single-ID upload yields `[]`. |
| `raw_text_payload` | string | The raw OCR text lines, for auditing/debugging. |

**`other_fields` vs `additional_metadata`:** if the attribute is a recognizable
demographic/identity field it goes in `other_fields`; if it's an odd or unknown
leftover it goes in `additional_metadata`. The standardized top-level fields
(`id_number`, `full_name`, dates) are also populated independently.

`id_information` is only populated when it describes an identity **different**
from the primary document already reported at the top level. Redundant entries
(matching the primary `id_number`/type) are automatically removed, so a single
ID upload yields `"id_information": []`.

## Error response

```json
{
  "status": "ERROR",
  "document_type": null,
  "extracted_data": null,
  "raw_text_payload": null,
  "error_code": "OCR_FAILED",
  "message": "None of the supplied images could be processed."
}
```

## Backend

### 1. Set your credentials (one time)

Copy the template to a real `.env` file, then fill in your values:

```bash
cd backend
cp .env.example .env
# edit .env and add your AWS + GROQ keys
```

`.env` lives at `backend/.env` and is auto-loaded on startup (via `python-dotenv`).
It is **git-ignored** — secrets never get committed.

> Tip: if you already ran `aws configure`, AWS reads `~\.aws\credentials`
> automatically, so you may only need to set `GROQ_API_KEY`.

### 2. Install & run

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

No manual `$env:` exports needed — the `.env` file is loaded for you.

`GET /id-ocr/health` and `POST /id-ocr/ocr/extract`.

Request body:

```json
{
  "images": [
    { "image": "<base64>", "label": "front" },
    { "image": "<base64>", "label": "back" }
  ],
  "id_type_code": 14,
  "document_type": "BATAENO_PASS_ID"
}
```

`id_type_code` is the registry code (recommended). `document_type` is a legacy
string hint, ignored when `id_type_code` is present.

Docker: `docker build -t svi-id-ocr backend && docker run -p 8000:8000 svi-id-ocr`.
(When using Docker, pass the secrets via environment variables to the container.)

## Front-End SDK

```bash
cd frontend
npm install
npm run build   # outputs dist/svi-id-ocr.js (iife), .esm.js, .dev.js, + types
```

### Choosing an API

Both entry points share the same engine and produce identical results. Pick the
one that fits your context:

| | Library API (`extractDocument`) | Web component (`<svi-id-ocr>`) |
|---|---|---|
| Best for | React/Vue/app code | Markup-first / vanilla JS / no build step |
| Style | Function call returning a `Promise` | DOM element + methods + events |
| Rendering | None (headless) | Optional host element |
| Framework | Any (ES module) | Any (custom element) |

- Use the **library API** when you're inside a component framework and want a
  simple `await extractDocument(...)`.
- Use the **web component** when you prefer a DOM element in HTML, listen for
  `svi-ocr-success` / `svi-ocr-error` events, or target a page without a
  bundler.

Headless library usage:

```ts
import { extractDocument, listIdentityTypes } from 'svi-id-ocr-sdk';

const { data } = await listIdentityTypes(); // active registry, e.g. [{ id_type_code: 14, ... }]

const result = await extractDocument(
  [
    { image: base64Front, label: 'front' },
    { image: base64Back, label: 'back' },
  ],
  { endpoint: '/id-ocr/ocr/extract', idTypeCode: 14 },
);

if (result.ok) {
  console.log(result.data?.id_type_name);      // "Bataeno Pass"
  console.log(result.data?.extracted_data);    // standardized + demographic details
} else {
  console.log(result.error?.message);          // e.g. INVALID_ID_TYPE for inactive code
}
```

Optional web component (framework-agnostic):

```html
<svi-id-ocr endpoint="/id-ocr/ocr/extract" id-type-code="14"></svi-id-ocr>
<script>
  const el = document.querySelector('svi-id-ocr');
  el.addEventListener('svi-ocr-success', (e) => console.log(e.detail));
  el.extract([{ image: base64Front, label: 'front' }]);
</script>
```

## Demo

Open `demo/index.html` in a browser with the backend running and proxy
`/ocr/extract` to `http://localhost:8000/id-ocr/ocr/extract`.
