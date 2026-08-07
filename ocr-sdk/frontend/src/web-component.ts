/**
 * Optional framework-agnostic custom element wrapper around the headless SDK.
 *
 * Usage:
 *   <svi-id-ocr endpoint="/ocr/extract" document-type="BATAENO_PASS_ID"></svi-id-ocr>
 *
 * Attributes:
 *   - endpoint (optional): backend wrapper URL. Default '/ocr/extract'.
 *   - id-type-code (optional): identity type code from the registry (e.g. 14).
 *   - document-type (optional): app-supplied document type hint (legacy).
 *
 * Methods:
 *   - element.extract(images: IdImage[]): Promise<ExtractResult>
 *
 * Events:
 *   - 'svi-ocr-start'  (detail: { images })
 *   - 'svi-ocr-success'(detail: OcrSuccess)
 *   - 'svi-ocr-error'  (detail: OcrError)
 */
import type { IdImage, OcrError, OcrSuccess } from './types';
import type { ExtractResult } from './client';
import { extractDocument } from './client';

export class SviIdOcrElement extends HTMLElement {
  connectedCallback(): void {
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'presentation');
    }
  }

  async extract(images: IdImage[]): Promise<ExtractResult> {
    this.dispatchEvent(new CustomEvent('svi-ocr-start', { detail: { images } }));

    const idTypeAttr = this.getAttribute('id-type-code');
    const result = await extractDocument(images, {
      endpoint: this.getAttribute('endpoint') ?? undefined,
      idTypeCode: idTypeAttr ? Number(idTypeAttr) : undefined,
      documentType: this.getAttribute('document-type') ?? undefined,
    });

    if (result.ok && result.data) {
      this.dispatchEvent(
        new CustomEvent<OcrSuccess>('svi-ocr-success', { detail: result.data }),
      );
    } else if (result.error) {
      this.dispatchEvent(
        new CustomEvent<OcrError>('svi-ocr-error', { detail: result.error }),
      );
    }

    return result;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('svi-id-ocr')) {
  customElements.define('svi-id-ocr', SviIdOcrElement);
}
