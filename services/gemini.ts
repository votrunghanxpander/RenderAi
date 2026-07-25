
import { GoogleGenAI, Modality, Type } from "@google/genai";

// Define getAI as a function to lazy-load the client with the current API_KEY
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getPreferredModel = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('bimSpeed_model_preference') || 'gemini-2.5-flash-image';
  }
  return 'gemini-2.5-flash-image';
};

// Helper to convert blob to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data url prefix (e.g. "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export interface SourceImage {
  base64: string;
  mimeType: string;
}

const extractBase64Image = (response: any): string | null => {
  const part = response.candidates?.[0]?.content?.parts?.[0];
  if (part?.inlineData) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};

// Helper to resize generated image to match original dimensions exactly
const resizeToOriginal = (originalBase64: string, generatedBase64: string): Promise<string> => {
  return new Promise((resolve) => {
    const original = new Image();
    original.crossOrigin = "Anonymous";
    original.onload = () => {
      const generated = new Image();
      generated.crossOrigin = "Anonymous";
      generated.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = original.width;
        canvas.height = original.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(generated, 0, 0, original.width, original.height);
          resolve(canvas.toDataURL('image/png').split(',')[1]);
        } else {
          resolve(generatedBase64);
        }
      };
      generated.onerror = () => resolve(generatedBase64);
      generated.src = `data:image/png;base64,${generatedBase64}`;
    };
    original.onerror = () => resolve(generatedBase64);
    original.src = `data:image/jpeg;base64,${originalBase64}`;
  });
};

// Helpers for Upscaling
const getImageDimensions = (base64: string, mimeType: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = `data:${mimeType};base64,${base64}`;
  });
};

const getClosestAspectRatio = (width: number, height: number): string => {
  const ratio = width / height;
  const ratios = [
    { str: "1:1", val: 1 },
    { str: "4:3", val: 4 / 3 },
    { str: "3:4", val: 3 / 4 },
    { str: "16:9", val: 16 / 9 },
    { str: "9:16", val: 9 / 16 },
  ];
  return ratios.reduce((prev, curr) => 
    Math.abs(curr.val - ratio) < Math.abs(prev.val - ratio) ? curr : prev
  ).str;
};

// Generate high-quality render (Exterior/Interior) using Imagen 4
export const generateRender = async (prompt: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '16:9', // Standard for architectural renders
      },
    });

    const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!base64ImageBytes) throw new Error("No image generated");
    return `data:image/jpeg;base64,${base64ImageBytes}`;
  } catch (error) {
    console.error("Render generation failed:", error);
    throw error;
  }
};

// Generate Architectural Render using Gemini 2.5 Flash Image (Image-to-Image)
export const generateArchitecturalRender = async (
  sourceImageBase64: string,
  referenceImageBase64: string | null,
  prompt: string,
  numberOfImages: number = 1
): Promise<string[]> => {
  const ai = getAI();
  const model = 'gemini-2.5-flash-image'; // Force Gemini 2.5 Flash Image for general renders

  const parts: any[] = [
    {
      inlineData: {
        data: sourceImageBase64,
        mimeType: 'image/jpeg',
      },
    }
  ];

  if (referenceImageBase64) {
    parts.push({
      inlineData: {
        data: referenceImageBase64,
        mimeType: 'image/jpeg',
      },
    });
    parts.push({ text: "Use the second image as a stylistic reference." });
  }

  parts.push({ text: prompt });

  const results: string[] = [];

  try {
    // We loop to generate multiple images if requested, as Flash usually returns 1 candidate reliably per call
    const promises = Array(numberOfImages).fill(0).map(async () => {
       const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });
      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part?.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
      return null;
    });

    const generated = await Promise.all(promises);
    generated.forEach(img => { if(img) results.push(img); });

    if (results.length === 0) throw new Error("No images generated");
    return results;

  } catch (error) {
    console.error("Architectural render failed:", error);
    throw error;
  }
};

// Generate Architectural Presentation Board
export const generatePresentationBoard = async (
  sourceBase64: string,
  projectName: string,
  description: string,
  numberOfImages: number = 1
): Promise<string[]> => {
  const ai = getAI();
  // Force Gemini 3 Pro for Presentation Board (Trend kiến trúc items)
  const model = 'gemini-2.5-flash-image'; 

  const parts: any[] = [
    {
      inlineData: {
        data: sourceBase64,
        mimeType: 'image/jpeg',
      },
    },
    {
      text: `Create a professional architectural presentation board based on this building design (Image 1).
      
      LAYOUT REQUIREMENTS:
      1. HEADER: Include a title "${projectName || 'ARCHITECTURAL DESIGN'}" in modern typography.
      2. MAIN IMAGE: A large, high-quality perspective render of the building.
      3. DIAGRAMS:
         - A clear Axonometric Diagram showing the building volume.
         - A series of 5 small "Massing Evolution" diagrams showing step-by-step form development (from block to final shape).
      4. TECHNICAL DRAWINGS:
         - A Ground Floor Plan.
         - A Cross-Section.
         - Front and Side Elevations.
      5. ADDITIONAL VIEWS: An interior living room perspective shot.
      6. COMPOSITION: Organize all elements on a clean, coherent board (beige or white background) with nice typography and layout.
      
      Style: Professional competition board, soft colors, high contrast diagrams.
      Additional Description: ${description}`
    }
  ];

  const results: string[] = [];

  try {
    const promises = Array(numberOfImages).fill(0).map(async () => {
       const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });
      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part?.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
      return null;
    });

    const generated = await Promise.all(promises);
    generated.forEach(img => { if(img) results.push(img); });

    if (results.length === 0) throw new Error("No presentation board generated");
    return results;

  } catch (error) {
    console.error("Presentation board generation failed:", error);
    throw error;
  }
};

// Generate Prompt Suggestions for Planning
export const generatePromptSuggestions = async (imageBase64: string): Promise<string[]> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Strong reasoning + vision
      contents: {
        parts: [
          {
             inlineData: {
                data: imageBase64,
                mimeType: 'image/jpeg'
             }
          },
          {
            text: "Analyze this urban planning or architectural master plan image. Create 3 distinct, highly detailed rendering prompts that would turn this plan into a photorealistic 3D aerial visualization. \n\nStyle 1: Realistic Daytime (Green City, Clear Sky, Vibrant)\nStyle 2: Golden Hour / Sunset (Atmospheric, Warm Lighting, Dramatic Shadows)\nStyle 3: Futuristic / High-Tech (Smart City, Night lights, Modern glass structures)\n\nReturn ONLY a JSON array of strings, for example: [\"Prompt 1...\", \"Prompt 2...\", \"Prompt 3...\"]."
          }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Prompt suggestion failed:", error);
    return [
        "A photorealistic aerial view of a modern eco-city with abundant greenery, clear blue sky, and sustainable architecture.",
        "A dramatic sunset view of the urban plan, with warm golden lighting hitting the building facades and long shadows.",
        "A futuristic smart city at night with glowing street lights, modern glass skyscrapers, and advanced infrastructure."
    ];
  }
};

// Edit image using Gemini 2.5 Flash Image (Nano Banana)
// Updated to support masks and references
export const editImage = async (
  base64Image: string, 
  prompt: string,
  referenceImageBase64?: string | null,
  maskImageBase64?: string | null,
  numberOfImages: number = 1
): Promise<string[]> => {
  const ai = getAI();
  const model = getPreferredModel();
  
  const parts: any[] = [
    {
      inlineData: {
        data: base64Image,
        mimeType: 'image/jpeg',
      },
    }
  ];

  // Add mask if present (Usually passed as a second image with instructions)
  if (maskImageBase64) {
    parts.push({
      inlineData: {
        data: maskImageBase64,
        mimeType: 'image/png',
      }
    });
 
  }

  // Add reference if present
  if (referenceImageBase64) {
    parts.push({
      inlineData: {
        data: referenceImageBase64,
        mimeType: 'image/jpeg',
      }
    });
  
  }

  parts.push({ text: prompt });

  const results: string[] = [];

  try {
    // Parallel generation if multiple images requested
    const promises = Array(numberOfImages).fill(0).map(async () => {
       const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });
      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part?.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
      return null;
    });

    const generated = await Promise.all(promises);
    generated.forEach(img => { if(img) results.push(img); });

    if (results.length === 0) throw new Error("No edited image returned");
    return results;
  } catch (error) {
    console.error("Image editing failed:", error);
    throw error;
  }
};

// Change Image Lighting (Global relighting)
export const changeImageLighting = async (
  sourceBase64: string,
  prompt: string,
  numberOfImages: number = 1
): Promise<string[]> => {
  const ai = getAI();
  const model = getPreferredModel();

  const parts: any[] = [
    {
      inlineData: {
        data: sourceBase64,
        mimeType: 'image/jpeg',
      },
    },
    {
      text: `Change the lighting/atmosphere of this image to: "${prompt}".
      CRITICAL: You MUST preserve the original architectural structure, geometry, perspective, and materials exactly as they are.
      Only modify the lighting, shadows, sky (if visible), and color grading to match the requested atmosphere.
      The output must be a high-quality, photorealistic image.`
    }
  ];

  const results: string[] = [];

  try {
    const promises = Array(numberOfImages).fill(0).map(async () => {
       const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });
      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part?.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
      return null;
    });

    const generated = await Promise.all(promises);
    generated.forEach(img => { if(img) results.push(img); });

    if (results.length === 0) throw new Error("No relighted image generated");
    return results;

  } catch (error) {
    console.error("Change lighting failed:", error);
    throw error;
  }
};

// Change Camera Angle
export const changeCameraAngle = async (
  sourceBase64: string,
  anglePrompt: string,
  numberOfImages: number = 1
): Promise<string[]> => {
  const ai = getAI();
  const model = getPreferredModel();

  const parts: any[] = [
    {
      inlineData: {
        data: sourceBase64,
        mimeType: 'image/jpeg',
      },
    },
    {
      text: `Redraw this exact architectural scene from a new camera perspective: "${anglePrompt}".
      Requirements:
      1. Keep the same building design, materials, and environment details as the source image.
      2. Only change the viewpoint/camera angle.
      3. Ensure correct perspective, vanishing points, and proportions for the new angle.
      4. Output must be high quality and photorealistic.`
    }
  ];

  const results: string[] = [];

  try {
    const promises = Array(numberOfImages).fill(0).map(async () => {
       const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });
      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part?.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
      return null;
    });

    const generated = await Promise.all(promises);
    generated.forEach(img => { if(img) results.push(img); });

    if (results.length === 0) throw new Error("No angle change image generated");
    return results;

  } catch (error) {
    console.error("Change camera angle failed:", error);
    throw error;
  }
};

// Generate Moodboard
export const generateMoodboard = async (
  sourceBase64: string,
  styleReferenceBase64: string | null,
  prompt: string,
  numberOfImages: number = 1
): Promise<string[]> => {
  const ai = getAI();
  const model = getPreferredModel();

  const parts: any[] = [
    {
      inlineData: {
        data: sourceBase64,
        mimeType: 'image/jpeg',
      },
    }
  ];

  if (styleReferenceBase64) {
    parts.push({
      inlineData: {
        data: styleReferenceBase64,
        mimeType: 'image/jpeg',
      },
    });
    parts.push({ text: "Use this second image as a style and color reference." });
  }

  const layoutInstructions = `
    Create a professional Interior Design Moodboard based on the source image.
    Layout Requirements:
    1. CENTRAL IMAGE: Place the main perspective view of the room in the center or top half.
    2. ISOLATED ITEMS: Below or around the central image, arrange cutouts of key furniture items (e.g., bed, chair, lamp, rug) on a clean WHITE background.
    3. PALETTE: On the right or bottom, include a color palette and material swatches (wood, fabric, metal).
    4. BACKGROUND: The overall background of the board must be WHITE or very light grey.
    
    Design Style Instruction: ${prompt}
  `;

  parts.push({ text: layoutInstructions });

  const results: string[] = [];

  try {
    const promises = Array(numberOfImages).fill(0).map(async () => {
       const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });
      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part?.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
      return null;
    });

    const generated = await Promise.all(promises);
    generated.forEach(img => { if(img) results.push(img); });

    if (results.length === 0) throw new Error("No moodboard generated");
    return results;

  } catch (error) {
    console.error("Generate moodboard failed:", error);
    throw error;
  }
};

// Generate 2D Elevation from 3D
export const generate2DElevation = async (
  sourceBase64: string,
  viewPrompt: string,
  userPrompt: string,
  numberOfImages: number = 1
): Promise<string[]> => {
  const ai = getAI();
  const model = getPreferredModel();

  const parts: any[] = [
    {
      inlineData: {
        data: sourceBase64,
        mimeType: 'image/jpeg',
      },
    },
    {
      text: `Transform this 3D architectural image into a precise 2D technical elevation drawing.
      
      Style Requirements:
      - Output must be a black line drawing on a pure white background.
      - Style: Architectural CAD drawing / Blueprint / Technical Illustration.
      - Projection: Orthographic (Flat 2D), remove all perspective distortion.
      - Details: Clearly show windows, doors, roof lines, and architectural features.
      - No shadows, no realistic textures, no vegetation unless specified.
      
      View Instruction: ${viewPrompt}
      Additional Details: ${userPrompt}`
    }
  ];

  const results: string[] = [];

  try {
    const promises = Array(numberOfImages).fill(0).map(async () => {
       const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });
      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part?.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
      return null;
    });

    const generated = await Promise.all(promises);
    generated.forEach(img => { if(img) results.push(img); });

    if (results.length === 0) throw new Error("No elevation generated");
    return results;

  } catch (error) {
    console.error("Generate 2D Elevation failed:", error);
    throw error;
  }
};

// Add People to Image
export const addPeopleToImage = async (
  sceneBase64: string,
  personRefBase64: string | null,
  prompt: string,
  personDescription: string = ""
): Promise<string> => {
  const ai = getAI();
  const model = getPreferredModel();

  const parts: any[] = [
    {
      inlineData: {
        data: sceneBase64,
        mimeType: 'image/jpeg',
      },
    }
  ];

  if (personRefBase64) {
    parts.push({
      inlineData: {
        data: personRefBase64,
        mimeType: 'image/jpeg',
      },
    });
    parts.push({ text: "Image 2 is a reference for the person/people/animal to be added." });
  }

  let visualDescription = "";
  if (!personRefBase64 && personDescription) {
      visualDescription = `Person Description: ${personDescription}. Generate people matching this appearance.`;
  }

  parts.push({ 
    text: `Task: Realistic architectural visualization. Add people/animals into the scene (Image 1).
    
    Context & Action: ${prompt}
    ${visualDescription}

    CRITICAL PLACEMENT & NATURALNESS INSTRUCTIONS:
    1. ANALYZE GEOMETRY: Identify the floor plane, depth, and scale of the architecture. 
    2. LOGICAL POSITIONING: Place people ONLY where it is physically and socially natural to be. 
       - If the prompt implies "sitting", place them on EXISTING chairs, benches, or steps visible in the image. Do not make them float.
       - If "walking", place them on sidewalks, paths, or open floor space.
       - Avoid placing people intersecting with walls, tables, or floating in mid-air.
    3. SCALE & PERSPECTIVE: The inserted figures MUST respect the vanishing point and scale of the scene. They should not be too big (giants) or too small (miniatures).
    4. LIGHTING MATCH: Match the direction, intensity, and color temperature of the existing light sources. Cast accurate shadows on the ground/floor corresponding to the scene's sun/light direction.
    5. STYLE: The figures should look photorealistic and blend seamlessly with the environment, not like pasted stickers.
    6. OUTPUT FORMAT: The output image MUST maintain the exact aspect ratio and framing of the original image.
    `
  });

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });
    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData) {
      const generatedBase64 = part.inlineData.data;
      // Resize strictly to match original dimensions
      return await resizeToOriginal(sceneBase64, generatedBase64);
    }
    throw new Error("No image generated");

  } catch (error) {
    console.error("Add people failed:", error);
    throw error;
  }
};


// Helper to prepare image and mask for Outpainting (Expand View)
const prepareOutpainting = async (sourceBase64: string, ratioStr: string): Promise<{image: string, mask: string}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
       // Calculate new dimensions
       const [wRatio, hRatio] = ratioStr.split(':').map(Number);
       const currentRatio = img.width / img.height;
       const targetRatioVal = wRatio / hRatio;
       
       let newWidth = img.width;
       let newHeight = img.height;
       
       // Determine if we are expanding width or height
       if (targetRatioVal > currentRatio) {
          // Target is wider, keep height, increase width
          newWidth = img.height * targetRatioVal;
       } else {
          // Target is taller (or same), keep width, increase height
          newHeight = img.width / targetRatioVal;
       }
       
       const canvas = document.createElement('canvas');
       canvas.width = newWidth;
       canvas.height = newHeight;
       const ctx = canvas.getContext('2d');
       if(!ctx) return reject("No context");
       
       // 1. Draw Background (Image to be sent to AI)
       // We fill the expanded area with black or stretch? 
       // Usually better to leave it empty/black, and mask it.
       // Gemini works well if we place the image in center.
       ctx.fillStyle = 'black'; 
       ctx.fillRect(0, 0, newWidth, newHeight);
       
       const x = (newWidth - img.width) / 2;
       const y = (newHeight - img.height) / 2;
       
       ctx.drawImage(img, x, y);
       const newImageBase64 = canvas.toDataURL('image/jpeg').split(',')[1];
       
       // 2. Create Mask
       // Mask: White = Edit/Fill, Black = Keep Original
       ctx.fillStyle = 'white'; // Fill everything with white (edit)
       ctx.fillRect(0, 0, newWidth, newHeight);
       
       ctx.fillStyle = 'black'; // Draw black rectangle over original image (keep)
       ctx.fillRect(x, y, img.width, img.height);
       
       const newMaskBase64 = canvas.toDataURL('image/png').split(',')[1];
       
       resolve({ image: newImageBase64, mask: newMaskBase64 });
    };
    img.onerror = reject;
    img.src = `data:image/jpeg;base64,${sourceBase64}`;
  });
}

// Expand Image (Outpainting)
export const expandImage = async (
  sourceBase64: string,
  targetAspectRatio: string,
  prompt: string,
  numberOfImages: number = 1
): Promise<string[]> => {
  try {
    // 1. Prepare canvas and mask
    const { image, mask } = await prepareOutpainting(sourceBase64, targetAspectRatio);

    // 2. Use editImage to fill the masked area
    // Default prompt if none provided
    const finalPrompt = prompt 
      ? `Outpaint: ${prompt}. Seamlessly extend the image into the masked area.` 
      : "Outpaint: Seamlessly extend the scene, matching the lighting, style, and perspective of the original image.";

    return await editImage(image, finalPrompt, null, mask, numberOfImages);

  } catch (error) {
    console.error("Expand image failed:", error);
    throw error;
  }
}

// Insert Building into Site (Compositing)
export const insertBuildingIntoSite = async (
  siteBase64: string,
  buildingBase64: string,
  prompt: string,
  numberOfImages: number = 1
): Promise<string[]> => {
  const ai = getAI();
  const model = getPreferredModel();

  const parts: any[] = [
    {
      inlineData: {
        data: siteBase64,
        mimeType: 'image/jpeg',
      },
    },
    {
      inlineData: {
        data: buildingBase64,
        mimeType: 'image/jpeg',
      },
    },
    {
      text: `Image 1 is the site context/background (hiện trạng). Image 2 is the building/structure (công trình) to be inserted.
      Task: Seamlessly insert the building from Image 2 into the site context of Image 1.
      Instruction: ${prompt}
      Ensure realistic lighting, shadows, perspective matching, and blending with the environment.`
    }
  ];

  const results: string[] = [];

  try {
    const promises = Array(numberOfImages).fill(0).map(async () => {
      const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });
      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part?.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
      return null;
    });

    const generated = await Promise.all(promises);
    generated.forEach(img => { if(img) results.push(img); });

    if (results.length === 0) throw new Error("No composite image generated");
    return results;

  } catch (error) {
    console.error("Insert building failed:", error);
    throw error;
  }
};

// Generate Video using Veo 3.1
export const generateVideo = async (
  base64Image: string, 
  prompt: string, 
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<string> => {
  // Important: Re-instantiate AI here to ensure latest key if selected via UI
  const ai = getAI(); 
  
  try {
    // Dynamic access to process.env.API_KEY to ensure freshness
    const currentApiKey = process.env.API_KEY;

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt || "Animate this architectural scene cinematically",
      image: {
        imageBytes: base64Image,
        mimeType: 'image/jpeg', // Assuming jpeg
      },
      config: {
        numberOfVideos: 1,
        aspectRatio: aspectRatio,
      }
    });

    // Polling loop
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 8000)); // Poll every 5s
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;

    console.log("videoUri",videoUri)
    if (!videoUri) throw new Error("No video URI returned");

    // Fetch the actual video bytes using the key
    // Ensure we use the latest key from env when fetching
    const videoUrlWithKey = `${videoUri}&key=${currentApiKey}`;
    console.log("video with key = " , videoUrlWithKey)
    return videoUrlWithKey;

  } catch (error) {
    console.error("Video generation failed:", error);
    throw error;
  }
};

export const upscaleImage = async (
  sourceImage: SourceImage,
  target: "2k" | "4k",
  onRetry?: (attempt: number) => void
): Promise<string | null> => {
  const ai = getAI();
  const model = getPreferredModel();
  const targetSize = target.toUpperCase();

  const prompt = `
Upscale this image to ${targetSize} resolution.
Enhance details, sharpness, and clarity while preserving the original
content, style, and composition. Make it photorealistic.
  `.trim();

  // Base config
  const config: any = {
    responseModalities: [Modality.IMAGE],
  };

  // 👉 Chỉ xử lý imageConfig khi đúng model
  if (model === "gemini-3-pro-image-preview") {
    try {
      const dims = await getImageDimensions(sourceImage.base64, sourceImage.mimeType);
      const ratio = getClosestAspectRatio(dims.width, dims.height);

      config.imageConfig = {
        imageSize: targetSize,
        aspectRatio: ratio,
      };
    } catch (err) {
      console.warn("Failed to detect image dimensions. Using fallback imageConfig.", err);

      config.imageConfig = {
        imageSize: targetSize,
      };
    }
  }

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            {
              inlineData: {
                data: sourceImage.base64,
                mimeType: sourceImage.mimeType,
              },
            },
            { text: prompt },
          ],
        },
        config,
      });

      return extractBase64Image(response);

    } catch (error) {
      if (attempt === maxAttempts) {
        console.error("Upscaling failed after multiple attempts:", error);
        throw error;
      }

      if (onRetry) onRetry(attempt);

      console.warn(`Upscaling attempt ${attempt} failed. Retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  return null;
};



// Generate Feng Shui Advice
export const generateFengShuiAdvice = async (prompt: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [{ text: prompt }]
      }
    });
    return response.text || "Không thể tạo nội dung phong thuỷ lúc này.";
  } catch (error) {
    console.error("Feng Shui generation failed:", error);
    throw error;
  }
};

export type TourAction = 'pan-left' | 'pan-right' | 'tilt-up' | 'tilt-down' | 'orbit-left' | 'orbit-right' | 'zoom-in' | 'zoom-out';

// Generate Virtual Tour Frame (Camera Movement)
export const generateVirtualTourFrame = async (
  sourceBase64: string,
  action: TourAction,
  stepSize: number = 15
): Promise<string> => {
  const ai = getAI();
  const model = getPreferredModel();
  
  let prompt = '';
  const tourStepSize = stepSize;
  const baseInstruction = `
Generate a new image from the camera's adjusted position according to the action.
All architectural elements, materials, lighting, reflections, weather, shadows, and overall atmosphere MUST remain the same as the source image.
Only the camera position or rotation is allowed to change.
The result must be a sharp, realistic, high-resolution architectural photograph.
Do NOT change objects, proportions, design, textures, colors, furniture layout, landscape, or weather conditions.
`;

  switch(action) {
      case 'pan-left':
          prompt = `
Pan the camera to the LEFT by ${tourStepSize} degrees without moving its physical position.
Rotate horizontally only. ${baseInstruction}
          `;
          break;

      case 'pan-right':
          prompt = `
Pan the camera to the RIGHT by ${tourStepSize} degrees without moving its physical position.
Rotate horizontally only. ${baseInstruction}
          `;
          break;

      case 'tilt-up':
          prompt = `
Tilt the camera UP by ${tourStepSize} degrees without moving its physical position.
Rotate vertically only. ${baseInstruction}
          `;
          break;

      case 'tilt-down':
          prompt = `
Tilt the camera DOWN by ${tourStepSize} degrees without moving its physical position.
Rotate vertically only. ${baseInstruction}
          `;
          break;

      case 'orbit-left':
          prompt = `
Orbit the camera to the LEFT by ${tourStepSize} degrees around the main subject.
The camera MUST move in 3D space along a circular arc, keeping the same distance from the subject. ${baseInstruction}
          `;
          break;

      case 'orbit-right':
          prompt = `
Orbit the camera to the RIGHT by ${tourStepSize} degrees around the main subject.
The camera MUST move in 3D space along a circular arc, keeping the same distance from the subject. ${baseInstruction}
          `;
          break;

      case 'zoom-in':
          prompt = `
Move the camera FORWARD to create a zoom-in effect.
Do not change its height, tilt, or angle. Move only along the forward axis. ${baseInstruction}
          `;
          break;

      case 'zoom-out':
          prompt = `
Move the camera BACKWARD to create a zoom-out effect.
Do not change its height, tilt, or angle. Move only along the backward axis. ${baseInstruction}
          `;
          break;
  }

  const parts = [
    {
      inlineData: {
        data: sourceBase64,
        mimeType: 'image/jpeg', // Assuming jpeg for simplicity
      },
    },
    { text: prompt }
  ];

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });
    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Virtual tour generation failed:", error);
    throw error;
  }
};

// Generate Real Estate Poster
export const generateRealEstatePoster = async (
  sourceBase64: string,
  details: { 
    headline: string; 
    price?: string; 
    location?: string; 
    features?: string;
    subtitle?: string;
    colorTheme?: string;
    posterStyle?: string;
    fontStyle?: string;
    amenities?: string[];
    logoBase64?: string;
    userPrompt?: string;
    aspectRatio?: string;
    resolution?: string;
  },
  numberOfImages: number = 1
): Promise<string[]> => {
  const ai = getAI();
  const model = getPreferredModel();

  const parts: any[] = [
    {
      inlineData: {
        data: sourceBase64,
        mimeType: 'image/jpeg',
      },
    },
  ];

  if (details.logoBase64) {
    parts.push({
      inlineData: {
        data: details.logoBase64,
        mimeType: 'image/png',
      },
    });
    parts.push({ text: "Image 2 is the Brand Logo to be placed at the bottom center." });
  }

  const amenityList = details.amenities && details.amenities.length > 0
    ? details.amenities.join('\n • ')
    : (details.features || 'Luxury Amenities');

  // Use userPrompt if provided (this will be the edited prompt from the UI), otherwise construct it.
  // However, since we are moving prompt construction to UI, we can just use userPrompt if present, 
  // or fall back to construction if not (for backward compatibility or direct calls).
  // But to support "edit full prompt", we'll rely on the prompt passed in details.customPrompt if it exists.
  // I'll modify the interface above first.
  
  const constructedPrompt = `
    Dựa trên Ảnh Gốc (Ảnh 1), hãy tạo một poster bất động sản cao cấp theo phong cách quốc tế.
    Giữ nguyên kiến trúc, tỷ lệ và bố cục ngôi nhà trong ảnh gốc nhưng tăng độ sang trọng, ánh sáng vàng ấm, phong cách cinematic.

    YÊU CẦU CHI TIẾT:

    1. KIẾN TRÚC & HÌNH ẢNH:
       - Giữ đúng bố cục, hình dáng, tỷ lệ của ngôi nhà trong ảnh gốc.
       - Tăng sáng nội thất (warm light), làm rõ mặt tiền, tăng độ sang trọng.
       - Phong cách tổng thể: ${details.posterStyle || 'Cinematic Luxury (Dubai/Singapore)'}.
       - Tránh: chữ mờ, nhiễu ảnh, bóng xấu, hiệu ứng rẻ tiền.

    2. MÀU SẮC & ÁNH SÁNG:
       - Màu chủ đạo: ${details.colorTheme || 'Dark Blue + Gold Premium'}.
       - Hiệu ứng cinematic, ánh sáng vàng sang trọng.
       - Nền trời (nếu có): Thay bằng tone màu phù hợp với chủ đề (ví dụ: xanh navy đậm cho Dark Blue).

    3. TYPOGRAPHY (NỘI DUNG CHỮ):
       - Tiêu đề lớn ở giữa: "${details.headline}"
       - Subtitle nhỏ bên dưới: "${details.subtitle || '3 & 4 BHK Prime Residencies'}"
       - Font chữ: ${details.fontStyle || 'Serif Gold (Sang trọng)'}. Màu vàng gold (hoặc phù hợp theme).

    4. MARKETING ICONS (TIỆN ÍCH):
        - Không được dịch sang tiếng anh, chỉ dùng tiếng việt được cung cấp.
       - Vẽ một đường cong (arc) tinh tế phía trên tòa nhà (hoặc vị trí phù hợp).
       - Trên arc gắn ${details.amenities?.length || 5} icon tròn màu vàng (hoặc màu theme) tương ứng với các tiện ích sau:
         • ${amenityList.replace(/\n/g, '\n         • ')}
       - Icon dạng tròn, tối giản.

    5. LOGO:
       - Đặt logo thương hiệu (${details.logoBase64 ? 'Image 2' : 'Tạo logo placeholder sang trọng'}) ở vị trí dưới cùng trung tâm.

    KẾT QUẢ:
    Một poster hoàn chỉnh, độ phân giải cao, nhìn giống như quảng cáo bất động sản cao cấp tại Dubai hoặc Singapore.

 
  `;

  let finalPrompt = details.userPrompt || constructedPrompt;
  // Font control:
  finalPrompt += `
- Use font: Inter (primary), Roboto or Open Sans (fallback).
- Use advanced text renderer engine.
- Enable full Unicode glyph support.
- Do not detach accents from base characters.
- Preserve glyph integrity when vectorizing or resizing.
- Kerning/spacing optimized for Vietnamese.
- Ensure typography is clear and legible.
- Ensure accurate Vietnamese diacritics for all text.
- Ensure accurate Vietnamese diacritic placement even in stylized text.
- Do not replace glyphs with random symbols unless specified.
- Required characters must display correctly: ă, â, ê, ô, ơ, ư, đ and tone marks.
- Ensure accurate Vietnamese diacritics. Typography is clear and legible.

Accuracy validation:
Ensure accurate Vietnamese diacritics. Typography is clear and legible.
`;
  parts.push({ text: finalPrompt });

  const results: string[] = [];

  // Prepare config with optional imageConfig
  const config: any = {
    responseModalities: [Modality.IMAGE],
  };

  if (details.aspectRatio || details.resolution) {
    config.imageConfig = {};
    if (details.aspectRatio) config.imageConfig.aspectRatio = details.aspectRatio;
    if (details.resolution) config.imageConfig.imageSize = details.resolution;
  }

  try {
    const promises = Array(numberOfImages).fill(0).map(async () => {
       const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: config,
      });
      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part?.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
      return null;
    });

    const generated = await Promise.all(promises);
    generated.forEach(img => { if(img) results.push(img); });

    if (results.length === 0) throw new Error("No poster generated");
    return results;
  } catch (error) {
    console.error("Poster generation failed:", error);
    throw error;
  }
};

// Generate Annotated Architectural Render
export const generateAnnotatedRender = async (
  sourceBase64: string,
  focus: string,
  numberOfImages: number = 1
): Promise<string[]> => {
  const ai = getAI();
  const model = getPreferredModel();

  const parts: any[] = [
    {
      inlineData: {
        data: sourceBase64,
        mimeType: 'image/jpeg',
      },
    },
    {
      text: `Analyze this architectural image and create an "Annotated Architectural Visualization".
      
      Task:
      1. Regenerate the image with a style that looks like a blend of photorealism and architectural sketching/diagramming.
      2. Add graphical annotations, leader lines, and text labels pointing to key architectural features.
      3. Focus primarily on highlighting: ${focus || "Key design elements, materials, and structure"}.
      4. Style: Professional architectural presentation, clean lines, white or technical font for labels.
      5. Tất cả các chữ cần là tiếng việt. nếu là từ chuyên ngành thì có thể giữ tiếng anh
      - Use font: Inter (primary), Roboto or Open Sans (fallback).
- Use advanced text renderer engine.
- Enable full Unicode glyph support.
- Do not detach accents from base characters.
- Preserve glyph integrity when vectorizing or resizing.
- Kerning/spacing optimized for Vietnamese.
- Ensure typography is clear and legible.
- Ensure accurate Vietnamese diacritics for all text.
- Ensure accurate Vietnamese diacritic placement even in stylized text.
- Do not replace glyphs with random symbols unless specified.
- Required characters must display correctly: ă, â, ê, ô, ơ, ư, đ and tone marks.
- Ensure accurate Vietnamese diacritics. Typography is clear and legible.

Accuracy validation:
Ensure accurate Vietnamese diacritics. Typography is clear and legible.
      
      The output should look like a page from an architectural analysis portfolio.`
    }
  ];

  const results: string[] = [];

  try {
    const promises = Array(numberOfImages).fill(0).map(async () => {
       const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });
      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part?.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
      return null;
    });

    const generated = await Promise.all(promises);
    generated.forEach(img => { if(img) results.push(img); });

    if (results.length === 0) throw new Error("No annotated render generated");
    return results;
  } catch (error) {
    console.error("Annotated render generation failed:", error);
    throw error;
  }
};

export const generate3DSectionPerspective = async (
  sourceBase64: string,
  numberOfImages: number = 1
): Promise<string[]> => {
  const ai = getAI();
  const model = getPreferredModel();

  const parts: any[] = [
    {
      inlineData: {
        data: sourceBase64,
        mimeType: 'image/jpeg',
      },
    },
    {
      text: `Create a 3D sectional perspective cutaway of a modern house.

Remove part of the walls and roof to reveal all interior spaces clearly.

Show the structure: concrete pile foundation, basement utilities, reinforced concrete slab, tempered glass walls, engineered wood floor, plaster ceiling, thermal insulation layers, rooftop garden, wooden pergola, etc.

Include small technical annotation labels pointing to each component.

Use clean, modern infographic style—similar to the reference image.

High detail, sharp lines, crisp edges, 2K resolution.

Highlight the cut plane with a darker section cut fill.

Bright daylight lighting, realistic but still presentation-friendly.

Avoid incorrect text, avoid blur, avoid watermark, avoid distortion

Tất cả các chữ cần là tiếng việt. nếu là từ chuyên ngành thì có thể giữ tiếng anh

- Use font: Inter (primary), Roboto or Open Sans (fallback).
- Use advanced text renderer engine.
- Enable full Unicode glyph support.
- Do not detach accents from base characters.
- Preserve glyph integrity when vectorizing or resizing.
- Kerning/spacing optimized for Vietnamese.
- Ensure typography is clear and legible.
- Ensure accurate Vietnamese diacritics for all text.
- Ensure accurate Vietnamese diacritic placement even in stylized text.
- Do not replace glyphs with random symbols unless specified.
- Required characters must display correctly: ă, â, ê, ô, ơ, ư, đ and tone marks.
- Ensure accurate Vietnamese diacritics. Typography is clear and legible.

Accuracy validation:
Ensure accurate Vietnamese diacritics. Typography is clear and legible.`
    }
  ];

  const results: string[] = [];

  try {
    const promises = Array(numberOfImages).fill(0).map(async () => {
       const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });
      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part?.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
      return null;
    });

    const generated = await Promise.all(promises);
    generated.forEach(img => { if(img) results.push(img); });

    if (results.length === 0) throw new Error("No 3D section perspective generated");
    return results;
  } catch (error) {
    console.error("3D section perspective generation failed:", error);
    throw error;
  }
};
