import React, { useState, useEffect } from "react";
import "../Stylesheets/trailer.css";

const Trailer = ({ videoId }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  // Reset when video changes
  useEffect(() => {
    setIsPlaying(false);
    setThumbError(false);
  }, [videoId]);

  if (!videoId) {
    return (
      <div className="trailer-container">
        <div className="no-trailer">
          <p>No trailer available for this anime.</p>
        </div>
      </div>
    );
  }

  // Best quality first, fallback to hqdefault if maxres 404s
  const thumbUrl = thumbError
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  return (
    <div className="trailer-container">
      {isPlaying ? (
        <iframe
          key={videoId}
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1`}
          title="Anime Trailer"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <div className="trailer-facade" onClick={() => setIsPlaying(true)}>
          <img
            className="trailer-thumb"
            src={thumbUrl}
            alt="Trailer thumbnail"
            onError={() => setThumbError(true)}
          />
          <div className="trailer-play-btn">
            <svg viewBox="0 0 68 48" width="68" height="48">
              <path className="play-btn-bg" d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z"/>
              <path className="play-btn-arrow" d="M45 24 27 14v20z"/>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trailer;