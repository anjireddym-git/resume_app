import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import { SECTION_LABELS } from '../config/templates';

// Sortable item component
const SortableItem = ({ id, isVisible, onToggleVisibility }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 bg-white rounded-lg border ${
        isDragging ? 'border-neutral-400 shadow-lg' : 'border-neutral-200'
      } ${!isVisible ? 'opacity-50' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-neutral-400 hover:text-neutral-600 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      
      <span className="flex-1 text-sm text-neutral-700">
        {SECTION_LABELS[id] || id}
      </span>
      
      <button
        onClick={() => onToggleVisibility(id)}
        className="p-1 text-neutral-400 hover:text-neutral-600"
        title={isVisible ? 'Hide section' : 'Show section'}
      >
        {isVisible ? (
          <Eye className="w-4 h-4" />
        ) : (
          <EyeOff className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

const SectionReorder = ({ sections, visibleSections, onReorder, onToggleVisibility }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.indexOf(active.id);
      const newIndex = sections.indexOf(over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove([...sections], oldIndex, newIndex);
        onReorder(newOrder);
      }
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-500 mb-2">
        Drag to reorder, click eye to hide/show
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <SortableContext items={sections} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {sections.map((sectionId) => (
              <SortableItem
                key={sectionId}
                id={sectionId}
                isVisible={visibleSections.includes(sectionId)}
                onToggleVisibility={onToggleVisibility}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default SectionReorder;
