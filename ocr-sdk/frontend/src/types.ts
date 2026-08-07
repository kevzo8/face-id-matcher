/** Shared types for the SVI Reusable ID OCR SDK (CPS-381). */

export type DocumentType =
  | 'BATAENO_PASS_ID'
  | 'PWD_ID'
  | 'PHILIPPINE_NATIONAL_ID'
  | 'DRIVERS_LICENSE'
  | 'PASSPORT'
  | 'PRC_ID'
  | 'UMID'
  | 'POSTAL_ID'
  | 'SSS_ID'
  | 'GSIS_ID'
  | 'TIN'
  | 'SENIOR_CITIZEN_ID'
  | 'PHILHEALTH'
  | 'OTHER'
  | 'UNKNOWN';

export interface FullName {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix: string | null;
}

/** A single key/value field, e.g. { label: 'gender', value: 'Male' }. */
export interface FieldValue {
  label: string;
  value: string;
}

/** Per-ID information when multiple IDs are present. */
export interface IdInformation {
  id_label: string | null;
  id_type_code: number | null;
  id_type_name: string | null;
  id_number: string | null;
}

/** Standardized identity fields. Missing values are null per the API contract. */
export interface ExtractedData {
  id_number: string | null;
  full_name: FullName | null;
  date_of_birth: string | null;
  date_issued: string | null;
  valid_until: string | null;
  personal_data: FieldValue[];
  other_fields: FieldValue[];
  additional_metadata: FieldValue[];
  id_information: IdInformation[];
}

/** An identity type from the configurable registry. */
export interface IdentityType {
  id_type_code: number;
  id_type_name: string;
  is_active: boolean;
  document_type: DocumentType;
}

export interface IdentityTypeResponse {
  count: number;
  items: IdentityType[];
}

export interface PerImageDiagnostic {
  index: number;
  status: 'ok' | 'error';
  lines?: number;
  error_code?: string;
  detail?: string;
}

export interface Diagnostics {
  images_processed: number;
  images_failed: number;
  per_image: PerImageDiagnostic[];
}

export interface OcrSuccess {
  status: 'SUCCESS';
  id_type_code: number | null;
  id_type_name: string | null;
  document_type: DocumentType;
  extracted_data: ExtractedData;
  raw_text_payload: string;
  diagnostics?: Diagnostics;
}

export interface OcrError {
  status: 'ERROR';
  id_type_code: number | null;
  id_type_name: string | null;
  document_type: DocumentType | null;
  extracted_data: ExtractedData | null;
  raw_text_payload: string | null;
  error_code: string;
  message: string;
}

/** A single identity document image submitted by the consuming application. */
export interface IdImage {
  /** Base64-encoded image bytes (data URI or raw base64). */
  image: string;
  /** Optional per-image label, e.g. 'front' | 'back'. */
  label?: string;
}

export interface ExtractOptions {
  /** Optional identity type code from the registry (e.g. 1..14). Rejected if inactive. */
  idTypeCode?: number;
  /** Optional app-supplied document type hint (legacy; ignored when idTypeCode set). */
  documentType?: DocumentType | string;
  /** Backend endpoint. Defaults to '/ocr/extract'. */
  endpoint?: string;
  /** Fetch init overrides. */
  fetchInit?: RequestInit;
}
