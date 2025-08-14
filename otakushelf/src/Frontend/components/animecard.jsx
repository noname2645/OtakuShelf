import styles from "../Stylesheets/animecard.module.css";

const AnimeCard = ({ anime, onClick }) => {
  // Enhanced title handling
  const title =
    anime.title?.english ||
    anime.title?.romaji ||
    anime.title_english ||
    anime.title ||
    anime.name?.english ||
    anime.name ||
    "Untitled";

  // Enhanced image source handling with better fallback chain
  const img =
    anime.coverImage?.extraLarge ||
    anime.coverImage?.large ||
    anime.coverImage?.medium ||
    anime.bannerImage ||
    anime.images?.jpg?.large_image_url ||
    anime.images?.webp?.large_image_url ||
    anime.images?.jpg?.image_url ||
    anime.images?.webp?.image_url ||
    anime.image_url ||
    null;

  return (
    
    <div className={styles["anime-card"]} onClick={() => onClick && onClick(anime)}>
      <div className={styles["card-image"]}>
        {img ? (
          <img 
            className="related-img"
            src={img} 
            alt={title} 
            loading="lazy" 
            onError={(e) => {
              // Better error handling with multiple fallback attempts
              if (e.target.src !== 'https://via.placeholder.com/210x295/333/666?text=No+Image') {
                // Try other image sources if available
                if (anime.coverImage?.medium && e.target.src !== anime.coverImage.medium) {
                  e.target.src = anime.coverImage.medium;
                } else if (anime.images?.jpg?.image_url && e.target.src !== anime.images.jpg.image_url) {
                  e.target.src = anime.images.jpg.image_url;
                } else {
                  e.target.src = 'https://via.placeholder.com/210x295/333/666?text=No+Image';
                }
              }
            }}
          />
        ) : (
          <div className={styles["image-placeholder"]}>
            <span>No Image</span>
          </div>
        )}
        <div className={styles["card-title-bottom"]}>
          <h3>{title}</h3>
        </div>
      </div>
    </div>

  );
};

export default AnimeCard;