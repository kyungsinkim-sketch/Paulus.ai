import React, { useState, useEffect } from 'react';
import { Project, Slide, Language, StoryboardFrameBlock, ContentBlock, TextBlock } from '../types';
import { breakdownScriptToStoryboard, generateCreativeImage, translateText } from '../services/geminiService';
import { 
  Film, 
  Sparkles, 
  Loader2, 
  RefreshCw, 
  LayoutTemplate,
  MessageSquare,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Save,
  Upload
} from 'lucide-react';

interface StoryboardPageProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
  language: Language;
}

const StoryboardPage: React.FC<StoryboardPageProps> = ({ project, onUpdateProject, language }) => {
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  
  // Set initial selected slide to first Storyboard slide if available
  useEffect(() => {
      if (!selectedSlideId) {
          const firstSb = project.deck.slides.find(s => s.type === 'STORYBOARD');
          if (firstSb) setSelectedSlideId(firstSb.id);
          else if (project.deck.slides.length > 0) setSelectedSlideId(project.deck.slides[0].id);
      }
  }, []);

  const selectedSlide = project.deck.slides.find(s => s.id === selectedSlideId);
  const isStoryboardSlide = selectedSlide?.type === 'STORYBOARD';

  // --- AI State ---
  const [scriptInput, setScriptInput] = useState('');
  const [isGeneratingStructure, setIsGeneratingStructure] = useState(false);
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);

  // Load script from deck text or Brief if input is empty
  useEffect(() => {
      if (!scriptInput && project.deck.slides.length > 0) {
          // Check for a script slide
          const scriptSlide = project.deck.slides.find(s => s.type === 'SCRIPT');
          if (scriptSlide) {
              const body = scriptSlide.blocks.find(b => b.type === 'BODY_TEXT') as TextBlock;
              if (body) {
                  setScriptInput(body.content.text);
                  return;
              }
          }

          // Fallback: Check Brief
          if (project.brief.overview) {
              setScriptInput(project.brief.overview);
          }
      }
  }, []);

  // --- Handlers ---

  const handleSaveScript = () => {
      // In a real app, this might save to a specific "Script" entity.
      alert("Script source saved for storyboard generation.");
  };

  const handleGenerateStructure = async () => {
      if (!scriptInput.trim()) return;
      setIsGeneratingStructure(true);

      const shots = await breakdownScriptToStoryboard(scriptInput);
      
      // Chunk into groups of 8
      const chunks = [];
      for (let i = 0; i < shots.length; i += 8) {
          chunks.push(shots.slice(i, i + 8));
      }

      let newSlides = [...project.deck.slides];
      
      chunks.forEach((chunk, index) => {
          // Fill remaining slots with empty frames if chunk < 8
          const filledChunk = [...chunk];
          while (filledChunk.length < 8) {
              filledChunk.push({ description: '', dialogue: '', shotType: '' });
          }

          const frames: StoryboardFrameBlock[] = filledChunk.map((shot, i) => ({
              id: `frame-${Date.now()}-${index}-${i}`,
              type: 'STORYBOARD_FRAME',
              frameIndex: i + 1,
              content: {
                  caption: shot.description,
                  dialogue: shot.dialogue, // Map dialogue
                  shotType: shot.shotType,
                  aiPrompt: shot.description // Keep original AI description for regeneration
              },
              bilingualCaption: { EN: shot.description } // Assume EN output from breakdown usually
          }));

          const newSlide: Slide = {
              id: `slide-sb-${Date.now()}-${index}`,
              pageNumber: project.deck.slides.length + 1 + index,
              title: `${project.title} Storyboard Seq ${index + 1}`,
              type: 'STORYBOARD',
              layout: 'STORYBOARD_4x2',
              blocks: frames,
              isFinal: false
          };
          
          newSlides.push(newSlide);
          if (index === 0) setSelectedSlideId(newSlide.id);
      });

      onUpdateProject({ ...project, deck: { ...project.deck, slides: newSlides } });
      setIsGeneratingStructure(false);
  };

  const handleGenerateImage = async (block: StoryboardFrameBlock) => {
      if (!block.content.caption) return;
      setGeneratingImageId(block.id);

      // Contextual Prompt
      const prompt = `Cinematic storyboard sketch, ${block.content.shotType}, ${block.content.caption}`;
      const image = await generateCreativeImage(prompt);

      if (image && selectedSlideId) {
          const newSlides = project.deck.slides.map(s => {
              if (s.id === selectedSlideId) {
                  const newBlocks = s.blocks.map(b => {
                      if (b.id === block.id) {
                          return { 
                              ...b, 
                              content: { ...b.content, imageUrl: image } 
                          } as StoryboardFrameBlock;
                      }
                      return b;
                  });
                  return { ...s, blocks: newBlocks as ContentBlock[] };
              }
              return s;
          });
          onUpdateProject({ ...project, deck: { ...project.deck, slides: newSlides } });
      }
      setGeneratingImageId(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, blockId: string) => {
      if (e.target.files && e.target.files[0] && selectedSlideId) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  const image = ev.target.result as string;
                  const newSlides = project.deck.slides.map(s => {
                      if (s.id === selectedSlideId) {
                          const newBlocks = s.blocks.map(b => {
                              if (b.id === blockId) {
                                  return {
                                      ...b,
                                      content: { ...b.content, imageUrl: image }
                                  } as StoryboardFrameBlock;
                              }
                              return b;
                          });
                          return { ...s, blocks: newBlocks as ContentBlock[] };
                      }
                      return s;
                  });
                  onUpdateProject({ ...project, deck: { ...project.deck, slides: newSlides } });
              }
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const handleTextUpdate = (blockId: string, field: 'caption' | 'shotType' | 'dialogue', value: string) => {
      if (!selectedSlideId) return;
      const newSlides = project.deck.slides.map(s => {
          if (s.id === selectedSlideId) {
              const newBlocks = s.blocks.map(b => {
                  if (b.id === blockId) {
                      return {
                          ...b,
                          content: { ...(b as StoryboardFrameBlock).content, [field]: value }
                      } as StoryboardFrameBlock;
                  }
                  return b;
              });
              return { ...s, blocks: newBlocks as ContentBlock[] };
          }
          return s;
      });
      onUpdateProject({ ...project, deck: { ...project.deck, slides: newSlides } });
  };

  const handleCreateEmptyStoryboard = () => {
      const frames: StoryboardFrameBlock[] = Array(8).fill(null).map((_, i) => ({
          id: `frame-${Date.now()}-${i}`,
          type: 'STORYBOARD_FRAME',
          frameIndex: i + 1,
          content: { caption: '', shotType: '', dialogue: '' }
      }));

      const newSlide: Slide = {
          id: `slide-sb-${Date.now()}`,
          pageNumber: project.deck.slides.length + 1,
          title: `${project.title} Storyboard`,
          type: 'STORYBOARD',
          layout: 'STORYBOARD_4x2',
          blocks: frames,
          isFinal: false
      };

      onUpdateProject({ ...project, deck: { ...project.deck, slides: [...project.deck.slides, newSlide] } });
      setSelectedSlideId(newSlide.id);
  };

  // --- Renderers ---

  const renderFrame = (block: StoryboardFrameBlock, index: number) => {
      return (
          <div key={block.id} className="flex flex-col h-full border border-gray-200 bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all group">
              
              {/* Image Area (16:9) */}
              <div className="relative w-full aspect-video bg-gray-100 flex items-center justify-center overflow-hidden group/image">
                  {block.content.imageUrl ? (
                      <img src={block.content.imageUrl} className="w-full h-full object-cover" />
                  ) : (
                      <div className="flex flex-col items-center text-gray-400">
                          <ImageIcon size={24} className="mb-1 opacity-50"/>
                          <span className="text-[10px]">No Image</span>
                      </div>
                  )}
                  
                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button 
                          onClick={() => handleGenerateImage(block)}
                          disabled={generatingImageId === block.id}
                          className="bg-white text-gray-900 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-gray-200"
                      >
                          {generatingImageId === block.id ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>}
                          Generate
                      </button>
                      <label className="cursor-pointer bg-white text-gray-900 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-gray-200">
                          <Upload size={12}/>
                          Upload
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, block.id)}/>
                      </label>
                  </div>
                  
                  {/* Shot Number Badge */}
                  <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-0.5 rounded text-[10px] font-bold backdrop-blur-sm">
                      #{block.frameIndex}
                  </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 p-2 flex flex-col gap-2 bg-white overflow-hidden">
                  <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Shot</span>
                      <input 
                          value={block.content.shotType || ''}
                          onChange={(e) => handleTextUpdate(block.id, 'shotType', e.target.value)}
                          placeholder="Wide Shot..."
                          className="flex-1 text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border-none outline-none focus:ring-1 focus:ring-blue-300"
                      />
                  </div>
                  
                  {/* Screen Description */}
                  <div className="flex-1 flex flex-col min-h-0">
                      <textarea 
                          value={block.content.caption || ''}
                          onChange={(e) => handleTextUpdate(block.id, 'caption', e.target.value)}
                          placeholder="Screen Description..."
                          className="w-full text-xs text-gray-800 bg-transparent outline-none resize-none placeholder:text-gray-300 leading-tight mb-1 flex-1"
                      />
                      <div className="h-px bg-gray-100 my-1"/>
                      <textarea 
                          value={block.content.dialogue || ''}
                          onChange={(e) => handleTextUpdate(block.id, 'dialogue', e.target.value)}
                          placeholder="Narration / Dialogue..."
                          className="w-full text-xs text-gray-500 italic bg-transparent outline-none resize-none placeholder:text-gray-300 leading-tight h-8"
                      />
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
        
        <div className="flex-1 flex overflow-hidden">
            
            {/* CENTER: Storyboard Canvas */}
            <div className="flex-1 bg-gray-50 overflow-y-auto p-8 flex flex-col items-center custom-scrollbar">
                
                {isStoryboardSlide && selectedSlide ? (
                    <div className="w-full max-w-5xl bg-white shadow-xl rounded-xl border border-gray-200 overflow-hidden flex flex-col h-[800px] shrink-0"> {/* Fixed height for A4/Slide feel */}
                        
                        {/* Slide Header */}
                        <div className="h-12 border-b border-gray-200 flex items-center px-6 justify-between bg-white">
                            <h2 className="font-bold text-gray-800 text-lg">{selectedSlide.title}</h2>
                            <div className="text-xs text-gray-400 font-mono">Page {selectedSlide.pageNumber}</div>
                        </div>

                        {/* Grid 4x2 */}
                        <div className="flex-1 p-6 grid grid-cols-4 grid-rows-2 gap-4">
                            {selectedSlide.blocks.filter(b => b.type === 'STORYBOARD_FRAME').map((block, i) => 
                                renderFrame(block as StoryboardFrameBlock, i)
                            )}
                        </div>

                        {/* Footer */}
                        <div className="h-8 border-t border-gray-100 bg-gray-50 px-6 flex items-center text-[10px] text-gray-400 uppercase tracking-widest">
                            {project.client} | {project.title} | Storyboard
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Film size={48} className="mb-4 opacity-20"/>
                        <p className="text-lg font-medium text-gray-500 mb-2">No Storyboard Selected</p>
                        <p className="text-xs mb-6">Select a storyboard slide from the bottom rail or create one.</p>
                        <button 
                            onClick={handleCreateEmptyStoryboard}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-blue-700"
                        >
                            Create Empty Storyboard
                        </button>
                    </div>
                )}

            </div>

            {/* RIGHT: AI Controls */}
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col z-10 shadow-sm overflow-y-auto custom-scrollbar">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50 sticky top-0 z-20">
                    <Sparkles size={16} className="text-purple-600"/>
                    <h3 className="font-bold text-sm text-gray-800">Storyboard AI</h3>
                </div>

                <div className="flex-1 p-5 space-y-6">
                    {/* Script Input Section */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <MessageSquare size={12}/> Script Source
                            </label>
                            <button onClick={handleSaveScript} className="text-xs text-blue-600 font-bold hover:text-blue-800 flex items-center gap-1">
                                <Save size={12}/> Save
                            </button>
                        </div>
                        <textarea 
                            value={scriptInput}
                            onChange={(e) => setScriptInput(e.target.value)}
                            placeholder="Paste your finalized script here to generate a storyboard..."
                            className="w-full h-40 p-3 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none bg-gray-50 focus:bg-white"
                        />
                        <button 
                            onClick={handleGenerateStructure}
                            disabled={isGeneratingStructure || !scriptInput.trim()}
                            className="w-full py-2.5 bg-purple-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isGeneratingStructure ? <Loader2 size={14} className="animate-spin"/> : <LayoutTemplate size={14}/>}
                            Generate Frames
                        </button>
                        <p className="text-[10px] text-gray-400 leading-tight">
                            AI will break down the script into scenes and create new storyboard slides automatically.
                        </p>
                    </div>

                    <hr className="border-gray-100"/>

                    {/* Batch Actions */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <RefreshCw size={12}/> Batch Actions
                        </label>
                        <button 
                            disabled={!isStoryboardSlide}
                            onClick={() => {
                                // Trigger generation for all empty frames in current slide
                                if (selectedSlide) {
                                    const frames = selectedSlide.blocks.filter(b => b.type === 'STORYBOARD_FRAME' && !(b as StoryboardFrameBlock).content.imageUrl) as StoryboardFrameBlock[];
                                    frames.forEach(f => handleGenerateImage(f));
                                }
                            }}
                            className="w-full py-2 border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 disabled:opacity-50"
                        >
                            Generate All Missing Images
                        </button>
                    </div>

                    <hr className="border-gray-100"/>

                    {/* Production Handoff */}
                    <div className="p-4 bg-green-50 rounded-xl border border-green-100 space-y-2">
                        <div className="flex items-center gap-2 text-green-800 font-bold text-xs">
                            <CheckCircle2 size={14}/>
                            <span>Direction Ready?</span>
                        </div>
                        <p className="text-[10px] text-green-700 leading-tight">
                            Once finalized, this storyboard will be synced to the shooting schedule.
                        </p>
                        <button className="w-full py-2 bg-white border border-green-200 text-green-700 rounded-lg text-xs font-bold shadow-sm hover:bg-green-50">
                            Finalize Storyboard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default StoryboardPage;