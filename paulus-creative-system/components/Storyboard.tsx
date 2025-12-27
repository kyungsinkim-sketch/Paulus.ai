import React, { useState } from 'react';
import { Deck, StoryboardFrameBlock } from '../types';
import { Image, Loader2, RefreshCw } from 'lucide-react';
import { generateCreativeImage } from '../services/geminiService';

interface StoryboardProps {
  deck: Deck;
  onUpdateDeck: (updatedDeck: Deck) => void;
}

const Storyboard: React.FC<StoryboardProps> = ({ deck, onUpdateDeck }) => {
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // Find all storyboard slides
  const storyboardSlides = deck.slides.filter(s => s.type === 'STORYBOARD');

  const handleGenerateImage = async (block: StoryboardFrameBlock) => {
    if (!block.content.caption) return;
    setGeneratingId(block.id);
    
    // Construct a prompt for Nano Banana
    const prompt = `Storyboard sketch, detailed, cinematic, ${block.content.caption}, scene ${block.frameIndex}`;
    
    const base64Image = await generateCreativeImage(prompt);
    
    if (base64Image) {
        // Find slide and update block
        const newSlides = deck.slides.map(slide => {
             const foundBlock = slide.blocks.find(b => b.id === block.id);
             if (foundBlock) {
                 const newBlocks = slide.blocks.map(b => b.id === block.id 
                    ? { ...b, content: { ...b.content, imageUrl: base64Image } } as StoryboardFrameBlock 
                    : b);
                 return { ...slide, blocks: newBlocks };
             }
             return slide;
        });
        onUpdateDeck({ ...deck, slides: newSlides });
    }
    setGeneratingId(null);
  };

  const handleUpdateDescription = (blockId: string, text: string) => {
      const newSlides = deck.slides.map(slide => {
          const foundBlock = slide.blocks.find(b => b.id === blockId);
          if (foundBlock) {
               const newBlocks = slide.blocks.map(b => b.id === blockId 
                  ? { ...b, content: { ...(b as StoryboardFrameBlock).content, caption: text } } as StoryboardFrameBlock 
                  : b);
               return { ...slide, blocks: newBlocks };
          }
          return slide;
      });
      onUpdateDeck({ ...deck, slides: newSlides });
  };

  if (storyboardSlides.length === 0) {
      return (
          <div className="p-12 text-center text-gray-500">
              <p>No Storyboard slides found in this project.</p>
              <p className="text-xs mt-2">Create one in the Deck Editor.</p>
          </div>
      );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {storyboardSlides.map(slide => (
          <div key={slide.id} className="mb-12">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                    {slide.title}
                </h2>
                <div className="text-sm text-gray-500">
                  Page {slide.pageNumber}
                </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
                {slide.blocks
                    .filter(b => b.type === 'STORYBOARD_FRAME')
                    .map((block) => {
                        const frame = block as StoryboardFrameBlock;
                        return (
                        <div key={frame.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col h-[320px]">
                            {/* Image Area */}
                            <div className="relative h-[70%] bg-gray-100 group">
                            {frame.content.imageUrl ? (
                                <img src={frame.content.imageUrl} alt={`Scene ${frame.frameIndex}`} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                    <Image size={32} className="mb-2 opacity-50"/>
                                    <span className="text-xs">No Image</span>
                                </div>
                            )}
                            
                            {/* Hover Actions */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button 
                                    onClick={() => handleGenerateImage(frame)}
                                    disabled={generatingId === frame.id}
                                    className="bg-white text-gray-900 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 hover:bg-gray-100 disabled:opacity-70"
                                >
                                    {generatingId === frame.id ? <Loader2 className="animate-spin" size={14}/> : <RefreshCw size={14}/>}
                                    Generate (AI)
                                </button>
                            </div>
                            </div>

                            {/* Caption Area */}
                            <div className="h-[30%] p-3 border-t border-gray-100 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                    S#{frame.frameIndex}
                                </span>
                            </div>
                            <textarea 
                                className="w-full text-xs text-gray-700 resize-none border-none outline-none bg-transparent h-full placeholder:text-gray-300"
                                placeholder="Describe the scene..."
                                value={frame.content.caption || ''}
                                onChange={(e) => handleUpdateDescription(frame.id, e.target.value)}
                            />
                            </div>
                        </div>
                        );
                })}
            </div>
          </div>
      ))}
    </div>
  );
};

export default Storyboard;
