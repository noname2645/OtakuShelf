import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import styles from "../Stylesheets/advancedsearch.module.css";
import Modal from "./modal.jsx";

// Helper to convert Year-Month-Day into AniList FuzzyDateInt (YYYYMMDD)
const toFuzzyDate = (year, month, day) => {
  if (!year) return null;
  const safeMonth = month && month >= 1 && month <= 12 ? month : 1;
  const safeDay = day && day >= 1 && day <= 31 ? day : 1;
  return parseInt(
    `${year}${safeMonth.toString().padStart(2, "0")}${safeDay.toString().padStart(2, "0")}`
  );
};

// Genre list
const GENRES = [
  "Action", "Adventure", "Avant Garde", "Award Winning", "Boys Love",
  "Comedy", "Drama", "Ecchi", "Erotica", "Fantasy", "Girls Love", "Gourmet",
  "Hentai", "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life",
  "Sports", "Supernatural", "Suspense"
];

function AdvancedSearch() {
  const [filters, setFilters] = useState({
    type: [],
    status: [],
    scoreMin: 1,
    scoreMax: 10,
    season: "",
    seasonYear: "",
    startYear: "",
    startMonth: "",
    startDay: "",
    endYear: "",
    endMonth: "",
    endDay: "",
    genres: [],
  });

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState(null);

  const toggleDropdown = (dropdownName) => {
    if (activeDropdown === dropdownName) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(dropdownName);
    }
  };

  const handleCheckbox = (e, field) => {
    const value = e.target.value;
    setFilters((prev) => {
      const arr = prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value];
      return { ...prev, [field]: arr };
    });
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const normalizeGridAnime = (anime) => {
    console.log("Normalizing anime data:", anime);

    let normalizedTitle = "Untitled";
    if (typeof anime.title === "string") {
      normalizedTitle = anime.title;
    } else if (anime.title && typeof anime.title === "object") {
      normalizedTitle = anime.title.romaji || anime.title.english || anime.title.native || "Untitled";
    }

    const normalized = {
      id: anime.id,
      idMal: anime.idMal || anime.malId || undefined,
      title: normalizedTitle,
      coverImage: {
        large: anime.coverImage?.large || '/placeholder-cover.png',
        extraLarge: anime.coverImage?.extraLarge || '/placeholder-cover.png',
        medium: anime.coverImage?.medium || '/placeholder-cover.png',
      },
      bannerImage: anime.bannerImage || '/placeholder-banner.png',
      description: anime.description || "No description available",
      episodes: anime.episodes || 0,
      duration: anime.duration || 0,
      format: anime.format || "Unknown",
      status: anime.status || "Unknown",
      genres: anime.genres || [],
      studios: anime.studios?.length ? anime.studios : ["Unknown"],
      startDate: anime.startDate || "TBA",
      endDate: anime.endDate || "TBA",
      isAdult: anime.isAdult || false,
      popularity: anime.popularity || 0,
      trailer: anime.trailer || null,
      season: anime.season || "Unknown",
      year: anime.seasonYear || anime.year || "Unknown",
      _originalData: anime
    };

    console.log("Normalized anime:", normalized);
    return normalized;
  };

  const fetchAnime = async (page = 1, isNewSearch = false) => {
    if (isNewSearch) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const query = `
      query (
        $page: Int
        $perPage: Int
        $format_in: [MediaFormat]
        $status_in: [MediaStatus]
        $averageScore_greater: Int
        $averageScore_lesser: Int
        $season: MediaSeason
        $seasonYear: Int
        $genre_in: [String]
      ) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
            perPage
          }
          media(
            type: ANIME
            format_in: $format_in
            status_in: $status_in
            averageScore_greater: $averageScore_greater
            averageScore_lesser: $averageScore_lesser
            season: $season
            seasonYear: $seasonYear
            genre_in: $genre_in
          ) {
            id
            idMal
            title { 
              english 
              romaji 
              native 
            }
            description
            coverImage { 
              large 
              extraLarge 
              medium
            }
            bannerImage
            episodes
            averageScore
            status
            genres
            season
            seasonYear
            format
            duration
            popularity
            startDate {
              year
              month
              day
            }
            endDate {
              year
              month
              day
            }
            studios {
              edges {
                node {
                  name
                }
              }
            }
            trailer {
              id
              site
              thumbnail
            }
            isAdult
            source
          }
        }
      }
    `;

      const variables = {
        page: page,
        perPage: 20, // Load 20 items per page
        format_in: filters.type.length ? filters.type : null,
        status_in: filters.status.length ? filters.status : null,
        averageScore_greater: filters.scoreMin ? filters.scoreMin * 10 : 0,
        averageScore_lesser: filters.scoreMax ? filters.scoreMax * 10 : 100,
        season: filters.season && filters.season !== "" ? filters.season : null,
        seasonYear: filters.seasonYear ? parseInt(filters.seasonYear) : null,
        genre_in: filters.genres.length ? filters.genres : null,
      };

      console.log("Variables Sent:", JSON.stringify(variables, null, 2));

      const cleanVariables = Object.fromEntries(
        Object.entries(variables).filter(([_, v]) => v !== null)
      );

      const response = await axios.post(
        "https://graphql.anilist.co",
        {
          query,
          variables: cleanVariables,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
        }
      );

      const responseData = response.data.data.Page;
      const animeList = responseData.media.map(normalizeGridAnime);
      
      // Update pagination info
      setHasNextPage(responseData.pageInfo.hasNextPage);
      setTotalResults(responseData.pageInfo.total);
      
      if (isNewSearch) {
        setResults(animeList);
        setCurrentPage(1);
      } else {
        // Append new results to existing ones, avoiding duplicates
        setResults(prev => {
          const existingIds = new Set(prev.map(anime => anime.id));
          const newAnime = animeList.filter(anime => !existingIds.has(anime.id));
          return [...prev, ...newAnime];
        });
        setCurrentPage(page);
      }
      
    } catch (err) {
      console.log("AniList Debug:", JSON.stringify(err.response?.data, null, 2));
    } finally {
      if (isNewSearch) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
      setActiveDropdown(null);
    }
  };

  const handleSearch = () => {
    fetchAnime(1, true);
  };

  // Infinite scroll logic
  const handleScroll = useCallback(() => {
    if (loadingMore || !hasNextPage) return;
    
    const scrollTop = document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Trigger when user is 200px from bottom
    if (scrollTop + windowHeight >= documentHeight - 200) {
      fetchAnime(currentPage + 1, false);
    }
  }, [currentPage, hasNextPage, loadingMore, filters]);

  // Add scroll event listener
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Modal handlers
  const openModal = (anime) => {
    console.log("Opening modal with anime:", anime);
    setSelectedAnime(anime);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedAnime(null);
    setIsModalOpen(false);
  };

  const handleOpenRelatedAnime = (relatedAnime) => {
    console.log("Opening related anime:", relatedAnime);
    setSelectedAnime(relatedAnime);
  };

  const resetFilters = () => {
    setFilters({
      type: [],
      status: [],
      scoreMin: 1,
      scoreMax: 10,
      season: "",
      seasonYear: "",
      startYear: "",
      startMonth: "",
      startDay: "",
      endYear: "",
      endMonth: "",
      endDay: "",
      genres: [],
    });
    setResults([]);
    setCurrentPage(1);
    setHasNextPage(true);
    setTotalResults(0);
  };

  const formatCount = (arr) => {
    return arr.length > 0 ? `(${arr.length})` : "";
  };

  return (
    <div className={styles.advancedSearchContainer}>
      <div className={styles.searchHeader}>
        <h1>Advanced Anime Search</h1>
        <div className={styles.headerControls}>
          <button className={styles.resetBtn} onClick={resetFilters}>Reset Filters</button>
        </div>
      </div>

      <div className={styles.dropdownFilters}>
        {[
          { key: "type", label: "Type", options: ["TV", "MOVIE", "OVA", "ONA", "SPECIAL", "MUSIC"] },
          { key: "status", label: "Status", options: ["FINISHED", "RELEASING", "NOT_YET_RELEASED"] },
        ].map(drop => (
          <div key={drop.key} className={`${styles.dropdown} ${activeDropdown === drop.key ? styles.dropdownActive : ""}`}>
            <button className={styles.dropdownToggle} onClick={() => toggleDropdown(drop.key)}>
              {drop.label} {formatCount(filters[drop.key])}
              <span className={styles.dropdownArrow}>▼</span>
            </button>
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownContent}>
                {drop.options.map(opt => (
                  <label key={opt} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      value={opt}
                      checked={filters[drop.key].includes(opt)}
                      onChange={e => handleCheckbox(e, drop.key)}
                    />
                    <span className={styles.checkmark}></span>
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Score */}
        <div className={`${styles.dropdown} ${activeDropdown === "score" ? styles.dropdownActive : ""}`}>
          <button className={styles.dropdownToggle} onClick={() => toggleDropdown("score")}>
            Score ({filters.scoreMin}-{filters.scoreMax})
            <span className={styles.dropdownArrow}>▼</span>
          </button>
          <div className={styles.dropdownMenu}>
            <div className={`${styles.dropdownContent} ${styles.scoreRange}`}>
              {["scoreMin", "scoreMax"].map(key => (
                <div key={key} className={styles.rangeInput}>
                  <label>{key === "scoreMin" ? `Min Score: ${filters.scoreMin}` : `Max Score: ${filters.scoreMax}`}</label>
                  <input
                    type="range"
                    name={key}
                    min="1"
                    max="10"
                    value={filters[key]}
                    onChange={handleInput}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Season */}
        <div className={`${styles.dropdown} ${activeDropdown === "season" ? styles.dropdownActive : ""}`}>
          <button className={styles.dropdownToggle} onClick={() => toggleDropdown("season")}>
            Season {filters.season || filters.seasonYear ? `(${filters.season} ${filters.seasonYear})` : ""}
            <span className={styles.dropdownArrow}>▼</span>
          </button>
          <div className={styles.dropdownMenu}>
            <div className={styles.dropdownContent}>
              <div className={styles.seasonInputs}>
                <select name="season" value={filters.season} onChange={handleInput}>
                  <option value="">Any Season</option>
                  <option value="WINTER">Winter</option>
                  <option value="SPRING">Spring</option>
                  <option value="SUMMER">Summer</option>
                  <option value="FALL">Fall</option>
                </select>
                <input type="number" name="seasonYear" placeholder="Year" value={filters.seasonYear} onChange={handleInput} min="1960" max="2030" />
              </div>
            </div>
          </div>
        </div>

        {/* Genres */}
        <div className={`${styles.dropdown} ${activeDropdown === "genres" ? styles.dropdownActive : ""}`}>
          <button className={styles.dropdownToggle} onClick={() => toggleDropdown("genres")}>
            Genres {formatCount(filters.genres)}
            <span className={styles.dropdownArrow}>▼</span>
          </button>
          <div className={`${styles.dropdownMenu} ${styles.genresMenu}`}>
            <div className={styles.dropdownContent}>
              <div className={styles.genresGrid}>
                {GENRES.map(g => (
                  <label key={g} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      value={g}
                      checked={filters.genres.includes(g)}
                      onChange={e => handleCheckbox(e, "genres")}
                    />
                    <span className={styles.checkmark}></span>
                    {g}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <button className={styles.searchBtn} onClick={handleSearch}>Search</button>

      {/* Results */}
      <div className={styles.resultsSection}>
        {loading && <div className={styles.loadingSpinner}>Loading...</div>}
        {!loading && results.length > 0 && (
          <div className={styles.resultsCount}>
            Showing {results.length} of {totalResults} results
          </div>
        )}

        <div className={styles.animeGrid}>
          {results.map(anime => (
            <div 
              key={anime.id} 
              className={styles.animeCard}
              onClick={() => openModal(anime)}
              style={{ cursor: 'pointer' }}
            >
              <div className={styles.homeCardImage2}>
                <img
                  src={anime.coverImage?.large || anime.coverImage?.medium || anime.bannerImage || "/placeholder-anime.jpg"}
                  alt={anime.title || "Anime"}
                  loading="lazy"
                  onError={e => { e.currentTarget.src = "/placeholder-anime.jpg"; }}
                />
                <div className={styles.cardTitleBottom}>
                  <h3>{anime.title || "Unknown Title"}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Loading more indicator */}
        {loadingMore && (
          <div className={styles.loadingMore}>
            <div className={styles.loadingSpinner}>Loading more...</div>
          </div>
        )}

        {/* End of results indicator */}
        {!loading && !hasNextPage && results.length > 0 && (
          <div className={styles.endOfResults}>
            <p>You've reached the end of the results!</p>
          </div>
        )}

        {!loading && results.length === 0 && (
          <div className={styles.noResults}>
            <p>Use the filters above to search for anime</p>
          </div>
        )}
      </div>
      
      {/* Modal Component */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        anime={selectedAnime}
        onOpenAnime={handleOpenRelatedAnime}
      />
    </div>
  );
};

export default AdvancedSearch;