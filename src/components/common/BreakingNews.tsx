"use client";

import { apiCall } from "@/api/apiCall";
import { ENDPOINTS } from "@/api/endpoints";
import { useEffect, useState, useRef, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  SlidersHorizontal,
  Flame,
  Clock,
  Sparkles,
  Zap,
  RotateCcw,
} from "lucide-react";

interface BreakingNewsItem {
  id: string | number;
  title?: string;
  message: string;
  time?: string;
  status: "NEW" | "HOT" | "TRENDING" | "LIVE" | string;
  isActive?: boolean;
}

export interface BreakingNewsProps {
  initialSpeed?: number; // 0.5x, 1x, 1.5x, 2x
  initialMode?: "marquee" | "slide";
  pauseOnHover?: boolean;
  className?: string;
}

const SPEED_PRESETS = [
  { label: "0.5x", desc: "Slow", multiplier: 0.5 },
  { label: "1x", desc: "Normal", multiplier: 1.0 },
  { label: "1.5x", desc: "Fast", multiplier: 1.5 },
  { label: "2x", desc: "Rapid", multiplier: 2.0 },
];

const SLIDE_INTERVAL_PRESETS = [
  { label: "3s", value: 3000 },
  { label: "5s", value: 5000 },
  { label: "8s", value: 8000 },
  { label: "10s", value: 10000 },
];

const BreakingNews: React.FC<BreakingNewsProps> = ({
  initialSpeed = 1.0,
  initialMode = "marquee",
  pauseOnHover = true,
  className = "",
}) => {
  const [breakingNews, setBreakingNews] = useState<BreakingNewsItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(true);

  // User adjustable movement settings (persisted in localStorage)
  const [movementMode, setMovementMode] = useState<"marquee" | "slide">(() => {
    try {
      const saved = localStorage.getItem("im_bn_movement_mode");
      if (saved === "marquee" || saved === "slide") return saved;
    } catch (_) {}
    return initialMode;
  });

  const [speedMultiplier, setSpeedMultiplier] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("im_bn_speed_multiplier");
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0.25 && val <= 3.0) return val;
      }
    } catch (_) {}
    return initialSpeed;
  });

  const [slideInterval, setSlideInterval] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("im_bn_slide_interval");
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 2000 && val <= 15000) return val;
      }
    } catch (_) {}
    return 5000;
  });

  const [showAdjustPanel, setShowAdjustPanel] = useState(false);
  const adjustPanelRef = useRef<HTMLDivElement>(null);

  // Close adjust panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (adjustPanelRef.current && !adjustPanelRef.current.contains(e.target as Node)) {
        setShowAdjustPanel(false);
      }
    };
    if (showAdjustPanel) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAdjustPanel]);

  // Persist settings changes
  const handleModeChange = (mode: "marquee" | "slide") => {
    setMovementMode(mode);
    try {
      localStorage.setItem("im_bn_movement_mode", mode);
    } catch (_) {}
  };

  const handleSpeedChange = (spd: number) => {
    setSpeedMultiplier(spd);
    try {
      localStorage.setItem("im_bn_speed_multiplier", String(spd));
    } catch (_) {}
  };

  const handleIntervalChange = (val: number) => {
    setSlideInterval(val);
    try {
      localStorage.setItem("im_bn_slide_interval", String(val));
    } catch (_) {}
  };

  const fetchBreakingNews = async () => {
    try {
      setLoading(true);
      let list: any[] = [];

      // Strategy 1: Direct backend /api/breaking-news (works directly on admin.incensemedia.in)
      try {
        const res = await apiCall("get", "/api/breaking-news");
        if (res?.success) {
          const raw = res.data?.data || res.data;
          if (Array.isArray(raw) && raw.length > 0) list = raw;
        }
      } catch (_) {}

      // Strategy 2: ENDPOINTS.WEB_BREAKING_NEWS
      if (list.length === 0) {
        try {
          const res = await apiCall("get", ENDPOINTS.WEB_BREAKING_NEWS);
          if (res?.success) {
            const raw = res.data?.data || res.data;
            if (Array.isArray(raw) && raw.length > 0) list = raw;
          }
        } catch (_) {}
      }

      // Strategy 3: Direct fetch to public API https://api.incensemedia.in/web/breaking-news
      if (list.length === 0) {
        try {
          const res = await fetch("https://api.incensemedia.in/web/breaking-news").then((r) => r.json());
          if (res?.success && Array.isArray(res?.data) && res.data.length > 0) {
            list = res.data;
          }
        } catch (_) {}
      }

      // Filter only active news if active field present
      const activeList = list.filter((n: any) => n.isActive !== false && n.isActive !== 0);
      setBreakingNews(activeList.length > 0 ? activeList : list);
    } catch (error) {
      console.error("Error fetching breaking news:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBreakingNews();
  }, []);

  // Slide mode timer
  useEffect(() => {
    if (movementMode !== "slide" || !isPlaying || isHovered || breakingNews.length <= 1) {
      return;
    }
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev === breakingNews.length - 1 ? 0 : prev + 1));
    }, slideInterval);

    return () => clearInterval(timer);
  }, [movementMode, isPlaying, isHovered, breakingNews.length, slideInterval]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsPlaying(false);
    setTimeout(() => setIsPlaying(true), 8000);
  };

  const goToPrevious = () => {
    if (breakingNews.length === 0) return;
    const newIndex = currentIndex === 0 ? breakingNews.length - 1 : currentIndex - 1;
    goToSlide(newIndex);
  };

  const goToNext = () => {
    if (breakingNews.length === 0) return;
    const newIndex = currentIndex === breakingNews.length - 1 ? 0 : currentIndex + 1;
    goToSlide(newIndex);
  };

  const getStatusColor = (status?: string) => {
    switch ((status || "").toUpperCase()) {
      case "NEW":
        return "bg-slate-900 text-white";
      case "HOT":
        return "bg-rose-600 text-white animate-pulse";
      case "TRENDING":
        return "bg-indigo-600 text-white";
      case "LIVE":
        return "bg-emerald-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  const formatTimeToAMPM = (timeString?: string) => {
    if (!timeString) return "";
    try {
      // Handles ISO dates like "1970-01-01T10:41:00.000Z"
      if (timeString.includes("T")) {
        const timePart = timeString.split("T")[1];
        const [hours, minutes] = timePart.split(":");
        const hour24 = parseInt(hours, 10);
        if (!isNaN(hour24)) {
          const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
          const ampm = hour24 >= 12 ? "PM" : "AM";
          return `${hour12}:${minutes} ${ampm}`;
        }
      }
      // Handles HH:MM format like "10:41:00" or "10:41"
      if (timeString.includes(":")) {
        const [hours, minutes] = timeString.split(":");
        const hour24 = parseInt(hours, 10);
        if (!isNaN(hour24)) {
          const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
          const ampm = hour24 >= 12 ? "PM" : "AM";
          return `${hour12}:${minutes} ${ampm}`;
        }
      }
    } catch (_) {}
    return timeString;
  };

  // Base marquee duration calculated from content length and adjusted by speedMultiplier
  const marqueeDuration = useMemo(() => {
    const baseSeconds = Math.max(18, (breakingNews.length || 1) * 12);
    const calculated = baseSeconds / (speedMultiplier || 1.0);
    return Math.max(4, Math.min(120, calculated));
  }, [breakingNews.length, speedMultiplier]);

  if (loading) {
    return (
      <div className={`mb-6 ${className}`}>
        <div className="flex items-center bg-white border border-gray-200 shadow-sm rounded-lg p-2 overflow-hidden">
          <div className="relative inline-flex items-center">
            <span className="bg-primaryRed text-white h-[36px] px-3.5 text-xs font-bold tracking-wider uppercase flex items-center relative z-10 rounded-md">
              BREAKING NEWS
            </span>
          </div>
          <div className="ml-4 flex items-center space-x-2 text-gray-400 text-xs animate-pulse">
            <span className="w-2 h-2 rounded-full bg-primaryRed animate-ping"></span>
            <span>Loading updates...</span>
          </div>
        </div>
      </div>
    );
  }

  if (breakingNews.length === 0) {
    return null;
  }

  const currentNews = breakingNews[currentIndex] || breakingNews[0];

  return (
    <div className={`mb-6 select-none ${className}`}>
      {/* Inline styles for movement animations */}
      <style>{`
        @keyframes im-marquee-crawl {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        @keyframes im-slide-fade-in {
          0% {
            opacity: 0;
            transform: translate3d(24px, 0, 0);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        .im-marquee-track {
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
          will-change: transform;
          animation: im-marquee-crawl var(--marquee-duration, 25s) linear infinite;
        }
        .im-marquee-paused {
          animation-play-state: paused !important;
        }
        .im-slide-item-enter {
          animation: im-slide-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div
        className="relative flex items-center bg-white border border-gray-200/90 shadow-sm rounded-xl px-2.5 py-1.5 gap-2 transition-all hover:border-red-300 hover:shadow"
        onMouseEnter={() => pauseOnHover && setIsHovered(true)}
        onMouseLeave={() => pauseOnHover && setIsHovered(false)}
      >
        {/* Red Arrow Label */}
        <div className="relative inline-flex items-center shrink-0">
          <div className="bg-gradient-to-r from-red-600 to-primaryRed text-white h-[36px] px-3.5 text-xs font-extrabold tracking-wider flex items-center gap-1.5 z-10 rounded-lg shadow-sm">
            <Flame className="w-3.5 h-3.5 fill-white text-white animate-bounce" />
            <span className="hidden sm:inline">BREAKING NEWS</span>
            <span className="sm:hidden">LIVE</span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* MOVING NEWS CONTAINER                                          */}
        {/* ============================================================== */}
        <div className="relative flex-1 overflow-hidden min-h-[38px] flex items-center">
          {movementMode === "marquee" ? (
            /* ------------------ CONTINUOUS MOVING MARQUEE ------------------ */
            <div
              className={`im-marquee-track ${(!isPlaying || isHovered) ? "im-marquee-paused" : ""}`}
              style={{
                "--marquee-duration": `${marqueeDuration}s`,
              } as React.CSSProperties}
            >
              {/* Loop duplicated twice for seamless, infinite crawl */}
              {[...breakingNews, ...breakingNews].map((item, idx) => {
                const timeStr = formatTimeToAMPM(item.time);
                return (
                  <div
                    key={`${item.id}-${idx}`}
                    className="inline-flex items-center space-x-2 mr-10 cursor-pointer group"
                    onClick={() => {
                      setCurrentIndex(idx % breakingNews.length);
                    }}
                  >
                    {item.status && (
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wide shadow-xs ${getStatusColor(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    )}

                    {timeStr && (
                      <span className="inline-flex items-center text-xs font-semibold text-red-600 bg-red-50 border border-red-200/60 px-1.5 py-0.5 rounded">
                        <Clock className="w-3 h-3 mr-1 text-red-500" />
                        {timeStr}
                      </span>
                    )}

                    <span className="text-sm font-medium text-gray-800 group-hover:text-red-700 transition-colors">
                      {item.title && <strong className="font-semibold text-gray-900 mr-1.5">{item.title}:</strong>}
                      "{item.message}"
                    </span>

                    <span className="text-red-400 font-bold ml-2">✦</span>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ------------------ SLIDE / STEP MOVING ITEM ------------------ */
            <div
              key={currentNews.id || currentIndex}
              className="im-slide-item-enter flex items-center space-x-2.5 overflow-hidden w-full"
            >
              {currentNews.status && (
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 tracking-wide ${getStatusColor(
                    currentNews.status
                  )}`}
                >
                  {currentNews.status}
                </span>
              )}

              {currentNews.time && (
                <span className="inline-flex items-center text-xs font-semibold text-red-600 bg-red-50 border border-red-200/60 px-1.5 py-0.5 rounded shrink-0">
                  <Clock className="w-3 h-3 mr-1 text-red-500" />
                  {formatTimeToAMPM(currentNews.time)}
                </span>
              )}

              <p className="text-gray-800 text-sm font-medium truncate flex-1" title={currentNews.message}>
                {currentNews.title && <strong className="font-semibold text-gray-900 mr-1.5">{currentNews.title}:</strong>}
                "{currentNews.message}"
              </p>

              <span className="hidden md:inline-block text-[11px] text-gray-400 font-medium shrink-0 ml-auto mr-1">
                {currentIndex + 1} of {breakingNews.length}
              </span>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* ADJUSTABLE MOVEMENT CONTROLS                                  */}
        {/* ============================================================== */}
        <div className="flex items-center space-x-1 shrink-0 pl-1 border-l border-gray-200">
          {/* Previous Button (for slide mode or jump) */}
          <button
            type="button"
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            onClick={goToPrevious}
            title="Previous Headline"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Play / Pause Toggle Button */}
          <button
            type="button"
            className={`p-1.5 rounded-lg transition-colors ${
              isPlaying
                ? "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                : "text-amber-600 bg-amber-50 hover:bg-amber-100"
            }`}
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? "Pause Movement" : "Resume Movement"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Next Button */}
          <button
            type="button"
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            onClick={goToNext}
            title="Next Headline"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Quick Speed Cycle Pill */}
          <button
            type="button"
            className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md bg-gray-100 hover:bg-red-50 hover:text-red-700 text-gray-700 transition-colors border border-gray-200/80"
            title="Click to cycle movement speed"
            onClick={() => {
              const curIdx = SPEED_PRESETS.findIndex((p) => p.multiplier === speedMultiplier);
              const nextIdx = (curIdx + 1) % SPEED_PRESETS.length;
              handleSpeedChange(SPEED_PRESETS[nextIdx].multiplier);
            }}
          >
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>{speedMultiplier}x</span>
          </button>

          {/* Adjust Settings Button (Opens full adjustment drawer/popover) */}
          <div className="relative" ref={adjustPanelRef}>
            <button
              type="button"
              className={`p-1.5 rounded-lg transition-colors border ${
                showAdjustPanel
                  ? "bg-red-50 text-red-600 border-red-200 shadow-xs"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-100 border-transparent"
              }`}
              onClick={() => setShowAdjustPanel(!showAdjustPanel)}
              title="Adjust Movement & Speed Settings"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {/* Adjustable Controls Popover Menu */}
            {showAdjustPanel && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-4 text-left animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center space-x-1.5">
                    <SlidersHorizontal className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                      Movement Controls
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleSpeedChange(1.0);
                      handleModeChange("marquee");
                      handleIntervalChange(5000);
                    }}
                    className="text-[11px] text-gray-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                    title="Reset to default"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>

                {/* 1. Movement Style */}
                <div className="mt-3">
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1.5">
                    Movement Mode
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 bg-gray-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleModeChange("marquee")}
                      className={`text-xs py-1.5 px-2 rounded-md font-medium transition-all ${
                        movementMode === "marquee"
                          ? "bg-white text-gray-900 shadow-xs font-bold"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Ticker Crawl
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeChange("slide")}
                      className={`text-xs py-1.5 px-2 rounded-md font-medium transition-all ${
                        movementMode === "slide"
                          ? "bg-white text-gray-900 shadow-xs font-bold"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Slide Item
                    </button>
                  </div>
                </div>

                {/* 2. Speed Adjustment for Marquee Mode */}
                {movementMode === "marquee" && (
                  <div className="mt-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-gray-600">
                        Crawl Speed: <span className="text-red-600 font-bold">{speedMultiplier}x</span>
                      </label>
                      <span className="text-[10px] text-gray-400">
                        {speedMultiplier <= 0.5 ? "Slow" : speedMultiplier >= 2.0 ? "Turbo" : "Normal"}
                      </span>
                    </div>

                    {/* Speed preset pills */}
                    <div className="grid grid-cols-4 gap-1 mb-2">
                      {SPEED_PRESETS.map((p) => {
                        const active = speedMultiplier === p.multiplier;
                        return (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => handleSpeedChange(p.multiplier)}
                            className={`text-xs py-1 px-1 rounded-md border text-center font-semibold transition-all ${
                              active
                                ? "bg-red-600 text-white border-red-600 shadow-xs"
                                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Smooth fine-tune slider */}
                    <input
                      type="range"
                      min="0.3"
                      max="2.5"
                      step="0.1"
                      value={speedMultiplier}
                      onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                      className="w-full accent-primaryRed h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                    />
                  </div>
                )}

                {/* 3. Interval Adjustment for Slide Mode */}
                {movementMode === "slide" && (
                  <div className="mt-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-gray-600">
                        Slide Interval: <span className="text-red-600 font-bold">{slideInterval / 1000}s</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                      {SLIDE_INTERVAL_PRESETS.map((p) => {
                        const active = slideInterval === p.value;
                        return (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => handleIntervalChange(p.value)}
                            className={`text-xs py-1 px-1 rounded-md border text-center font-semibold transition-all ${
                              active
                                ? "bg-red-600 text-white border-red-600 shadow-xs"
                                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Feature notice */}
                <div className="mt-3.5 pt-2.5 border-t border-gray-100 text-[10px] text-gray-400 flex items-center justify-between">
                  <span>Hover to pause movement</span>
                  <span className="text-emerald-600 font-medium">✓ Auto-saved</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreakingNews;
