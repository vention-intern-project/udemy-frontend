import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Document, Page, pdfjs } from 'react-pdf';
import { useTranslation } from 'react-i18next';
import 'react-pdf/dist/Page/TextLayer.css';

import { Button } from '@shared/ui/primitives';

import styles from './LessonPdfPreview.module.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PDF_OPTIONS = { isEvalSupported: false } as const;

type PdfPreviewStatus = 'loading' | 'rendering' | 'ready' | 'error';
type PdfNavigationDirection = 'previous' | 'next';

export interface LessonPdfPreviewProps {
  readonly file: Blob;
}

function boundedPageWidth(element: HTMLElement): number | undefined {
  const computedStyle = getComputedStyle(element);
  const paddingStart = Number.parseFloat(computedStyle.paddingInlineStart) || 0;
  const paddingEnd = Number.parseFloat(computedStyle.paddingInlineEnd) || 0;
  const width = Math.floor(element.clientWidth - paddingStart - paddingEnd);
  return width > 0 ? width : undefined;
}

export function LessonPdfPreview({ file }: LessonPdfPreviewProps) {
  const { t } = useTranslation();
  const previewRef = useRef<HTMLElement>(null);
  const pageHostRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const retryRef = useRef<HTMLDivElement>(null);
  const renderPendingRef = useRef(false);
  const navigationDirectionRef = useRef<PdfNavigationDirection | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<PdfPreviewStatus>('loading');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [pageWidth, setPageWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    const pageHost = pageHostRef.current;
    if (!pageHost) return undefined;
    const updateWidth = () => setPageWidth(boundedPageWidth(pageHost));
    updateWidth();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
    const observer = new ResizeObserver(updateWidth);
    observer.observe(pageHost);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (status === 'error') retryRef.current?.querySelector('button')?.focus();
  }, [status]);

  const handleDocumentLoad = useCallback((document: PDFDocumentProxy) => {
    renderPendingRef.current = true;
    navigationDirectionRef.current = null;
    setPageCount(document.numPages);
    setPageNumber(1);
    setStatus('rendering');
  }, []);

  const handleFailure = useCallback(() => {
    previewRef.current?.focus();
    renderPendingRef.current = false;
    navigationDirectionRef.current = null;
    setStatus('error');
  }, []);
  const handleRenderSuccess = useCallback(() => {
    const navigationDirection = navigationDirectionRef.current;
    renderPendingRef.current = false;
    navigationDirectionRef.current = null;
    if (navigationDirection === null || pageCount === null) {
      previewRef.current?.focus();
    } else {
      const [previousButton, nextButton] = navigationRef.current?.querySelectorAll('button') ?? [];
      const focusTarget =
        pageNumber <= 1
          ? nextButton
          : pageNumber >= pageCount
            ? previousButton
            : navigationDirection === 'next'
              ? nextButton
              : previousButton;
      focusTarget?.focus();
    }
    setStatus('ready');
  }, [pageCount, pageNumber]);

  const retry = () => {
    renderPendingRef.current = false;
    navigationDirectionRef.current = null;
    setPageCount(null);
    setPageNumber(1);
    setStatus('loading');
    setAttempt((currentAttempt) => currentAttempt + 1);
  };

  const showPage = (nextPage: number, direction: PdfNavigationDirection) => {
    if (renderPendingRef.current || pageCount === null || nextPage < 1 || nextPage > pageCount)
      return;
    renderPendingRef.current = true;
    navigationDirectionRef.current = direction;
    setPageNumber(nextPage);
    setStatus('rendering');
  };

  const statusMessage =
    status === 'error'
      ? t('learning:pdfCouldNotBeDisplayedTry', {
          defaultValue: 'PDF could not be displayed. Try again.',
        })
      : status === 'ready' && pageCount !== null
        ? t('learning:pdfReadyPageOf', {
            currentPage: pageNumber,
            totalPages: pageCount,
            defaultValue: `PDF ready. Page ${pageNumber} of ${pageCount}.`,
          })
        : status === 'rendering'
          ? t('learning:renderingPdfPage', {
              currentPage: pageNumber,
              defaultValue: `Rendering PDF page ${pageNumber}.`,
            })
          : t('learning:loadingPdfPreview', { defaultValue: 'Loading PDF preview…' });

  return (
    <section
      ref={previewRef}
      className={styles.preview}
      role="region"
      aria-label={t('learning:lessonPdfPreview', { defaultValue: 'Lesson PDF preview' })}
      tabIndex={-1}
    >
      <div className={styles.toolbar}>
        <p className={styles.status} role="status" aria-live="polite">
          {statusMessage}
        </p>
        {pageCount !== null && pageCount > 1 ? (
          <div
            ref={navigationRef}
            className={styles.navigation}
            aria-label={t('learning:pdfPages', { defaultValue: 'PDF pages' })}
            aria-busy={status === 'rendering' ? true : undefined}
          >
            <Button
              variant="secondary"
              size="sm"
              disabled={status !== 'rendering' && pageNumber <= 1}
              onClick={() => showPage(pageNumber - 1, 'previous')}
            >
              {t('course:previousPage')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={status !== 'rendering' && pageNumber >= pageCount}
              onClick={() => showPage(pageNumber + 1, 'next')}
            >
              {t('course:nextPage')}
            </Button>
          </div>
        ) : null}
      </div>
      {status === 'error' ? (
        <div ref={retryRef} className={styles.retry}>
          <Button variant="secondary" onClick={retry}>
            {t('learning:tryPdfAgain', { defaultValue: 'Try PDF again' })}
          </Button>
        </div>
      ) : (
        <div ref={pageHostRef} className={styles.pageViewport} data-part="lesson-pdf-viewport">
          <Document
            key={attempt}
            file={file}
            options={PDF_OPTIONS}
            loading={null}
            error={null}
            noData={null}
            onLoadSuccess={handleDocumentLoad}
            onLoadError={handleFailure}
            onSourceError={handleFailure}
          >
            {pageCount !== null ? (
              <Page
                className={styles.page}
                pageNumber={pageNumber}
                width={pageWidth}
                renderAnnotationLayer={false}
                renderForms={false}
                renderTextLayer
                loading={null}
                error={null}
                noData={null}
                onLoadError={handleFailure}
                onRenderError={handleFailure}
                onGetTextError={handleFailure}
                onRenderSuccess={handleRenderSuccess}
              />
            ) : null}
          </Document>
        </div>
      )}
    </section>
  );
}

export default LessonPdfPreview;
