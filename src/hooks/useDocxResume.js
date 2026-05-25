/**
 * useDocxResume — React hook backing the new DOCX-native editor.
 *
 * State:
 *   - blob:           current DOCX Blob (drives the live preview)
 *   - zip:            in-memory PizZip instance
 *   - xml:            cached document.xml string
 *   - fieldMap:       { sections, fields }
 *   - fieldValues:    flat { [fieldId]: string } — derived from fieldMap on load,
 *                     updated optimistically as the user edits
 *   - dirty:          unsaved-edits flag
 *   - loading, error
 *
 * Actions:
 *   - loadResume(resumeId)      Fetch Firestore doc + DOCX from Storage; hydrate state.
 *   - updateField(fieldId, value)  Patch XML, regenerate blob/xml, push history.
 *   - save()                    Re-upload blob + persist field map.
 *   - undo() / redo()
 *   - reset(blob, fieldMap)     For initial setup after an import.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  unzipDocx,
  patchXml,
  writeXml,
  zipToBlob,
} from '../services/docxXmlService';
import {
  downloadResumeDocx,
  saveDocxResume,
} from '../services/resumeService';

const HISTORY_LIMIT = 30;

export function useDocxResume() {
  const [resumeId, setResumeId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [blob, setBlob] = useState(null);
  const [fieldMap, setFieldMap] = useState({ sections: [], fields: {} });
  const [fieldValues, setFieldValues] = useState({});
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mutable refs hold the live zip + xml so updates don't cause re-renders
  // until we explicitly call setBlob.
  const zipRef = useRef(null);
  const xmlRef = useRef('');

  // Blob-based history. Each entry is { blob, xml, fieldValues }.
  const historyRef = useRef([]);
  const futureRef = useRef([]);

  const pushHistory = useCallback(() => {
    if (!blob) return;
    historyRef.current.push({ blob, xml: xmlRef.current, fieldValues });
    if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift();
    futureRef.current = [];
  }, [blob, fieldValues]);

  /**
   * Hydrate fieldValues from a fieldMap by reading the `value` already stored
   * on each field record. (The server populates this during parseDocxToFieldMap.)
   */
  const hydrateValues = useCallback((map) => {
    const values = {};
    for (const id of Object.keys(map?.fields || {})) {
      values[id] = map.fields[id]?.value ?? '';
    }
    return values;
  }, []);

  /**
   * Set the initial blob + field map (used right after an import).
   */
  const reset = useCallback(
    ({ blob: newBlob, fieldMap: newMap, resumeId: rid, userId: uid }) => {
      setError(null);
      setResumeId(rid || null);
      setUserId(uid || null);
      setFieldMap(newMap || { sections: [], fields: {} });
      const values = hydrateValues(newMap);
      setFieldValues(values);
      // Initialize zip/xml from blob.
      newBlob.arrayBuffer().then((buf) => {
        const { zip, xml } = unzipDocx(buf);
        zipRef.current = zip;
        xmlRef.current = xml;
        setBlob(newBlob);
        historyRef.current = [];
        futureRef.current = [];
        setDirty(false);
      });
    },
    [hydrateValues]
  );

  /**
   * Load an existing resume from Firestore + Storage.
   */
  const loadResume = useCallback(
    async (rid) => {
      setLoading(true);
      setError(null);
      try {
        const snap = await getDoc(doc(db, 'resumes', rid));
        if (!snap.exists()) throw new Error('Resume not found');
        const data = snap.data();
        if (!data.docxStoragePath) {
          throw new Error('This resume has no DOCX file (legacy format). Please re-import.');
        }
        const newBlob = await downloadResumeDocx(data.docxStoragePath);
        const map = { sections: data.sections || [], fields: data.fields || {} };
        const buf = await newBlob.arrayBuffer();
        const { zip, xml } = unzipDocx(buf);
        zipRef.current = zip;
        xmlRef.current = xml;
        setResumeId(rid);
        setUserId(data.userId);
        setBlob(newBlob);
        setFieldMap(map);
        setFieldValues(hydrateValues(map));
        historyRef.current = [];
        futureRef.current = [];
        setDirty(false);
        return { ...data, id: rid };
      } catch (e) {
        setError(e?.message || String(e));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [hydrateValues]
  );

  /**
   * Update a single field's text. Patches XML, regenerates blob, pushes
   * history. Caller is responsible for debouncing if invoked per-keystroke.
   */
  const updateField = useCallback(
    (fieldId, newText) => {
      const field = fieldMap.fields?.[fieldId];
      if (!field || !zipRef.current) return;
      pushHistory();
      const patched = patchXml(xmlRef.current, field.nodeIds, String(newText ?? ''));
      xmlRef.current = patched;
      writeXml(zipRef.current, patched);
      const newBlob = zipToBlob(zipRef.current);
      setBlob(newBlob);
      setFieldValues((prev) => ({ ...prev, [fieldId]: newText }));
      // Reflect into fieldMap.value so saves persist current state.
      setFieldMap((prev) => ({
        ...prev,
        fields: { ...prev.fields, [fieldId]: { ...prev.fields[fieldId], value: newText } },
      }));
      setDirty(true);
    },
    [fieldMap, pushHistory]
  );

  /**
   * Apply multiple field edits in one batch (e.g. AI-rewritten bullets).
   */
  const updateFields = useCallback(
    (edits /* { [fieldId]: newText } */) => {
      const ids = Object.keys(edits || {});
      if (ids.length === 0 || !zipRef.current) return;
      pushHistory();
      let xml = xmlRef.current;
      for (const id of ids) {
        const field = fieldMap.fields?.[id];
        if (!field) continue;
        xml = patchXml(xml, field.nodeIds, String(edits[id] ?? ''));
      }
      xmlRef.current = xml;
      writeXml(zipRef.current, xml);
      const newBlob = zipToBlob(zipRef.current);
      setBlob(newBlob);
      setFieldValues((prev) => {
        const next = { ...prev };
        for (const id of ids) next[id] = edits[id];
        return next;
      });
      setFieldMap((prev) => {
        const fields = { ...prev.fields };
        for (const id of ids) {
          if (fields[id]) fields[id] = { ...fields[id], value: edits[id] };
        }
        return { ...prev, fields };
      });
      setDirty(true);
    },
    [fieldMap, pushHistory]
  );

  const undo = useCallback(() => {
    const last = historyRef.current.pop();
    if (!last) return;
    futureRef.current.push({ blob, xml: xmlRef.current, fieldValues });
    // Re-unzip from last.blob so zipRef stays in sync.
    last.blob.arrayBuffer().then((buf) => {
      const { zip, xml } = unzipDocx(buf);
      zipRef.current = zip;
      xmlRef.current = xml;
      setBlob(last.blob);
      setFieldValues(last.fieldValues);
      setDirty(true);
    });
  }, [blob, fieldValues]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current.push({ blob, xml: xmlRef.current, fieldValues });
    next.blob.arrayBuffer().then((buf) => {
      const { zip, xml } = unzipDocx(buf);
      zipRef.current = zip;
      xmlRef.current = xml;
      setBlob(next.blob);
      setFieldValues(next.fieldValues);
      setDirty(true);
    });
  }, [blob, fieldValues]);

  const save = useCallback(async () => {
    if (!resumeId || !userId || !blob) return;
    setLoading(true);
    try {
      const extractedText = Object.values(fieldValues).join('\n');
      await saveDocxResume(userId, resumeId, blob, fieldMap, extractedText);
      setDirty(false);
    } finally {
      setLoading(false);
    }
  }, [resumeId, userId, blob, fieldMap, fieldValues]);

  const canUndo = historyRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  // Group field IDs by section and item index for the editor UI.
  const groupedFields = useMemo(() => {
    const groups = {};
    for (const id of Object.keys(fieldMap.fields || {})) {
      const f = fieldMap.fields[id];
      const sectionId = f.sectionId || 'unknown';
      const itemKey = String(f.itemIndex ?? -1);
      groups[sectionId] = groups[sectionId] || {};
      groups[sectionId][itemKey] = groups[sectionId][itemKey] || [];
      groups[sectionId][itemKey].push({ id, ...f });
    }
    return groups;
  }, [fieldMap]);

  return {
    // state
    resumeId,
    blob,
    fieldMap,
    fieldValues,
    groupedFields,
    dirty,
    loading,
    error,
    canUndo,
    canRedo,
    // actions
    loadResume,
    reset,
    updateField,
    updateFields,
    save,
    undo,
    redo,
  };
}
