import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import styles from "../Stylesheets/advancedsearch.module.css";
import Modal from "./modal.jsx";
import Lenis from '@studio-freight/lenis'
import { Header } from '../components/header.jsx';
import { Link } from 'react-router-dom';
import "../Stylesheets/home.css";


// Genre list
const GENRES = [
  "Action", "Adventure", "Avant Garde", "Award Winning", "Boys Love",
  "Comedy", "Drama", "Ecchi", "Erotica", "Fantasy", "Girls Love", "Gourmet",
  "Hentai", "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life",
  "Sports", "Supernatural", "Suspense"
];

const SEASONS = ["WINTER", "SPRING", "SUMMER", "FALL"];


function AdvancedSearch() {
  // --- States ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    type: [], status: ["RELEASING", "FINISHED"], scoreMin: 7,
    season: "", seasonYear: "2025",
    startYear: "", startMonth: "", startDay: "",
    endYear: "", endMonth: "", endDay: "",
    genres: [],
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [totalResults, setTotalResults] = useState(0);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState(null);

  const lenisRef = useRef(null);

  // Initialize smooth scrolling
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.09,
      smooth: true,
      infinite: false,
    });

    lenisRef.current = lenis;

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    const animationId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(animationId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // --- Handlers ---
  const toggleDropdown = (name) => {
    setActiveDropdown(prev => (prev === name ? null : name));
  };

  const handleCheckbox = (e, field) => {
    const value = e.target.value;
    setFilters(prev => {
      const arr = prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value];
      return { ...prev, [field]: arr };
    });
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const normalizeGridAnime = (anime) => {
    let normalizedTitle = "Untitled";
    if (typeof anime.title === "string") normalizedTitle = anime.title;
    else if (anime.title) normalizedTitle = anime.title.romaji || anime.title.english || anime.title.native || "Untitled";

    return {
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
      score: anime.averageScore ?? "N/A",
      _originalData: anime
    };
  };

  // --- Fetch function ---
  const fetchAnime = async (page = 1, isNewSearch = false, query = "") => {
    if (isNewSearch) setLoading(true);
    else setLoadingMore(true);

    try {
      const graphqlQuery = `
      query (
          $page: Int, 
          $perPage: Int, 
          $format_in: [MediaFormat], 
          $status_in: [MediaStatus], 
          $averageScore_greater: Int, 
          $season: MediaSeason,
          $seasonYear: Int, 
          $genre_in: [String], 
          $search: String
          ) {
          Page(page: $page, perPage: $perPage) {
          pageInfo { total currentPage lastPage hasNextPage perPage }
          media(
          type: ANIME, 
          format_in: $format_in, 
          status_in: $status_in,
          averageScore_greater: $averageScore_greater, 
          season: $season, 
          seasonYear: $seasonYear, 
          genre_in: $genre_in, 
          search: $search
          ) {
            id 
            idMal 
            title { english romaji native } 
            description
            coverImage { large extraLarge medium } 
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
            startDate { year month day } 
            endDate { year month day }
            studios { edges { node { name } } } 
            trailer { id site thumbnail } 
            isAdult 
            source
            }
          }
        }
      `;

      const variables = {
        page,
        perPage: 20,
        format_in: filters.type.length ? filters.type : null,
        status_in: filters.status.length ? filters.status : null,
        averageScore_greater: filters.scoreMin * 10,
        season: filters.season || null,
        seasonYear: filters.seasonYear ? parseInt(filters.seasonYear) : null,
        genre_in: filters.genres.length ? filters.genres : null,
        search: query || null
      };

      const cleanVariables = Object.fromEntries(
        Object.entries(variables).filter(([_, v]) => v !== null)
      );

      const res = await axios.post(
        "https://graphql.anilist.co",
        { query: graphqlQuery, variables: cleanVariables },
        { headers: { "Content-Type": "application/json", "Accept": "application/json" } }
      );

      const pageData = res.data.data.Page;
      const animeList = pageData.media.map(normalizeGridAnime);

      setHasNextPage(pageData.pageInfo.hasNextPage);
      setTotalResults(pageData.pageInfo.total);

      if (isNewSearch) {
        setResults(animeList);
        setCurrentPage(1);
      } else {
        setResults(prev => {
          const existingIds = new Set(prev.map(a => a.id));
          return [...prev, ...animeList.filter(a => !existingIds.has(a.id))];
        });
        setCurrentPage(page);
      }

    } catch (err) {
      console.error("AniList Fetch Error:", err.response?.data || err.message);
    } finally {
      if (isNewSearch) setLoading(false);
      else setLoadingMore(false);
      setActiveDropdown(null);
    }
  };

  // --- Live search + filters useEffect (debounced) ---
  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchAnime(1, true, searchQuery.trim());
    }, 400);

    return () => clearTimeout(debounce);
  }, [searchQuery, filters]);

  // --- Infinite scroll ---
  const handleScroll = useCallback(() => {
    if (loadingMore || !hasNextPage) return;
    const scrollTop = document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    if (scrollTop + windowHeight >= docHeight - 200) {
      fetchAnime(currentPage + 1, false, searchQuery.trim());
    }
  }, [currentPage, hasNextPage, loadingMore, filters, searchQuery]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // --- Modal handlers ---
  const openModal = (anime) => { setSelectedAnime(anime); setIsModalOpen(true); };
  const closeModal = () => { setSelectedAnime(null); setIsModalOpen(false); };
  const handleOpenRelatedAnime = (relatedAnime) => setSelectedAnime(relatedAnime);

  const resetFilters = () => {
    setFilters({
      type: [], status: ["FINISHED", "RELEASING"], scoreMin: 7,
      season: "", seasonYear: "2025",
      genres: [],
    });
    setResults([]);
    setCurrentPage(1);
    setHasNextPage(true);
    setTotalResults(0);
    setSearchQuery("");
  };

  const formatCount = (arr) => arr.length > 0 ? `(${arr.length})` : "";


  return (
    <>
    <Header showSearch={false} />
    <div className={styles.advancedSearchContainer}>
      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search anime or apply filters"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={styles.searchInput}
      />

      {/* Filters */}
      <div className={styles.dropdownFilters}>
        {[{ key: "type", label: "Type", options: ["TV", "MOVIE", "OVA", "ONA", "SPECIAL", "MUSIC"] },
        { key: "status", label: "Status", options: ["FINISHED", "RELEASING", "TBA"] }].map(drop => (
          <div key={drop.key} className={`${styles.dropdown} ${activeDropdown === drop.key ? styles.dropdownActive : ""}`}>
            <button className={styles.dropdownToggle} onClick={() => toggleDropdown(drop.key)}>
              {drop.label} {formatCount(filters[drop.key])} <span className={styles.dropdownArrow}>▼</span>
            </button>
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownContent}>
                {drop.options.map(opt => (
                  <label key={opt} className={styles.checkboxLabel}>
                    <input type="checkbox" value={opt} checked={filters[drop.key].includes(opt)} onChange={e => handleCheckbox(e, drop.key)} />
                    <span className={styles.checkmark}></span>{opt}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Score */}
        <div className={`${styles.dropdown} ${activeDropdown === "score" ? styles.dropdownActive : ""}`}>
          <button className={styles.dropdownToggle} onClick={() => toggleDropdown("score")}>
            Score ({filters.scoreMin}) <span className={styles.dropdownArrow}>▼</span>
          </button>
          <div className={styles.dropdownMenu}>
            <div className={`${styles.dropdownContent} ${styles.scoreRange}`}>
              {["scoreMin"].map(key => (
                <div className={styles.rangeInput}>
                  <label>Min Score: {filters.scoreMin}</label>
                  <input
                    type="range"
                    name="scoreMin"
                    min="1"
                    max="10"
                    value={filters.scoreMin}
                    onChange={handleInput}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Genres */}
        <div className={`${styles.dropdown} ${activeDropdown === "genres" ? styles.dropdownActive : ""}`}>
          <button className={styles.dropdownToggle} onClick={() => toggleDropdown("genres")}>
            Genres {formatCount(filters.genres)} <span className={styles.dropdownArrow}>▼</span>
          </button>
          <div className={`${styles.dropdownMenu} ${styles.genresMenu}`}>
            <div className={styles.dropdownContent}>
              <div className={styles.genresGrid}>
                {GENRES.map(g => (
                  <label key={g} className={styles.checkboxLabel}>
                    <input type="checkbox" value={g} checked={filters.genres.includes(g)} onChange={e => handleCheckbox(e, "genres")} />
                    <span className={styles.checkmark}></span>{g}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Season */}
        <div className={`${styles.dropdown} ${activeDropdown === "season" ? styles.dropdownActive : ""}`}>
          <button className={styles.dropdownToggle} onClick={() => toggleDropdown("season")}>
            Season {filters.season ? `(${filters.season})` : ""} <span className={styles.dropdownArrow}>▼</span>
          </button>
          <div className={styles.dropdownMenu}>
            <div className={styles.dropdownContent}>
              {SEASONS.map(s => (
                <label key={s} className={styles.checkboxLabel}>
                  <input
                    type="radio"
                    name="season"
                    value={s}
                    checked={filters.season === s}
                    onChange={handleInput}
                  />
                  <span className={styles.checkmark}></span>{s}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Season Year */}
        <div className={`${styles.dropdown} ${activeDropdown === "seasonYear" ? styles.dropdownActive : ""}`}>
          <button className={styles.dropdownToggle} onClick={() => toggleDropdown("seasonYear")}>
            Year {filters.seasonYear || ""} <span className={styles.dropdownArrow}>▼</span>
          </button>
          <div className={styles.dropdownMenu}>
            <div className={styles.dropdownContent}>
              <input
                type="number"
                name="seasonYear"
                placeholder="Enter year"
                value={filters.seasonYear}
                onChange={handleInput}
                className={styles.textInput}
              />
            </div>
          </div>
        </div>
        <button className={styles.resetBtn} onClick={resetFilters}>Reset Filters</button>
      </div>


      {/* Results */}
      <div className={styles.resultsSection}>
        {loading && <div className={styles.loader}></div>}
        {!loading && results.length > 0 && <div className={styles.resultsCount}>Showing {results.length} of {totalResults} results</div>}
        <div className={styles.animeGrid}>
          {results.map(anime => (
            <div key={anime.id} className={styles.animeCard} onClick={() => openModal(anime)} style={{ cursor: 'pointer' }}>
              <div className={styles.homeCardImage2}>
                <img
                  src={
                    anime.coverImage?.extraLarge ||
                    anime.coverImage?.large ||
                    anime.coverImage?.medium ||
                    anime.bannerImage ||
                    "/placeholder-anime.jpg"
                  }
                  alt={anime.title || "Anime"}
                  loading="lazy"
                  onError={e => (e.currentTarget.src = "/placeholder-anime.jpg")}
                />
                <div className={styles.cardTitleBottom}><h3>{anime.title}</h3></div>
              </div>
            </div>
          ))}
        </div>

        {loadingMore && <div className={styles.loadingMore}><div className={styles.loadingSpinner}>Loading more...</div></div>}
        {!loading && !hasNextPage && results.length > 0 && <div className={styles.endOfResults}><p>End of results</p></div>}
        {!loading && results.length === 0 && <div className={styles.noResults}><p>No results. Adjust filters or type to search.</p></div>}
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} anime={selectedAnime} onOpenAnime={handleOpenRelatedAnime} />
    </div>
    </>
  );
}

export default AdvancedSearch;
