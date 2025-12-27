import React, { useState } from 'react';
import { Slide, TextBlock, ImageBlock, StoryboardFrameBlock } from '../types';
import { Layout, Image, FileText, Film, Plus, Type, Sparkles, GripVertical } from 'lucide-react';

interface DeckRailProps {
  slides: Slide[];
  selectedSlideId: string | null;
  onSelectSlide: (slideId: string) => void;
  onAddSlide: () => void;
  onDeleteSlide: (slideId: string) => void;
  onReorderSlides: (dragIndex: number, hoverIndex: number) => void;
}

const SlideThumbnail: React.FC<{ slide: Slide }> = React.memo(({ slide }) => {
  const titleBlock = slide.blocks.find(b => b.type === 'TITLE') as TextBlock | undefined;
  const bodyBlock = slide.blocks.find(b => b.type === 'BODY_TEXT') as TextBlock | undefined;
  const imageBlock = slide.blocks.find(b => b.type === 'IMAGE') as ImageBlock | undefined;
  
  const containerStyle: React.CSSProperties = {
    backgroundColor: slide.backgroundColor || 'white',
    backgroundImage: slide.backgroundImage ? `url(${slide.backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  const content = (
    <div className="w-full h-full p-2 flex flex-col justify-between overflow-hidden">
        {titleBlock && <div className="text-[6px] font-black uppercase text-gray-900 line-clamp-1">{titleBlock.content.text}</div>}
        {imageBlock && <div className="flex-1 bg-gray-100 rounded my-1 overflow-hidden"><img src={imageBlock.content.url} className="w-full h-full object-cover"/></div>}
        {!imageBlock && bodyBlock && <div className="text-[4px] text-gray-400 line-clamp-3">{bodyBlock.content.text}</div>}
    </div>
  );

  return (
    <div className="w-full h-full relative bg-white" style={containerStyle}>
        {content}
    </div>
  );
});

const DeckRail: React.FC<DeckRailProps> = ({ 
    slides, 
    selectedSlideId, 
    onSelectSlide, 
    onAddSlide,
    onDeleteSlide,
    onReorderSlides 
}) => {
  const [draggedSlideIndex, setDraggedSlideIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
      setDraggedSlideIndex(index);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedSlideIndex !== null && draggedSlideIndex !== index) {
          onReorderSlides(draggedSlideIndex, index);
      }
      setDraggedSlideIndex(null);
  };

  return (
    <div className="h-44 bg-gray-950 border-t border-gray-800 flex flex-col shrink-0 z-40 select-none">
      <div className="h-8 px-4 flex items-center justify-between bg-gray-900 border-b border-gray-800 text-[9px] text-gray-500 font-black uppercase tracking-[0.2em]">
        <span>DECK NAVIGATION</span>
        <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">{slides.length} PLATES</span>
      </div>

      <div className="flex-1 overflow-x-auto p-4 flex gap-4 items-center custom-scrollbar">
        {slides.map((slide, index) => {
          const isSelected = selectedSlideId === slide.id;
          const isDragged = draggedSlideIndex === index;

          return (
            <div
              key={slide.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, index)}
              onClick={() => onSelectSlide(slide.id)}
              className={`
                group relative flex-shrink-0 w-48 h-28 rounded-xl border-2 cursor-pointer transition-all duration-300 flex flex-col bg-white overflow-hidden shadow-2xl
                ${isSelected ? 'border-blue-500 scale-105 z-10' : 'border-gray-800 opacity-60 hover:opacity-100 hover:border-gray-600'}
                ${isDragged ? 'opacity-20 scale-95 border-dashed' : ''}
              `}
            >
              <div className="flex-1 overflow-hidden relative">
                  <SlideThumbnail slide={slide} />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none"/>
                  <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical size={12} className="text-gray-400" />
                  </div>
              </div>

              <div className={`h-6 px-3 flex items-center justify-between text-[8px] font-black uppercase tracking-widest ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-500'}`}>
                <span className="flex items-center gap-2">
                   <span className="opacity-50">{index + 1}</span>
                   {slide.type}
                </span>
                {slide.isDraft && <Sparkles size={8} className="text-purple-300"/>}
              </div>
            </div>
          );
        })}

        {/* R10: Add New Slide Button ONLY HERE */}
        <button 
          onClick={onAddSlide}
          className="flex-shrink-0 w-20 h-28 rounded-xl border-2 border-dashed border-gray-800 hover:border-blue-500/50 hover:bg-blue-500/5 cursor-pointer flex flex-col items-center justify-center text-gray-700 hover:text-blue-500 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all mb-2 shadow-lg">
              <Plus size={20} />
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest">Add Plate</span>
        </button>
      </div>
    </div>
  );
};

export default DeckRail;
