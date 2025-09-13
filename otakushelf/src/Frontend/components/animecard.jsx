import styles from "../Stylesheets/animecard.module.css";

const AnimeCard = ({ anime, onClick }) => {
  // Title (AniList only)
  const title =
    anime.title?.english ||
    anime.title?.romaji ||
    anime.title?.native ||
    "Untitled";

  // Image (AniList only, with banner fallback)
  const img =
    anime.coverImage?.extraLarge ||
    anime.coverImage?.large ||
    anime.coverImage?.medium ||
    anime.bannerImage ||
    null;

  return (
    <div className={styles["anime-card"]} onClick={() => onClick?.(anime)}>
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
