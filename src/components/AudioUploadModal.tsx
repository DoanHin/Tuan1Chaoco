import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UploadCloud, 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  FileAudio, 
  X,
  Volume2,
  Sparkles,
  RefreshCw,
  Download,
  HardDrive
} from 'lucide-react';
import { audioStorage, StoredAudioMeta } from '../utils/audioStorage';
import { soundManager } from '../utils/sound';

interface AudioUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAudioUpdated?: () => void;
}

export const AudioUploadModal: React.FC<AudioUploadModalProps> = ({
  isOpen,
  onClose,
  onAudioUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'record'>('upload');
  
  // Stored audio state
  const [storedAudio, setStoredAudio] = useState<{ blob: Blob; meta: StoredAudioMeta } | null>(null);
  const [isPlayingStored, setIsPlayingStored] = useState<boolean>(false);
  const storedAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlayingRecorded, setIsPlayingRecorded] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const recordedAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load stored audio when opened
  useEffect(() => {
    if (isOpen) {
      loadCurrentAudio();
    } else {
      cleanup();
    }
  }, [isOpen]);

  const loadCurrentAudio = async () => {
    try {
      const data = await audioStorage.getAudio('intro_audio');
      setStoredAudio(data);
    } catch {
      // ignore
    }
  };

  const cleanup = () => {
    stopRecording();
    stopAllAudio();
    setSelectedFile(null);
    setRecordedBlob(null);
    setFeedbackMsg(null);
  };

  const stopAllAudio = () => {
    if (storedAudioPlayerRef.current) {
      storedAudioPlayerRef.current.pause();
      storedAudioPlayerRef.current = null;
    }
    if (recordedAudioPlayerRef.current) {
      recordedAudioPlayerRef.current.pause();
      recordedAudioPlayerRef.current = null;
    }
    setIsPlayingStored(false);
    setIsPlayingRecorded(false);
    audioStorage.stopPlayback();
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    // Check if audio file
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|ogg|aac|webm)$/i)) {
      setFeedbackMsg({ type: 'error', text: 'Vui lòng chọn tệp âm thanh hợp lệ (.mp3, .wav, .m4a, .ogg, .webm)' });
      return;
    }
    // Limit to 25MB
    if (file.size > 25 * 1024 * 1024) {
      setFeedbackMsg({ type: 'error', text: 'Kích thước tệp tối đa là 25MB' });
      return;
    }

    setSelectedFile(file);
    setFeedbackMsg(null);
    soundManager.playClick();
  };

  // Save uploaded file
  const handleSaveUploadedFile = async () => {
    if (!selectedFile) return;

    try {
      await audioStorage.saveAudio('intro_audio', selectedFile, {
        name: selectedFile.name,
      });
      await loadCurrentAudio();
      setSelectedFile(null);
      setFeedbackMsg({ type: 'success', text: 'Đã lưu tệp âm thanh thành công! AZero sẽ phát bản ghi âm này khi mở đầu.' });
      soundManager.playCorrect();
      onAudioUpdated?.();
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Không thể lưu tệp âm thanh. Vui lòng thử lại.' });
    }
  };

  // Start microphone recording
  const startRecording = async () => {
    setFeedbackMsg(null);
    recordedChunksRef.current = [];
    setRecordedBlob(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        setRecordedBlob(blob);
        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

      soundManager.playClick();
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Không thể kết nối Micro. Hãy cho phép trình duyệt truy cập Microphone của bạn.' });
    }
  };

  // Stop microphone recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  };

  // Save recorded blob
  const handleSaveRecordedAudio = async () => {
    if (!recordedBlob) return;

    try {
      const fileName = `Ghi_am_${new Date().toLocaleTimeString('vi-VN').replace(/:/g, '-')}.webm`;
      await audioStorage.saveAudio('intro_audio', recordedBlob, {
        name: fileName,
        duration: recordingSeconds
      });
      await loadCurrentAudio();
      setRecordedBlob(null);
      setRecordingSeconds(0);
      setFeedbackMsg({ type: 'success', text: 'Đã lưu bản thu âm thành công! AZero sẽ phát bản thu này khi mở đầu.' });
      soundManager.playCorrect();
      onAudioUpdated?.();
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Không thể lưu bản thu âm. Vui lòng thử lại.' });
    }
  };

  // Play / Pause stored audio preview
  const handleTogglePlayStored = () => {
    if (!storedAudio) return;

    if (isPlayingStored && storedAudioPlayerRef.current) {
      storedAudioPlayerRef.current.pause();
      setIsPlayingStored(false);
    } else {
      stopAllAudio();
      const url = URL.createObjectURL(storedAudio.blob);
      const audio = new Audio(url);
      storedAudioPlayerRef.current = audio;

      audio.onplay = () => setIsPlayingStored(true);
      audio.onended = () => {
        setIsPlayingStored(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setIsPlayingStored(false);
        URL.revokeObjectURL(url);
      };

      audio.play().catch(() => setIsPlayingStored(false));
    }
  };

  // Play / Pause freshly recorded audio preview
  const handleTogglePlayRecorded = () => {
    if (!recordedBlob) return;

    if (isPlayingRecorded && recordedAudioPlayerRef.current) {
      recordedAudioPlayerRef.current.pause();
      setIsPlayingRecorded(false);
    } else {
      stopAllAudio();
      const url = URL.createObjectURL(recordedBlob);
      const audio = new Audio(url);
      recordedAudioPlayerRef.current = audio;

      audio.onplay = () => setIsPlayingRecorded(true);
      audio.onended = () => {
        setIsPlayingRecorded(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setIsPlayingRecorded(false);
        URL.revokeObjectURL(url);
      };

      audio.play().catch(() => setIsPlayingRecorded(false));
    }
  };

  // Delete stored custom audio (reverts to default AI speech)
  const handleDeleteStoredAudio = async () => {
    stopAllAudio();
    await audioStorage.removeAudio('intro_audio');
    setStoredAudio(null);
    setFeedbackMsg({ type: 'success', text: 'Đã gỡ bản ghi âm. Hệ thống sẽ sử dụng giọng AI Adam tự động.' });
    soundManager.playClick();
    onAudioUpdated?.();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md select-none overflow-y-auto">
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        className="w-full max-w-2xl bg-slate-900 border-2 border-cyan-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(6,182,212,0.25)] relative text-white my-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-400/30 shadow-inner">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Tải lên hoặc Ghi âm Giọng AZero</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  THẬT 100%
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Đưa file ghi âm từ điện thoại / CapCut / ElevenLabs hoặc thu âm trực tiếp
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopAllAudio();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Active Audio Card (If any) */}
        {storedAudio && (
          <div className="mt-4 p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-md">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-tech font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Đang sử dụng bản ghi âm của bạn:</span>
                </div>
                <div className="text-sm font-black text-white truncate max-w-[280px] sm:max-w-xs">
                  {storedAudio.meta.name}
                </div>
                <div className="text-[11px] text-slate-400">
                  Kích thước: {formatFileSize(storedAudio.meta.size)} • Cập nhật: {new Date(storedAudio.meta.updatedAt).toLocaleTimeString('vi-VN')}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
              <button
                onClick={handleTogglePlayStored}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  isPlayingStored
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-slate-950'
                }`}
              >
                {isPlayingStored ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlayingStored ? 'Tạm dừng' : 'Nghe thử'}</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  audioStorage.downloadAudio(storedAudio.blob, storedAudio.meta.name || 'azero_intro.mp3');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Tải tệp âm thanh này về máy tính của bạn"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Tải về máy</span>
              </button>

              <button
                onClick={handleDeleteStoredAudio}
                className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Xóa để quay lại giọng AI tự động"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Gỡ bỏ</span>
              </button>
            </div>
          </div>
        )}

        {/* Permanent disk storage notice */}
        <div className="mt-3 p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200 flex items-start gap-2.5">
          <HardDrive className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-white">Lưu ý khi Xuất ứng dụng (Export ZIP / Chạy offline):</span>
            <span className="text-slate-300 ml-1">
              Khi bạn tải lên hoặc ghi âm, tệp sẽ được lưu trực tiếp vào thư mục <code className="bg-slate-950 px-1.5 py-0.5 rounded text-cyan-300 font-mono text-[11px]">public/azero_intro.mp3</code> của dự án. Khi xuất file ZIP hoặc tải code về máy tính, file ghi âm này sẽ luôn đi kèm dự án để phát tự động mà không bị mất!
            </span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 mt-4 p-1 rounded-2xl bg-slate-950 border border-slate-800">
          <button
            onClick={() => {
              setActiveTab('upload');
              soundManager.playClick();
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>TẢI LÊN TỆP ÂM THANH (.MP3, .WAV...)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('record');
              soundManager.playClick();
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'record'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>THU ÂM TRỰC TIẾP QUA MICRO</span>
          </button>
        </div>

        {/* Tab 1: Upload File */}
        {activeTab === 'upload' && (
          <div className="mt-4 space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-950/50 scale-[1.01]'
                  : selectedFile
                    ? 'border-emerald-400 bg-emerald-950/20'
                    : 'border-slate-700 hover:border-cyan-500/60 bg-slate-950/40 hover:bg-slate-950/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.webm"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition shadow-md ${
                selectedFile ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-cyan-400'
              }`}>
                {selectedFile ? <FileAudio className="w-7 h-7" /> : <UploadCloud className="w-7 h-7" />}
              </div>

              {selectedFile ? (
                <div>
                  <div className="text-base font-extrabold text-white">{selectedFile.name}</div>
                  <div className="text-xs text-emerald-400 font-mono mt-1">
                    {formatFileSize(selectedFile.size)} • Sẵn sàng áp dụng
                  </div>
                  <div className="text-xs text-slate-400 mt-2">Bấm để chọn tệp khác nếu muốn</div>
                </div>
              ) : (
                <div>
                  <div className="text-base font-bold text-slate-200">
                    Kéo thả tệp âm thanh vào đây, hoặc <span className="text-cyan-400 underline">bấm để chọn</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Hỗ trợ: MP3, WAV, M4A, OGG, AAC (Tối đa 25MB)
                  </div>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="flex justify-end">
                <button
                  onClick={handleSaveUploadedFile}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ÁP DỤNG LÀM GIỌNG AZERO</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Live Microphone Recording */}
        {activeTab === 'record' && (
          <div className="mt-4 p-5 sm:p-6 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col items-center justify-center text-center">
            {/* Record Status and Timer */}
            <div className="font-mono text-3xl sm:text-4xl font-black text-cyan-300 tracking-wider mb-3">
              {formatTime(recordingSeconds)}
            </div>

            {/* Dynamic visual indicator */}
            {isRecording && (
              <div className="flex items-center gap-1.5 h-8 mb-4">
                {[40, 70, 100, 60, 90, 50, 80, 45, 95, 65, 85].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: ['20%', `${h}%`, '20%'] }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.8,
                      delay: i * 0.08,
                      ease: 'easeInOut'
                    }}
                    className="w-1.5 bg-rose-500 rounded-full"
                  />
                ))}
              </div>
            )}

            {/* Main Record Control Buttons */}
            {!isRecording && !recordedBlob && (
              <button
                onClick={startRecording}
                className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-sm flex items-center gap-2.5 shadow-lg shadow-rose-600/40 transition cursor-pointer"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-white animate-ping" />
                <Mic className="w-5 h-5" />
                <span>BẮT ĐẦU GHI ÂM (BẤM ĐỂ NÓI)</span>
              </button>
            )}

            {isRecording && (
              <button
                onClick={stopRecording}
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-sm flex items-center gap-2.5 shadow-lg shadow-amber-500/40 transition cursor-pointer animate-pulse"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>DỪNG VÀ HOÀN THÀNH BẢN THU</span>
              </button>
            )}

            {/* When Recording finished */}
            {!isRecording && recordedBlob && (
              <div className="w-full mt-2 space-y-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between">
                  <div className="text-xs text-left">
                    <span className="text-slate-400">Bản thu âm mới: </span>
                    <span className="font-bold text-white">{formatTime(recordingSeconds)}</span>
                  </div>

                  <button
                    onClick={handleTogglePlayRecorded}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {isPlayingRecorded ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlayingRecorded ? 'Tạm dừng' : 'Nghe lại'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setRecordedBlob(null);
                      setRecordingSeconds(0);
                      startRecording();
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Thu âm lại</span>
                  </button>

                  <button
                    onClick={handleSaveRecordedAudio}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/30 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>LƯU & SỬ DỤNG CHO AZERO</span>
                  </button>
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-400 mt-4 leading-relaxed max-w-md">
              💡 <strong className="text-amber-400">Gợi ý nội dung đọc:</strong> &ldquo;Xin chào quý thầy cô và các bạn học sinh Trường THPT Tô Hiệu! Tôi là AZero, nhân vật điều hành cuộc thi Kéo Co Trí Tuệ...&rdquo;
            </p>
          </div>
        )}

        {/* Feedback message banner */}
        {feedbackMsg && (
          <div className={`mt-3 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/80 border border-rose-500/50 text-rose-300'
          }`}>
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Bottom Footer info */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>* Bản ghi âm được lưu trữ an toàn ngay trên trình duyệt của bạn</span>
          <button
            onClick={() => {
              stopAllAudio();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </motion.div>
    </div>
  );
};
