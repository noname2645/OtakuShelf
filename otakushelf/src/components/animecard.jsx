import styles from "../Stylesheets/animecard.module.css";

const AnimeCard = ({ anime, onClick }) => {
  const title =
    anime.title?.english ||
    anime.title?.romaji ||
    anime.name?.english ||
    anime.name ||
    "Untitled";

  // Enhanced image source handling
  const img =
    anime.coverImage?.extraLarge ||
    anime.coverImage?.large ||
    anime.images?.jpg?.large_image_url ||
    anime.images?.webp?.large_image_url ||
    anime.image_url ||
    anime.bannerImage ||
    null;

  return (
    <div className={styles["anime-card"]} onClick={() => onClick && onClick(anime)}>
      <div className={styles["card-image"]}>
        {img ? (
          <img 
            src={img} 
            alt={title} 
            loading="lazy" 
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/210x295/333/666?text=No+Image';
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
