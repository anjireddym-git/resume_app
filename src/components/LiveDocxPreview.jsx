import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, FileText, Loader2, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { renderDocx } from '../services/docxPreviewService';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1.4;
const ZOOM_STEP = 0.1;
const VIEWPORT_PADDING = 32;

function clampZoom(value) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

/**
 * LiveDocxPreview
 *
 * Renders the current DOCX blob inside a scrollable container using
 * docx-preview. Re-renders whenever the blob reference changes; debounced to
 * avoid thrashing during rapid edits.
 */
const LiveDocxPreview = ({ blob, debounceMs = 200 }) => {
  const viewportRef = useRef(null);
  const renderRef = useRef(null);
  const measureRef = useRef({ pageWidth: 0, contentHeight: 0, contentWidth: 0, pageCount: 0 });
  const zoomRef = useRef(1);
  const zoomModeRef = useRef('fit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoomMode, setZoomMode] = useState('fit');
  const [zoom, setZoom] = useState(1);
  const [metrics, setMetrics] = useState({ width: 0, height: 0, pageCount: 0 });

  const measureDocument = useCallback((modeOverride) => {
    const viewport = viewportRef.current;
    const renderRoot = renderRef.current;
    if (!viewport || !renderRoot) return;

    const pages = Array.from(renderRoot.querySelectorAll('section.docx'));
    const firstPage = pages[0] || renderRoot.querySelector('.docx');
    if (!firstPage) return;

    const activeZoom = zoomRef.current;
    const activeZoomMode = modeOverride || zoomModeRef.current;
    const viewportStyle = window.getComputedStyle(viewport);
    const horizontalPadding =
      parseFloat(viewportStyle.paddingLeft || '0') + parseFloat(viewportStyle.paddingRight || '0');
    const pageWidth = firstPage.offsetWidth || firstPage.getBoundingClientRect().width / Math.max(activeZoom, 0.01);
    const contentWidth = renderRoot.scrollWidth || pageWidth;
    const contentHeight = renderRoot.scrollHeight || firstPage.offsetHeight || firstPage.getBoundingClientRect().height;
    const availableWidth = Math.max(180, viewport.clientWidth - horizontalPadding);
    const fitZoom = clampZoom(availableWidth / Math.max(1, pageWidth));
    const nextZoom = activeZoomMode === 'fit' ? fitZoom : activeZoom;

    measureRef.current = {
      pageWidth,
      contentWidth,
      contentHeight,
      pageCount: pages.length || 1,
    };
    setMetrics({
      width: Math.ceil(contentWidth * nextZoom),
      height: Math.ceil(contentHeight * nextZoom),
      pageCount: pages.length || 1,
    });
    if (activeZoomMode === 'fit' && Math.abs(activeZoom - fitZoom) > 0.005) setZoom(fitZoom);
  }, []);

  const queueMeasure = useCallback((modeOverride) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => measureDocument(modeOverride));
    });
  }, [measureDocument]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    zoomModeRef.current = zoomMode;
  }, [zoomMode]);

  useEffect(() => {
    if (!blob || !renderRef.current) return;
    let cancelled = false;
    const measureTimers = [];
    zoomModeRef.current = 'fit';
    setZoomMode('fit');
    setError(null);
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        await renderDocx(blob, renderRef.current);
        if (!cancelled) {
          measureDocument('fit');
          queueMeasure('fit');
          [50, 150, 350, 700].forEach((delay) => {
            measureTimers.push(setTimeout(() => {
              if (!cancelled) {
                measureDocument('fit');
                queueMeasure('fit');
              }
            }, delay));
          });
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, debounceMs);
    return () => {
      cancelled = true;
      clearTimeout(t);
      measureTimers.forEach(clearTimeout);
    };
  }, [blob, debounceMs, measureDocument, queueMeasure]);

  useEffect(() => {
    if (zoomMode === 'fit') queueMeasure('fit');
  }, [queueMeasure, zoomMode]);

  useEffect(() => {
    if (!viewportRef.current) return undefined;
    const observer = new ResizeObserver(() => {
      if (zoomModeRef.current === 'fit') queueMeasure();
    });
    observer.observe(viewportRef.current);
    if (renderRef.current) observer.observe(renderRef.current);
    return () => observer.disconnect();
  }, [queueMeasure]);

  useEffect(() => {
    if (!renderRef.current) return undefined;
    const observer = new MutationObserver(() => {
      if (zoomModeRef.current === 'fit') queueMeasure();
    });
    observer.observe(renderRef.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [queueMeasure]);

  useEffect(() => {
    const current = measureRef.current;
    if (!current.contentWidth || !current.contentHeight) return;
    setMetrics({
      width: Math.ceil(current.contentWidth * zoom),
      height: Math.ceil(current.contentHeight * zoom),
      pageCount: current.pageCount,
    });
  }, [zoom]);

  const setManualZoom = (nextZoom) => {
    setZoomMode('manual');
    setZoom(clampZoom(nextZoom));
  };

  const fitToWidth = () => {
    zoomModeRef.current = 'fit';
    setZoomMode('fit');
    measureDocument('fit');
    queueMeasure('fit');
  };

  if (!blob) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-100 text-neutral-400">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No DOCX loaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-neutral-100 overflow-hidden relative">
      <div className="h-10 px-3 border-b border-neutral-200 bg-white flex items-center justify-between flex-shrink-0">
        <div className="text-xs text-neutral-500 flex items-center gap-2 min-w-0">
          <FileText className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">
            {metrics.pageCount ? `${metrics.pageCount} page${metrics.pageCount === 1 ? '' : 's'}` : 'DOCX'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={fitToWidth}
            className={`h-7 px-2 rounded text-xs border transition-colors ${
              zoomMode === 'fit'
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
            title="Fit page to preview width"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setManualZoom(zoom - ZOOM_STEP)}
            className="h-7 w-7 rounded border border-neutral-200 text-neutral-600 hover:bg-neutral-50 inline-flex items-center justify-center disabled:opacity-40"
            title="Zoom out"
            disabled={zoom <= MIN_ZOOM + 0.01}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setManualZoom(1)}
            className="h-7 min-w-14 rounded border border-neutral-200 px-2 text-xs text-neutral-600 hover:bg-neutral-50"
            title="Reset zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setManualZoom(zoom + ZOOM_STEP)}
            className="h-7 w-7 rounded border border-neutral-200 text-neutral-600 hover:bg-neutral-50 inline-flex items-center justify-center disabled:opacity-40"
            title="Zoom in"
            disabled={zoom >= MAX_ZOOM - 0.01}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {loading && (
        <div className="absolute top-12 right-3 z-10 flex items-center gap-2 bg-neutral-900/80 text-white text-xs px-2 py-1 rounded">
          <Loader2 className="w-3 h-3 animate-spin" />
          Updating preview
        </div>
      )}
      {error && (
        <div className="absolute top-12 left-3 right-3 z-10 flex items-start gap-2 bg-red-900/85 text-red-100 text-xs p-2 rounded">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div
        ref={viewportRef}
        className="docx-viewer-viewport flex-1 min-h-0 overflow-auto bg-neutral-200"
        style={{ minHeight: 0 }}
      >
        <div
          className="docx-viewer-stage mx-auto"
          style={{
            width: metrics.width ? `${metrics.width}px` : 'max-content',
            minHeight: metrics.height ? `${metrics.height + VIEWPORT_PADDING}px` : '100%',
          }}
        >
          <div
            ref={renderRef}
            className="docx-viewer-render"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default LiveDocxPreview;
