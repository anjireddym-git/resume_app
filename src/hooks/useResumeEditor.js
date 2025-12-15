import { useState, useCallback, useRef } from 'react';

/**
 * useResumeEditor - Custom hook for managing resume state with undo/redo
 */
const useResumeEditor = (initialData) => {
  const [resumeData, setResumeData] = useState(initialData);
  const [isEditMode, setIsEditMode] = useState(false);
  const historyRef = useRef([initialData]);
  const historyIndexRef = useRef(0);

  // Update a specific field in the resume
  const updateField = useCallback((path, value) => {
    setResumeData(prev => {
      const newData = JSON.parse(JSON.stringify(prev)); // Deep clone
      
      // Navigate to the field using path (e.g., 'personalInfo.name' or 'experience.0.position')
      const keys = path.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = isNaN(keys[i]) ? keys[i] : parseInt(keys[i]);
        if (current[key] === undefined) {
          current[key] = isNaN(keys[i + 1]) ? {} : [];
        }
        current = current[key];
      }
      
      const lastKey = isNaN(keys[keys.length - 1]) ? keys[keys.length - 1] : parseInt(keys[keys.length - 1]);
      current[lastKey] = value;
      
      // Add to history
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      historyRef.current.push(newData);
      historyIndexRef.current = historyRef.current.length - 1;
      
      return newData;
    });
  }, []);

  // Add an item to an array field
  const addItem = useCallback((path, item) => {
    setResumeData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let current = newData;
      
      for (const key of keys) {
        const k = isNaN(key) ? key : parseInt(key);
        current = current[k];
      }
      
      if (Array.isArray(current)) {
        current.push(item);
      }
      
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      historyRef.current.push(newData);
      historyIndexRef.current = historyRef.current.length - 1;
      
      return newData;
    });
  }, []);

  // Remove an item from an array field
  const removeItem = useCallback((path, index) => {
    setResumeData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let current = newData;
      
      for (const key of keys) {
        const k = isNaN(key) ? key : parseInt(key);
        current = current[k];
      }
      
      if (Array.isArray(current)) {
        current.splice(index, 1);
      }
      
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      historyRef.current.push(newData);
      historyIndexRef.current = historyRef.current.length - 1;
      
      return newData;
    });
  }, []);

  // Undo last change
  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      setResumeData(historyRef.current[historyIndexRef.current]);
    }
  }, []);

  // Redo last undone change
  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      setResumeData(historyRef.current[historyIndexRef.current]);
    }
  }, []);

  // Reset to initial data
  const reset = useCallback((newData) => {
    const data = newData || initialData;
    setResumeData(data);
    historyRef.current = [data];
    historyIndexRef.current = 0;
  }, [initialData]);

  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    setIsEditMode(prev => !prev);
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  return {
    resumeData,
    setResumeData,
    isEditMode,
    setIsEditMode,
    toggleEditMode,
    updateField,
    addItem,
    removeItem,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  };
};

export default useResumeEditor;
