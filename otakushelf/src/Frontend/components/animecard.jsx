import styles from "../Stylesheets/animecard.module.css";
import { useAnimePreferences } from "./useAnimePreferences";

const AnimeCard = ({ anime, onClick, className }) => {
  const { getPreferredTitle, shouldBlurNSFW } = useAnimePreferences();

  const title = getPreferredTitle(anime?.title);
  const isAdult = anime?.isAdult || false;
  const requireBlur = shouldBlurNSFW(isAdult);

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

  const img = getImage();

  const handleClick = () => {
    if (onClick && anime) {
      onClick(anime);
    }
  };

  return (
    <div className={`${styles["anime-card"]} ${className || ''}`} onClick={handleClick}>
      <div className={styles["card-image"]}>
        {img ? (
          <img
            className={`related-img ${requireBlur ? styles['blur-nsfw'] : ''}`}
            src={img}
            style={requireBlur ? { filter: 'blur(16px)', pointerEvents: 'none' } : {}}
            alt={requireBlur ? 'NSFW Content Hidden' : title}
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
          <h3>{requireBlur ? '18+ Content' : title}</h3>
        </div>
      </div>
    </div>
  );
};

export default AnimeCard;