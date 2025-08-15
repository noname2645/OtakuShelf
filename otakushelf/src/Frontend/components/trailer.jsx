import React, { useState, useEffect } from "react";
import "../Stylesheets/trailer.css";

const Trailer = ({ videoId }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Reset states when videoId changes
    setIsLoaded(false);
    setError(false);
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

  const handleLoad = () => {
    setIsLoaded(true);
    setError(false);
  };

  const handleError = () => {
    setError(true);
    setIsLoaded(false);
  };

  return (
    <div className="trailer-container">
      {error ? (
        <div className="trailer-error">
          <p>Failed to load trailer. The video may not be available.</p>
        </div>
      ) : (
        <>
          {!isLoaded && (
            <div className="trailer-loading">
              <p>Loading trailer...</p>
            </div>
          )}
          <iframe
            key={videoId} // Force re-render when videoId changes
            src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`}
            title="Anime Trailer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={handleLoad}
            onError={handleError}
            style={{
              display: isLoaded ? 'block' : 'none'
            }}
          />
        </>
      )}
    </div>
  );
};

export default Trailer;