/** SVI Reusable ID OCR Front-End SDK (CPS-381).
 *
 * Headless TypeScript library: accepts one or more identity document images,
 * submits them to the backend wrapper, and returns a standardized JSON contract.
 * The SDK never determines front/back of an ID and never calls AWS/GROQ directly.
 */
export { extractDocument, listIdentityTypes } from './client';
export type { ExtractResult, ListTypesResult } from './client';
export type {
  DocumentType,
  FullName,
  FieldValue,
  IdInformation,
  ExtractedData,
  IdentityType,
  IdentityTypeResponse,
  PerImageDiagnostic,
  Diagnostics,
  OcrSuccess,
  OcrError,
  IdImage,
  ExtractOptions,
} from './types';
export { SviIdOcrElement } from './web-component';
import './web-component';
