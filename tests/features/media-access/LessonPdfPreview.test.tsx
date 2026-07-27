// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const pdfMocks = vi.hoisted(() => ({
  documentMode: 'success' as 'success' | 'error',
  pageMode: 'success' as 'success' | 'error' | 'pending',
  documentProps: null as Record<string, unknown> | null,
  pageProps: null as Record<string, unknown> | null,
  pageRenderCount: 0,
  finishPageRender: null as (() => void) | null,
  failPageRender: null as (() => void) | null,
  workerOptions: { workerSrc: '' },
}));

interface MockDocumentProps extends Record<string, unknown> {
  readonly children?: ReactNode;
  readonly onLoadSuccess?: (result: { numPages: number }) => void;
  readonly onLoadError?: () => void;
}

interface MockPageProps extends Record<string, unknown> {
  readonly pageNumber: number;
  readonly onRenderSuccess?: () => void;
  readonly onRenderError?: () => void;
}

vi.mock('react-pdf', () => ({
  pdfjs: { GlobalWorkerOptions: pdfMocks.workerOptions },
  Document: ({ children, onLoadSuccess, onLoadError, ...props }: MockDocumentProps) => {
    pdfMocks.documentProps = { ...props, onLoadSuccess, onLoadError };
    useEffect(() => {
      if (pdfMocks.documentMode === 'error') onLoadError?.();
      else onLoadSuccess?.({ numPages: 2 });
    }, [onLoadError, onLoadSuccess]);
    return <div data-testid="pdf-document">{children}</div>;
  },
  Page: ({ pageNumber, onRenderSuccess, onRenderError, ...props }: MockPageProps) => {
    pdfMocks.pageProps = { ...props, pageNumber, onRenderSuccess, onRenderError };
    useEffect(() => {
      pdfMocks.pageRenderCount += 1;
      pdfMocks.finishPageRender = onRenderSuccess ?? null;
      pdfMocks.failPageRender = onRenderError ?? null;
      if (pdfMocks.pageMode === 'pending') return;
      if (pdfMocks.pageMode === 'error') onRenderError?.();
      else onRenderSuccess?.();
    }, [onRenderError, onRenderSuccess, pageNumber]);
    return <><canvas aria-label={`Rendered PDF page ${pageNumber}`} /><span>Page {pageNumber} text</span></>;
  },
}));

import { LessonPdfPreview } from '../../../src/features/media-access/LessonPdfPreview';

afterEach(() => {
  pdfMocks.documentMode = 'success';
  pdfMocks.pageMode = 'success';
  pdfMocks.documentProps = null;
  pdfMocks.pageProps = null;
  pdfMocks.pageRenderCount = 0;
  pdfMocks.finishPageRender = null;
  pdfMocks.failPageRender = null;
});

describe('LessonPdfPreview', () => {
  it('renders an admitted Blob in-page with secure options and bounded page navigation', async () => {
    const file = new Blob(['%PDF'], { type: 'application/pdf' });
    render(<LessonPdfPreview file={file} />);

    const preview = await screen.findByRole('region', { name: 'Lesson PDF preview' });
    await waitFor(() => expect(screen.getByLabelText('Rendered PDF page 1')).toBeTruthy());
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Page 1 of 2'));
    expect(document.activeElement).toBe(preview);
    expect(screen.getByRole('status').textContent).toContain('Page 1 of 2');
    expect(pdfMocks.documentProps).toEqual(expect.objectContaining({ file, options: { isEvalSupported: false } }));
    expect(pdfMocks.pageProps).toEqual(expect.objectContaining({ pageNumber: 1, renderAnnotationLayer: false }));
    expect(pdfMocks.workerOptions.workerSrc).toContain('pdf.worker.min.mjs');
    expect(document.querySelector('iframe, object, embed, a')).toBeNull();

    const viewport = document.querySelector('[data-part="lesson-pdf-viewport"]');
    if (!(viewport instanceof HTMLElement)) throw new Error('PDF viewport was not rendered.');
    Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 304 });
    viewport.style.paddingInlineStart = '8px';
    viewport.style.paddingInlineEnd = '8px';
    fireEvent(window, new Event('resize'));
    await waitFor(() => expect(pdfMocks.pageProps).toEqual(expect.objectContaining({ width: 288 })));

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(screen.getByLabelText('Rendered PDF page 2')).toBeTruthy());
    expect(screen.getByRole('status').textContent).toContain('Page 2 of 2');
    expect(screen.getByRole('button', { name: 'Next page' })).toHaveProperty('disabled', true);

    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    await waitFor(() => expect(screen.getByLabelText('Rendered PDF page 1')).toBeTruthy());
  });

  it('keeps one navigation action focused and duplicate-safe while a page render is pending', async () => {
    render(<LessonPdfPreview file={new Blob(['%PDF'], { type: 'application/pdf' })} />);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Page 1 of 2'));

    const initialRenderCount = pdfMocks.pageRenderCount;
    const next = screen.getByRole('button', { name: 'Next page' });
    pdfMocks.pageMode = 'pending';
    next.focus();
    fireEvent.click(next);

    expect(screen.getByRole('status').textContent).toBe('Rendering PDF page 2.');
    expect(next).toHaveProperty('disabled', false);
    expect(document.activeElement).toBe(next);
    fireEvent.click(next);
    expect(pdfMocks.pageRenderCount).toBe(initialRenderCount + 1);

    act(() => pdfMocks.finishPageRender?.());
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Page 2 of 2'));
    const previous = screen.getByRole('button', { name: 'Previous page' });
    expect(document.activeElement).toBe(previous);
    expect(next).toHaveProperty('disabled', true);

    pdfMocks.pageMode = 'pending';
    fireEvent.click(previous);
    expect(previous).toHaveProperty('disabled', false);
    expect(document.activeElement).toBe(previous);
    act(() => pdfMocks.finishPageRender?.());
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Page 1 of 2'));
    expect(document.activeElement).toBe(next);
  });

  it('moves a failed pending page render through an intentional region to the retry action', async () => {
    render(<LessonPdfPreview file={new Blob(['%PDF'], { type: 'application/pdf' })} />);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Page 1 of 2'));

    const next = screen.getByRole('button', { name: 'Next page' });
    pdfMocks.pageMode = 'pending';
    next.focus();
    fireEvent.click(next);
    expect(document.activeElement).toBe(next);

    act(() => pdfMocks.failPageRender?.());
    const retry = await screen.findByRole('button', { name: 'Try PDF again' });
    expect(document.activeElement).toBe(retry);
  });

  it.each(['document', 'page'] as const)('shows a safe retry target after a %s failure', async (failureKind) => {
    if (failureKind === 'document') pdfMocks.documentMode = 'error';
    else pdfMocks.pageMode = 'error';
    render(<LessonPdfPreview file={new Blob(['%PDF'], { type: 'application/pdf' })} />);

    const retry = await screen.findByRole('button', { name: 'Try PDF again' });
    expect(screen.getByRole('status').textContent).toBe('PDF could not be displayed. Try again.');
    expect(document.activeElement).toBe(retry);

    pdfMocks.documentMode = 'success';
    pdfMocks.pageMode = 'success';
    fireEvent.click(retry);
    await waitFor(() => expect(screen.getByLabelText('Rendered PDF page 1')).toBeTruthy());
  });
});
