/** Backend HTTP client. All AWS/GROQ calls happen server-side; the SDK only
 * talks to the wrapper endpoint. */
import type { IdentityTypeResponse, IdImage, OcrError, OcrSuccess } from './types';

interface RequestPayload {
  images: IdImage[];
  id_type_code?: number;
  document_type?: string;
}

export interface ExtractResult {
  ok: boolean;
  data?: OcrSuccess;
  error?: OcrError;
}

export interface ListTypesResult {
  ok: boolean;
  data?: IdentityTypeResponse;
  error?: OcrError;
}

/** Extract identity data from one or more ID images via the backend wrapper. */
export async function extractDocument(
  images: IdImage[],
  options: { endpoint?: string; idTypeCode?: number; documentType?: string; fetchInit?: RequestInit } = {},
): Promise<ExtractResult> {
  const endpoint = options.endpoint ?? '/id-ocr/ocr/extract';

  const payload: RequestPayload = {
    images: images.map((img) => ({
      image: normalizeImageData(img.image),
      ...(img.label ? { label: img.label } : {}),
    })),
  };
  if (options.idTypeCode !== undefined) {
    payload.id_type_code = options.idTypeCode;
  } else if (options.documentType) {
    payload.document_type = options.documentType;
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.fetchInit?.headers,
      },
      body: JSON.stringify(payload),
      ...options.fetchInit,
    });
  } catch (cause) {
    return {
      ok: false,
      error: {
        status: 'ERROR',
        id_type_code: null,
        id_type_name: null,
        document_type: null,
        extracted_data: null,
        raw_text_payload: null,
        error_code: 'NETWORK_ERROR',
        message: `Request to OCR backend failed: ${cause instanceof Error ? cause.message : String(cause)}`,
      },
    };
  }

  const body = await response.json().catch(() => null);

  if (!response.ok || !body || body.status !== 'SUCCESS') {
    return { ok: false, error: body as OcrError };
  }

  return { ok: true, data: body as OcrSuccess };
}

/** Fetch the active identity configuration registry from the backend. */
export async function listIdentityTypes(
  endpoint = '/id-ocr/identity/types',
): Promise<ListTypesResult> {
  try {
    const response = await fetch(endpoint, { method: 'GET' });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body) {
      return { ok: false, error: body as OcrError };
    }
    return { ok: true, data: body as IdentityTypeResponse };
  } catch (cause) {
    return {
      ok: false,
      error: {
        status: 'ERROR',
        id_type_code: null,
        id_type_name: null,
        document_type: null,
        extracted_data: null,
        raw_text_payload: null,
        error_code: 'NETWORK_ERROR',
        message: `Failed to list identity types: ${cause instanceof Error ? cause.message : String(cause)}`,
      },
    };
  }
}

/** Accept a raw base64 string or a data URI and return plain base64. */
function normalizeImageData(data: string): string {
  const commaIndex = data.indexOf(',');
  if (data.startsWith('data:') && commaIndex !== -1) {
    return data.slice(commaIndex + 1);
  }
  return data;
}
