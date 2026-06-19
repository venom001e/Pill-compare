import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload as UploadIcon, Camera, Loader2, FileText, CheckCircle, AlertCircle, X, RefreshCw, Sparkles, Activity } from 'lucide-react';
import { scanPrescription, comparePrices } from '../services/gemini';
import { MedicineCard } from '../components/MedicineCard';
import { MedicinePrice } from '../types';
import { cn } from '../lib/utils';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

export const Upload: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [medicines, setMedicines] = useState<{ name: string; dosage: string; sideEffects?: string }[]>([]);
  const [comparisons, setComparisons] = useState<Record<string, { name: string; prices: MedicinePrice[] }[]>>({});
  const [comparing, setComparing] = useState<Record<string, boolean>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [lightingStatus, setLightingStatus] = useState<'good' | 'low' | 'high'>('good');
  const [isStable, setIsStable] = useState(true);
  const lastFrameRef = useRef<ImageData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let interval: any;
    if (isCameraActive && videoRef.current) {
      interval = setInterval(() => {
        analyzeFrame();
      }, 500);
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (interval) clearInterval(interval);
    };
  }, [stream, isCameraActive]);

  const analyzeFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Small sample for performance
    canvas.width = 100;
    canvas.height = 100;
    context.drawImage(video, 0, 0, 100, 100);
    
    const imageData = context.getImageData(0, 0, 100, 100);
    const data = imageData.data;
    let brightness = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      brightness += (data[i] + data[i+1] + data[i+2]) / 3;
    }
    
    const avgBrightness = brightness / (data.length / 4);
    
    if (avgBrightness < 40) setLightingStatus('low');
    else if (avgBrightness > 220) setLightingStatus('high');
    else setLightingStatus('good');

    // Stability check: Compare with last frame
    if (lastFrameRef.current) {
      const lastData = lastFrameRef.current.data;
      let diff = 0;
      for (let i = 0; i < data.length; i += 40) { // Sample every 10th pixel for speed
        diff += Math.abs(data[i] - lastData[i]);
      }
      const avgDiff = diff / (data.length / 40);
      setIsStable(avgDiff < 15); // Threshold for stability
    }
    lastFrameRef.current = imageData;
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraActive(true);
      setError('');
    } catch (err) {
      setError("Could not access camera. Please check permissions.");
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        
        resizeImage(dataUrl).then(resized => {
          setImage(resized);
          stopCamera();
          processPrescription(resized);
        });
      }
    }
  };

  const resizeImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1024;

        if (width > height) {
          if (width > maxDimension) {
            height *= maxDimension / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width *= maxDimension / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = dataUrl;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const resized = await resizeImage(reader.result as string);
        setImage(resized);
        processPrescription(resized);
      };
      reader.readAsDataURL(file);
    }
  };

  const processPrescription = async (base64: string) => {
    setScanning(true);
    setScanProgress('Initializing AI scanner...');
    setError('');
    setMedicines([]);
    setComparisons({});

    try {
      setScanProgress('Analyzing image clarity...');
      await new Promise(resolve => setTimeout(resolve, 800)); // Visual delay for better UX
      
      setScanProgress('Extracting medicine details...');
      // Ensure we only pass the base64 data part
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      const extracted = await scanPrescription(base64Data);
      
      setScanProgress('Finalizing results...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!extracted || extracted.length === 0) {
        setMedicines([]);
        setError("Could not identify any medicines. Please ensure the prescription is clearly visible and try a different angle.");
        return;
      }
      
      setMedicines(extracted);
      
      // Instantly pre-populate comparisons with returned prices so user sees results immediately
      const instantComparisons: Record<string, { name: string; prices: MedicinePrice[] }[]> = {};
      extracted.forEach(med => {
        if (med.prices && med.prices.length > 0) {
          instantComparisons[med.name] = [{
            name: med.name,
            prices: med.prices
          }];
        }
      });
      if (Object.keys(instantComparisons).length > 0) {
        setComparisons(instantComparisons);
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);

      // Trigger comparisons sequentially to avoid quota issues
      const compareSequentially = async () => {
        // Wait a small bit for the list to render first
        await new Promise(r => setTimeout(r, 1000));
        
        for (const med of extracted) {
          // Skip if we already got prices instantly from the query results of scanner
          if (med.prices && med.prices.length > 0) {
            console.log(`Skipping background compare for ${med.name} since we already have instant scanned prices.`);
            continue;
          }
          try {
            await handleCompare(med.name, med.dosage);
            // Relaxed gap between requests to stay safe for Gemini Search tool
            await new Promise(r => setTimeout(r, 3000));
          } catch (e) {
            console.error(`Sequential comparison failed for ${med.name}`, e);
          }
        }
      };
      
      compareSequentially();

      setScanProgress('Saving to your history...');
      // Save to Firestore
      if (auth.currentUser) {
        const path = 'prescriptions';
        try {
          await addDoc(collection(db, path), {
            userId: auth.currentUser.uid,
            imageUrl: base64, // In real app, upload to Storage and save URL
            extractedMedicines: extracted,
            createdAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to process prescription. Please try again.";
      setError(msg);
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  const handleCompare = async (medName: string, dosage: string) => {
    setComparing(prev => ({ ...prev, [medName]: true }));
    setError(''); // Clear any old error
    try {
      const searchQuery = `${medName} ${dosage}`.trim();
      const products = await comparePrices(searchQuery);
      if (!products || products.length === 0) {
        throw new Error("No prices found");
      }
      setComparisons(prev => ({ ...prev, [medName]: products }));
    } catch (err: any) {
      console.error(`Failed to compare prices for ${medName}`, err);
      // If it's a quota error, we show a friendlier sub-message
      if (err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('load')) {
        setError(`AI is busy searching. You can manually retry checking ${medName} in a moment.`);
      } else {
        setError(`Price check failed for ${medName}. Try a simpler name.`);
      }
    } finally {
      setComparing(prev => ({ ...prev, [medName]: false }));
    }
  };

  const updateDosage = (index: number, newDosage: string) => {
    setMedicines(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], dosage: newDosage };
      return updated;
    });
  };

  const clearResults = () => {
    setImage(null);
    setMedicines([]);
    setComparisons({});
    setError('');
    setShowSuccess(false);
  };

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-20"
      >
        <div className="inline-flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-6 py-3 rounded-full text-xs font-black uppercase tracking-[0.25em] mb-8 border border-indigo-100 dark:border-indigo-800/50 shadow-sm shadow-indigo-500/5">
          <FileText className="w-4 h-4 animate-pulse" />
          <span>Smart Prescription Scanner</span>
        </div>
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white mb-6 sm:mb-8 tracking-tighter leading-none">
          Upload <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-accent-500">Prescription</span>
        </h2>
        <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
          Scan your prescription to identify medicines and compare prices instantly across all major platforms.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
        {/* Upload Area */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-5 space-y-10"
        >
          <div className={cn(
            "relative min-h-[350px] sm:min-h-[500px] lg:aspect-[4/5] bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] sm:rounded-[3rem] shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-700 group",
            isCameraActive ? "overflow-hidden" : "overflow-visible"
          )}>
            <AnimatePresence mode="wait">
              {isCameraActive ? (
                <motion.div 
                  key="camera"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col bg-black"
                >
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  
                  {!stream && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
                      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                      <p className="text-white/50 text-xs font-black uppercase tracking-widest">Starting Camera...</p>
                    </div>
                  )}
                  
                  {/* Alignment Guide Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <motion.div 
                      animate={{ opacity: [0.3, 0.5, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-[80%] h-[60%] border-2 border-white/30 rounded-3xl relative"
                    >
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl" />
                    </motion.div>
                  </div>

                  {/* Real-time Feedback HUD */}
                  <div className="absolute top-8 left-0 right-0 px-8 flex justify-between items-start pointer-events-none">
                    <div className="space-y-3">
                      <div className={cn(
                        "px-4 py-2 rounded-xl backdrop-blur-xl border flex items-center space-x-2 transition-all duration-500",
                        lightingStatus === 'good' 
                          ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" 
                          : "bg-amber-500/30 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                      )}>
                        <Sparkles className={cn("w-4 h-4", lightingStatus !== 'good' && "animate-pulse")} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {lightingStatus === 'good' ? 'Lighting: Good' : 'Adjust Lighting'}
                        </span>
                      </div>
                      <div className={cn(
                        "px-4 py-2 rounded-xl backdrop-blur-xl border flex items-center space-x-2 transition-all duration-500",
                        isStable 
                          ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-400" 
                          : "bg-red-500/30 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                      )}>
                        <Activity className={cn("w-4 h-4", !isStable && "animate-bounce")} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {isStable ? 'Ready to Scan' : 'Hold Steady'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-slate-900/40 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/10 text-white/70 text-[10px] font-black uppercase tracking-widest">
                      Align Rx within frame
                    </div>
                  </div>

                  <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center space-x-6 px-6">
                    <button 
                      onClick={stopCamera}
                      className="p-4 bg-white/20 backdrop-blur-xl rounded-2xl text-white hover:bg-white/30 transition-all border border-white/10 shadow-2xl"
                    >
                      <X className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={capturePhoto}
                      className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.3)] active:scale-90 transition-all group/btn"
                    >
                      <div className="w-16 h-16 border-[4px] border-slate-900 rounded-full group-hover/btn:scale-95 transition-transform" />
                    </button>
                    <button 
                      onClick={startCamera}
                      className="p-4 bg-white/20 backdrop-blur-xl rounded-2xl text-white hover:bg-white/30 transition-all border border-white/10 shadow-2xl"
                    >
                      <RefreshCw className="w-6 h-6" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center"
                >
                  {image ? (
                    <div className="relative w-full h-full group/image">
                      <img src={image} alt="Prescription" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center space-x-6 backdrop-blur-sm">
                        <button 
                          onClick={() => setImage(null)}
                          className="p-6 bg-white rounded-[2rem] text-slate-950 font-black flex items-center space-x-3 shadow-2xl hover:scale-105 active:scale-95 transition-all"
                        >
                          <RefreshCw className="w-6 h-6 text-indigo-600" />
                          <span className="text-sm uppercase tracking-widest">Retake Photo</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 sm:p-16 text-center w-full h-full flex flex-col items-center justify-center">
                      <div className="w-24 h-24 sm:w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] sm:rounded-[3rem] flex items-center justify-center mb-8 sm:mb-10 mx-auto shadow-inner group-hover:scale-110 transition-transform duration-700">
                        <UploadIcon className="text-indigo-600 dark:text-indigo-400 w-10 h-10 sm:w-14 h-14" />
                      </div>
                      <h3 className="text-xl sm:text-4xl font-black text-slate-900 dark:text-white mb-2 sm:mb-4 tracking-tight">Select Source</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-sm font-medium mb-6 sm:mb-10 max-w-[280px] mx-auto">Choose how you want to provide your prescription</p>
                      
                      <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full max-w-md px-4">
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="relative flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl sm:rounded-[2.5rem] border-2 border-transparent hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-800 transition-all group/opt shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 p-2 sm:p-3 opacity-0 group-hover/opt:opacity-100 transition-opacity">
                            <CheckCircle className="w-3 h-3 sm:w-4 h-4 text-indigo-500" />
                          </div>
                          <div className="w-10 h-10 sm:w-12 h-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center mb-3 sm:mb-4 shadow-sm group-hover/opt:scale-110 transition-transform">
                            <UploadIcon className="w-5 h-5 sm:w-6 h-6 text-slate-400 group-hover/opt:text-indigo-500 transition-colors" />
                          </div>
                          <span className="font-black text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-900 dark:text-white mb-1">Gallery</span>
                          <span className="text-[6px] sm:text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center">Choose files</span>
                        </button>
                        <button 
                          onClick={startCamera}
                          className="relative flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl sm:rounded-[2.5rem] border-2 border-transparent hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-800 transition-all group/opt shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 p-2 sm:p-3 opacity-0 group-hover/opt:opacity-100 transition-opacity">
                            <CheckCircle className="w-3 h-3 sm:w-4 h-4 text-indigo-500" />
                          </div>
                          <div className="w-10 h-10 sm:w-12 h-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center mb-3 sm:mb-4 shadow-sm group-hover/opt:scale-110 transition-transform">
                            <Camera className="w-5 h-5 sm:w-6 h-6 text-slate-400 group-hover/opt:text-indigo-500 transition-colors" />
                          </div>
                          <span className="font-black text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-900 dark:text-white mb-1">Camera</span>
                          <span className="text-[6px] sm:text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center">Snap photo</span>
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {scanning && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-6">
                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{scanProgress}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Analysis</span>
              </div>
              <div className="h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 shadow-sm shadow-indigo-500/5 flex items-center px-6 space-x-4">
                <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                <div className="flex-1 h-1.5 bg-indigo-200 dark:bg-indigo-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full"
                  />
                </div>
              </div>
            </div>
          )}

          {showSuccess && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-8 rounded-[2.5rem] flex items-center space-x-5 border border-emerald-100 dark:border-emerald-500/20 shadow-sm shadow-emerald-500/5"
            >
              <CheckCircle className="w-7 h-7 shrink-0" />
              <div className="flex-1">
                <span className="font-black text-sm uppercase tracking-widest block">Scan Successful</span>
                <span className="text-[10px] font-bold opacity-70">AI has identified {medicines.length} medicines from your prescription.</span>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-8 rounded-[2.5rem] flex items-center space-x-5 border border-red-100 dark:border-red-500/20 shadow-sm shadow-red-500/5"
            >
              <AlertCircle className="w-7 h-7 shrink-0" />
              <span className="font-black text-sm uppercase tracking-widest">{error}</span>
            </motion.div>
          )}
        </motion.div>

        {/* Results Area */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-7 space-y-12"
        >
          {medicines.length > 0 ? (
            <div className="space-y-8 md:space-y-12">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-12 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 md:p-8">
                  <button 
                    onClick={clearResults}
                    className="p-2 md:p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-red-500 transition-all group/clear"
                    title="Clear All Results"
                  >
                    <X className="w-4 h-4 md:w-5 h-5 group-hover/clear:rotate-90 transition-transform" />
                  </button>
                </div>
                <div className="flex items-center space-x-4 md:space-x-6 mb-8 md:mb-10">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl md:rounded-[1.5rem] flex items-center justify-center shadow-inner">
                    <FileText className="text-indigo-600 dark:text-indigo-400 w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-1 md:mb-2">Extracted Medicines</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI identified {medicines.length} items</p>
                  </div>
                </div>
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 gap-6 md:gap-8"
                >
                  {medicines.map((med, idx) => (
                    <motion.div key={idx} variants={itemVariants} className="space-y-4 md:space-y-6">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all group/med">
                        <div className="flex items-center space-x-4 md:space-x-5 flex-1">
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 group-hover/med:scale-110 transition-transform shrink-0">
                            <CheckCircle className="w-5 h-5 md:w-6 h-6 text-emerald-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white break-words leading-tight">{med.name}</h4>
                            <div className="mt-2 md:mt-3 flex flex-wrap items-center gap-2 md:gap-3">
                              <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Dosage:</span>
                              <input 
                                type="text"
                                value={med.dosage}
                                onChange={(e) => updateDosage(idx, e.target.value)}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 md:px-3 md:py-2 text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300 focus:border-indigo-500 outline-none transition-all w-full max-w-[150px] md:max-w-[180px]"
                              />
                            </div>
                            {med.sideEffects && (
                              <div className="mt-3 flex items-start space-x-2">
                                <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                                <p className="text-[9px] md:text-[10px] font-bold text-amber-600 dark:text-amber-400/80 uppercase tracking-tight leading-normal">
                                  <span className="opacity-70">Note:</span> {med.sideEffects}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => handleCompare(med.name, med.dosage)}
                          disabled={comparing[med.name]}
                          className={cn(
                            "px-6 md:px-8 py-3.5 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 md:space-x-3 transition-all shadow-lg",
                            comparing[med.name] 
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed" 
                              : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20 active:scale-95"
                          )}
                        >
                          {comparing[med.name] ? (
                            <>
                              <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                              <span>Comparing...</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3 md:w-4 md:h-4" />
                              <span>Compare Prices</span>
                            </>
                          )}
                        </button>
                      </div>
 
                      {/* Inline Comparison Results */}
                      <AnimatePresence>
                        {comparisons[med.name] && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden space-y-4 md:space-y-6 pl-2 md:pl-12 border-l-2 border-slate-100 dark:border-slate-800"
                          >
                            <div className="flex items-center justify-between px-2">
                              <div className="flex items-center space-x-2 md:space-x-3">
                                <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-accent-500" />
                                <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Best Deals Found</span>
                              </div>
                              <button 
                                onClick={() => handleCompare(med.name, med.dosage)}
                                className="text-[8px] md:text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                              >
                                Refresh
                              </button>
                            </div>
                            <motion.div 
                              variants={containerVariants}
                              initial="hidden"
                              animate="visible"
                              className="grid grid-cols-1 gap-4 md:gap-6"
                            >
                              {comparisons[med.name].map((product, pIdx) => (
                                <motion.div key={pIdx} variants={itemVariants}>
                                  <MedicineCard medicineName={product.name} prices={product.prices} />
                                </motion.div>
                              ))}
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[600px] flex flex-col items-center justify-center text-center p-20 bg-slate-50/50 dark:bg-slate-900/50 rounded-[4rem] border-2 border-dashed border-slate-200 dark:border-slate-800 group">
              <div className="w-32 h-32 bg-white dark:bg-slate-800 rounded-[3rem] flex items-center justify-center mb-10 shadow-sm border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform duration-700">
                <FileText className="text-slate-200 dark:text-slate-700 w-16 h-16" />
              </div>
              <h4 className="text-3xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter">No Results Yet</h4>
              <p className="text-xl text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                Upload your prescription to see extracted medicines and live price comparisons here.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
