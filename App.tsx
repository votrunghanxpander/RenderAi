
import React, { useState, useEffect } from 'react';
import {
  Sidebar,
  ExteriorRenderView,
  InteriorRenderView,
  PlanningRenderView,
  ImageEditor,
  MaterialEditor,
  FurnitureEditor,
  VideoGenerator,
  UpscaleView,
  AnalysisView,
  FengShuiView,
  VirtualTourView,
  InsertBuildingView,
  ChangeLightingView,
  CameraAngleView,
  ExpandView,
  MoodboardView,
  Elevation2DView,
  AddPeopleView,
  FloorPlanTo3DView,
  TechnicalDrawingView,
  PresentationBoardView,
  RealEstatePosterView,
  AnnotatedRenderView,
  SectionPerspectiveView,
  SketchConceptView,
  HistoryView,
  SettingsFab,
  HomePage
} from './components/index';


import { AppView } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'app'>('app');
  const [currentView, setCurrentView] = useState<AppView>(AppView.EXTERIOR);
  const [currentModel, setCurrentModel] = useState<string>('gemini-2.5-flash-image');

  useEffect(() => {
    const saved = localStorage.getItem('bimSpeed_model_preference');
    if (saved) setCurrentModel(saved);
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case AppView.EXTERIOR:
        return <ExteriorRenderView />;
      case AppView.INTERIOR:
        return <InteriorRenderView />;
      case AppView.PLANNING:
        return <PlanningRenderView />;
      case AppView.EDIT_MASK:
        return <ImageEditor />;
      case AppView.EDIT_MATERIAL:
        return <MaterialEditor />;
      case AppView.EDIT_FURNITURE:
        return <FurnitureEditor />;
      case AppView.VIDEO:
        return <VideoGenerator />;
      case AppView.UTILITIES_UPSCALE:
        return <UpscaleView />;
      case AppView.UTILITIES_INSERT_BUILDING:
        return <InsertBuildingView />;
      case AppView.UTILITIES_CHANGE_LIGHTING:
        return <ChangeLightingView />;
      case AppView.UTILITIES_CAMERA_ANGLE:
        return <CameraAngleView />;
      case AppView.UTILITIES_EXPAND_VIEW:
        return <ExpandView />;
      case AppView.UTILITIES_MOODBOARD:
        return <MoodboardView />;
      case AppView.UTILITIES_PRESENTATION_BOARD:
        return <PresentationBoardView />;
      case AppView.UTILITIES_2D_ELEVATION:
        return <Elevation2DView />;
      case AppView.UTILITIES_TECH_DRAWING:
        return <TechnicalDrawingView />;
      case AppView.UTILITIES_ADD_PEOPLE:
        return <AddPeopleView />;
      case AppView.UTILITIES_ANALYSIS:
        return <AnalysisView />;
      case AppView.UTILITIES_FENGSHUI:
        return <FengShuiView />;
      case AppView.UTILITIES_VIRTUAL_TOUR:
        return <VirtualTourView />;
      case AppView.UTILITIES_FLOOR_PLAN_TO_3D:
        return <FloorPlanTo3DView />;
      case AppView.TREND_REAL_ESTATE_POSTER:
        return <RealEstatePosterView />;
      case AppView.TREND_ANNOTATED_RENDER:
        return <AnnotatedRenderView />;
      case AppView.TREND_3D_SECTION_PERSPECTIVE:
        return <SectionPerspectiveView />;
      case AppView.TREND_SKETCH_CONCEPT:
        return <SketchConceptView />;
      case AppView.HISTORY:
        return <HistoryView />;
      default:
        return <ExteriorRenderView />;
    }
  };

  // Helper to get breadcrumb title
  const getTitle = () => {
    switch(currentView) {
        case AppView.EXTERIOR: return 'EXTERIOR';
        case AppView.INTERIOR: return 'INTERIOR';
        case AppView.PLANNING: return 'PLANNING';
        case AppView.EDIT_MASK: return 'EDIT / MASK';
        case AppView.EDIT_MATERIAL: return 'EDIT / MATERIAL';
        case AppView.EDIT_FURNITURE: return 'EDIT / FURNITURE';
        case AppView.VIDEO: return 'VIDEO';
        case AppView.UTILITIES_UPSCALE: return 'UTILITIES / UPSCALE';
        case AppView.UTILITIES_INSERT_BUILDING: return 'UTILITIES / INSERT BUILDING';
        case AppView.UTILITIES_CHANGE_LIGHTING: return 'UTILITIES / CHANGE LIGHTING';
        case AppView.UTILITIES_CAMERA_ANGLE: return 'UTILITIES / CAMERA ANGLE';
        case AppView.UTILITIES_EXPAND_VIEW: return 'UTILITIES / EXPAND VIEW';
        case AppView.UTILITIES_MOODBOARD: return 'UTILITIES / MOODBOARD';
        case AppView.UTILITIES_PRESENTATION_BOARD: return 'UTILITIES / PRESENTATION BOARD';
        case AppView.UTILITIES_2D_ELEVATION: return 'UTILITIES / 2D ELEVATION';
        case AppView.UTILITIES_TECH_DRAWING: return 'UTILITIES / TECH DRAWING (PLAN/SECTION/ELEVATION)';
        case AppView.UTILITIES_ADD_PEOPLE: return 'UTILITIES / ADD PEOPLE';
        case AppView.UTILITIES_ANALYSIS: return 'UTILITIES / ANALYSIS';
        case AppView.UTILITIES_FENGSHUI: return 'UTILITIES / FENG SHUI';
        case AppView.UTILITIES_VIRTUAL_TOUR: return 'UTILITIES / VIRTUAL TOUR';
        case AppView.UTILITIES_FLOOR_PLAN_TO_3D: return 'UTILITIES / FLOOR PLAN TO 3D';
        case AppView.TREND_REAL_ESTATE_POSTER: return 'TREND / REAL ESTATE POSTER';
        case AppView.TREND_ANNOTATED_RENDER: return 'TREND / ANNOTATED RENDER';
        case AppView.TREND_3D_SECTION_PERSPECTIVE: return 'TREND / 3D SECTION PERSPECTIVE';
        case AppView.TREND_SKETCH_CONCEPT: return 'TREND / SKETCH CONCEPT';
        case AppView.HISTORY: return 'HISTORY';
        default: return 'HOME';
    }
  }

  // Check if user has already submitted form, can optionally auto-route
  // For now, we start at home to show the beautiful landing page
  
  if (view === 'app') {
    return (
      <div className="flex h-screen bg-[#F4F3EE] overflow-hidden">
        <Sidebar currentView={currentView} onChangeView={setCurrentView} />
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-full min-w-0 relative">
          {/* Header - Static */}
          <div className="px-8 pt-8 pb-4 shrink-0 z-10 bg-[#F4F3EE]">
             <header className="flex justify-between items-center pb-4 border-b border-[#B1ADA1]/30">
              <div className="text-sm text-[#B1ADA1]">
                  BimSpeed AI / <span className="text-[#C15F3C] font-medium">{getTitle()}</span>
              </div>
              <div className="flex items-center space-x-4">
                  <div className="hidden md:flex items-center px-3 py-1 bg-white border border-[#B1ADA1]/50 rounded-full text-[10px] text-gray-500 font-mono shadow-sm">
                     <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></span>
                     Model: {currentModel}
                  </div>
                  <span className="text-sm text-[#B1ADA1]">v2.5.2-beta</span>
                  <div className="w-8 h-8 rounded-full bg-[#C15F3C] text-white flex items-center justify-center font-bold text-xs">
                  AI
                  </div>
              </div>
              </header>
          </div>

          {/* View Content - Scrollable Area Container */}
          <div className="flex-1 overflow-hidden px-8 pb-8">
             {renderContent()}
          </div>

          {/* Global Settings Button */}
          <SettingsFab currentModel={currentModel} onModelChange={setCurrentModel} />
        </main>
      </div>
    );
  }

  return <HomePage onEnterApp={() => setView('app')} />;
};

export default App;
