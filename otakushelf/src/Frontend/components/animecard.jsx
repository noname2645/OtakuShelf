import styles from "../Stylesheets/animecard.module.css";

const AnimeCard = ({ anime, onClick }) => {
  // Safely extract title
  const getTitle = () => {
    if (!anime) return "Untitled";
    
    // If title is already a string
    if (typeof anime.title === 'string') {
      return anime.title;
    }
    
    // If title is an object
    if (anime.title && typeof anime.title === 'object') {
      return anime.title.english ||
             anime.title.romaji ||
             anime.title.native ||
             "Untitled";
    }
    
    // Fallback
    return "Untitled";
  };

  // Safely extract image
  const getImage = () => {
    if (!anime) return null;
    
    // Try coverImage properties
    if (anime.coverImage) {
      return anime.coverImage.extraLarge ||
             anime.coverImage.large ||
             anime.coverImage.medium ||
             null;
    }
    
    // Try bannerImage
    if (anime.bannerImage) {
      return anime.bannerImage;
    }
    
    // Try direct image properties
    if (anime.image_url) {
      return anime.image_url;
    }
    
    return null;
  };

  const title = getTitle();
  const img = getImage();

  const handleClick = () => {
    if (onClick && anime) {
      onClick(anime);
    }
  };

  return (
    <div className={styles["anime-card"]} onClick={handleClick}>
      <div className={styles["card-image"]}>
        {img ? (
          <img
            className="related-img"
            src={img}
            alt={title}
            loading="lazy"
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/210x295/333/666?text=No+Image";
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