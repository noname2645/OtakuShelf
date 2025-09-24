import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import styles from "../Stylesheets/advancedsearch.module.css";
import Modal from "./modal.jsx";
import Lenis from '@studio-freight/lenis'
import { Header } from '../components/header.jsx';
import { Link } from 'react-router-dom';
import "../Stylesheets/home.css";

// List of all available anime genres
const ANIME_GENRES = [
  "Action", "Adventure", "Avant Garde", "Award Winning", "Boys Love",
  "Comedy", "Drama", "Ecchi", "Erotica", "Fantasy", "Girls Love", "Gourmet",
  "Hentai", "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life",
  "Sports", "Supernatural", "Suspense"
];

// List of anime seasons
const ANIME_SEASONS = ["WINTER", "SPRING", "SUMMER", "FALL"];

function AdvancedSearch() {
  const [searchText, setSearchText] = useState("");

  // All the filter options
  const [filterOptions, setFilterOptions] = useState({
    type: [],
    status: ["RELEASING", "FINISHED"],
    minimumScore: 7,
    season: "",
    seasonYear: "2025",
    startYear: "",
    startMonth: "",
    startDay: "",
    endYear: "",
    endMonth: "",
    endDay: "",
    genres: [],
  });

  // Search results and loading states
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentOpenDropdown, setCurrentOpenDropdown] = useState(null);

  // Page navigation for loading more results
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [totalResultsCount, setTotalResultsCount] = useState(0);

  // Modal popup for anime details
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedAnimeForModal, setSelectedAnimeForModal] = useState(null);

  const smoothScrollRef = useRef(null);

  // Setup smooth scrolling when component loads
  useEffect(() => {
    const smoothScroll = new Lenis({
      lerp: 0.09,
      smooth: true,
      infinite: false,
    });

    smoothScrollRef.current = smoothScroll;

    function animateScroll(time) {
      smoothScroll.raf(time);
      requestAnimationFrame(animateScroll);
    }

    const animationRequestId = requestAnimationFrame(animateScroll);

    // Cleanup when component unmounts
    return () => {
      cancelAnimationFrame(animationRequestId);
      smoothScroll.destroy();
      smoothScrollRef.current = null;
    };
  }, []);

  // Function to show/hide dropdown menus
  const showOrHideDropdown = (dropdownName) => {
    if (currentOpenDropdown === dropdownName) {
      setCurrentOpenDropdown(null); // Close if already open
    } else {
      setCurrentOpenDropdown(dropdownName); // Open this dropdown
    }
  };

   const getActivePage = () => {
    const path = location.pathname;
    if (path === '/home' || path === '/') return 'home';
    if (path === '/list') return 'list';
    if (path === '/advance') return 'search';
    if (path === '/ai') return 'AI';
    return '';
  };

  // Function to handle checkbox selections in filters
  const handleCheckboxClick = (event, filterField) => {
    const selectedValue = event.target.value;

    setFilterOptions(previousFilters => {
      const currentList = previousFilters[filterField];
      let newList;

      if (currentList.includes(selectedValue)) {
        // Remove if already selected
        newList = currentList.filter(item => item !== selectedValue);
      } else {
        // Add if not selected
        newList = [...currentList, selectedValue];
      }

      return { ...previousFilters, [filterField]: newList };
    });
  };

  // Function to handle text inputs and dropdowns
  const handleInputChange = (event) => {
    const inputName = event.target.name;
    const inputValue = event.target.value;

    setFilterOptions(previousFilters => ({
      ...previousFilters,
      [inputName]: inputValue
    }));
  };

  // Function to clean up anime data from API
  const cleanUpAnimeData = (rawAnime) => {
    // Get the best title available
    let bestTitle = "Untitled";
    if (typeof rawAnime.title === "string") {
      bestTitle = rawAnime.title;
    } else if (rawAnime.title) {
      bestTitle = rawAnime.title.romaji ||
        rawAnime.title.english ||
        rawAnime.title.native ||
        "Untitled";
    }

    // Extract studio names from complex structure
    let studioNames = ["Unknown"];
    if (rawAnime.studios && rawAnime.studios.edges && rawAnime.studios.edges.length > 0) {
      studioNames = rawAnime.studios.edges.map(edge => edge.node.name);
    }

    // Make sure genres is always an array
    let genreList = [];
    if (rawAnime.genres && Array.isArray(rawAnime.genres)) {
      genreList = rawAnime.genres;
    }

    return {
      id: rawAnime.id,
      idMal: rawAnime.idMal || rawAnime.malId || undefined,
      title: bestTitle,
      coverImage: {
        large: rawAnime.coverImage?.large || '/placeholder-cover.png',
        extraLarge: rawAnime.coverImage?.extraLarge || '/placeholder-cover.png',
        medium: rawAnime.coverImage?.medium || '/placeholder-cover.png',
      },
      bannerImage: rawAnime.bannerImage || '/placeholder-banner.png',
      description: rawAnime.description || "No description available",
      episodes: rawAnime.episodes || 0,
      duration: rawAnime.duration || 0,
      format: rawAnime.format || "Unknown",
      status: rawAnime.status || "Unknown",
      genres: genreList,
      studios: studioNames,
      startDate: rawAnime.startDate || "TBA",
      endDate: rawAnime.endDate || "TBA",
      isAdult: rawAnime.isAdult || false,
      popularity: rawAnime.popularity || 0,
      trailer: rawAnime.trailer || null,
      season: rawAnime.season || "Unknown",
      year: rawAnime.seasonYear || rawAnime.year || "Unknown",
      score: rawAnime.averageScore ?? "N/A",
      seasonYear: rawAnime.seasonYear || rawAnime.year || "Unknown",
      averageScore: rawAnime.averageScore ?? "N/A",
      _originalData: rawAnime
    };
  };

  // Main function to search for anime
  const searchForAnime = async (pageNumber = 1, isNewSearch = false, searchQuery = "") => {
    // Show loading spinner
    if (isNewSearch) {
      setIsSearching(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      // GraphQL query to fetch anime data
      const apiQuery = `
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

      // Parameters to send with the query
      const queryParameters = {
        page: pageNumber,
        perPage: 20, // Get 20 results per page
        format_in: filterOptions.type.length ? filterOptions.type : null,
        status_in: filterOptions.status.length ? filterOptions.status : null,
        averageScore_greater: filterOptions.minimumScore * 10, // API uses 0-100 scale
        season: filterOptions.season || null,
        seasonYear: filterOptions.seasonYear ? parseInt(filterOptions.seasonYear) : null,
        genre_in: filterOptions.genres.length ? filterOptions.genres : null,
        search: searchQuery || null
      };

      // Remove null parameters
      const cleanParameters = {};
      for (const [key, value] of Object.entries(queryParameters)) {
        if (value !== null) {
          cleanParameters[key] = value;
        }
      }

      // Make API request
      const apiResponse = await axios.post(
        "https://graphql.anilist.co",
        {
          query: apiQuery,
          variables: cleanParameters
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          }
        }
      );

      const responseData = apiResponse.data.data.Page;
      const cleanedAnimeList = responseData.media.map(cleanUpAnimeData);

      // Update page information
      setHasMorePages(responseData.pageInfo.hasNextPage);
      setTotalResultsCount(responseData.pageInfo.total);

      if (isNewSearch) {
        // Replace existing results with new search
        setSearchResults(cleanedAnimeList);
        setCurrentPageNumber(1);
      } else {
        // Add new results to existing ones (infinite scroll)
        setSearchResults(previousResults => {
          const existingAnimeIds = new Set(previousResults.map(anime => anime.id));
          const newAnimeOnly = cleanedAnimeList.filter(anime => !existingAnimeIds.has(anime.id));
          return [...previousResults, ...newAnimeOnly];
        });
        setCurrentPageNumber(pageNumber);
      }

    } catch (error) {
      console.error("Error fetching anime:", error.response?.data || error.message);
    } finally {
      // Hide loading spinners
      if (isNewSearch) {
        setIsSearching(false);
      } else {
        setIsLoadingMore(false);
      }
      setCurrentOpenDropdown(null);
    }
  };

  // Automatically search when user types or changes filters
  useEffect(() => {
    // Wait 400ms after user stops typing before searching
    const searchDelay = setTimeout(() => {
      searchForAnime(1, true, searchText.trim());
    }, 400);

    // Cancel previous timeout if user keeps typing
    return () => clearTimeout(searchDelay);
  }, [searchText, filterOptions]);

  // Handle infinite scroll - load more results when user scrolls to bottom
  const handleScrollToBottom = () => {
    if (isLoadingMore || !hasMorePages) return;

    const scrollPosition = document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // If user is near the bottom (200px from bottom)
    if (scrollPosition + windowHeight >= documentHeight - 200) {
      searchForAnime(currentPageNumber + 1, false, searchText.trim());
    }
  };

  // Add scroll listener
  useEffect(() => {
    window.addEventListener('scroll', handleScrollToBottom);
    return () => window.removeEventListener('scroll', handleScrollToBottom);
  }, [currentPageNumber, hasMorePages, isLoadingMore, filterOptions, searchText]);

  // Functions to handle modal popup
  const showAnimeDetails = (anime) => {
    setSelectedAnimeForModal(anime);
    setIsModalVisible(true);
  };

  const hideAnimeDetails = () => {
    setSelectedAnimeForModal(null);
    setIsModalVisible(false);
  };

  const showRelatedAnimeDetails = (relatedAnime) => {
    setSelectedAnimeForModal(relatedAnime);
  };

  // Function to clear all filters and start fresh
  const clearAllFilters = () => {
    setFilterOptions({
      type: [],
      status: ["FINISHED", "RELEASING"],
      minimumScore: 7,
      season: "",
      seasonYear: "2025",
      genres: [],
    });
    setSearchResults([]);
    setCurrentPageNumber(1);
    setHasMorePages(true);
    setTotalResultsCount(0);
    setSearchText("");
  };

  // Helper function to show count in dropdown buttons
  const getFilterCount = (filterArray) => {
    return filterArray.length > 0 ? `(${filterArray.length})` : "";
  };

  return (
    <>
      <Header showSearch={false} />
      <div className="bottom-button-bar">
        <Link
          to="/home"
          title="home"
          className={`nav-label ${getActivePage() === 'home' ? 'active' : ''}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512">
            <path fill="inherit" d="M261.56 101.28a8 8 0 0 0-11.06 0L66.4 277.15a8 8 0 0 0-2.47 5.79L63.9 448a32 32 0 0 0 32 32H192a16 16 0 0 0 16-16V328a8 8 0 0 1 8-8h80a8 8 0 0 1 8 8v136a16 16 0 0 0 16 16h96.06a32 32 0 0 0 32-32V282.94a8 8 0 0 0-2.47-5.79Z" />
            <path fill="inherit" d="m490.91 244.15l-74.8-71.56V64a16 16 0 0 0-16-16h-48a16 16 0 0 0-16 16v32l-57.92-55.38C272.77 35.14 264.71 32 256 32c-8.68 0-16.72 3.14-22.14 8.63l-212.7 203.5c-6.22 6-7 15.87-1.34 22.37A16 16 0 0 0 43 267.56L250.5 69.28a8 8 0 0 1 11.06 0l207.52 198.28a16 16 0 0 0 22.59-.44c6.14-6.36 5.63-16.86-.76-22.97Z" />
          </svg>
        </Link>

        <Link
         to="/list"
          title="list"
          className={`nav-label ${getActivePage() === 'list' ? 'active' : ''}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="inherit"
            viewBox="0 0 18 20"
          >
            <path fill="inherit" d="M2 19.004h2.004V17H2v2.004ZM7 19h15v-2H7v2Zm-5-5.996h2.004V11H2v2.004ZM7 13h15v-2H7v2ZM2 7.004h2.004V5H2v2.004ZM7 7h15V5H7v2Z" />
          </svg>
        </Link>

        <Link
          to="/advance"
          title="search"
          className={`nav-label ${getActivePage() === 'search' ? 'active' : ''}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"

            viewBox="0 0 26 26">
            <path fill="inherit"
              d="M10 .188A9.812 9.812 0 0 0 .187 10A9.812 9.812 0 0 0 10 19.813c2.29 0 4.393-.811 6.063-2.125l.875.875a1.845 1.845 0 0 0 .343 2.156l4.594 4.625c.713.714 1.88.714 2.594 0l.875-.875a1.84 1.84 0 0 0 0-2.594l-4.625-4.594a1.824 1.824 0 0 0-2.157-.312l-.875-.875A9.812 9.812 0 0 0 10 .188zM10 2a8 8 0 1 1 0 16a8 8 0 0 1 0-16zM4.937 7.469a5.446 5.446 0 0 0-.812 2.875a5.46 5.46 0 0 0 5.469 5.469a5.516 5.516 0 0 0 3.156-1a7.166 7.166 0 0 1-.75.03a7.045 7.045 0 0 1-7.063-7.062c0-.104-.005-.208 0-.312z" />
          </svg>
        </Link>

        <Link
         to="/ai"
          title="AI"
          className={`nav-label ${getActivePage() === 'AI' ? 'active' : ''}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512">
            <path fill="inherit" fill-rule="evenodd" d="M384 128v256H128V128zm-148.25 64h-24.932l-47.334 128h22.493l8.936-25.023h56.662L260.32 320h23.847zm88.344 0h-22.402v128h22.402zm-101 21.475l22.315 63.858h-44.274zM405.335 320H448v42.667h-42.667zm-256 85.333H192V448h-42.667zm85.333 0h42.666V448h-42.666zM149.333 64H192v42.667h-42.667zM320 405.333h42.667V448H320zM234.667 64h42.666v42.667h-42.666zM320 64h42.667v42.667H320zm85.333 170.667H448v42.666h-42.667zM64 320h42.667v42.667H64zm341.333-170.667H448V192h-42.667zM64 234.667h42.667v42.666H64zm0-85.334h42.667V192H64z" />
          </svg>
        </Link>
      </div>

      <div className={styles.advancedSearchContainer}>
        {/* Main Search Input */}
        <input
          type="text"
          placeholder="Search anime or apply filters"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className={styles.searchInput}
        />

        {/* Filter Dropdown Buttons */}
        <div className={styles.dropdownFilters}>

          {/* Type and Status Filters */}
          {[
            {
              key: "type",
              label: "Type",
              options: ["TV", "MOVIE", "OVA", "ONA", "SPECIAL", "MUSIC"]
            },
            {
              key: "status",
              label: "Status",
              options: ["FINISHED", "RELEASING", "TBA"]
            }
          ].map(filterDropdown => (
            <div key={filterDropdown.key} className={`${styles.dropdown} ${currentOpenDropdown === filterDropdown.key ? styles.dropdownActive : ""}`}>
              <button
                className={styles.dropdownToggle}
                onClick={() => showOrHideDropdown(filterDropdown.key)}
              >
                {filterDropdown.label} {getFilterCount(filterOptions[filterDropdown.key])}
                <span className={styles.dropdownArrow}>▼</span>
              </button>
              <div className={styles.dropdownMenu}>
                <div className={styles.dropdownContent}>
                  {filterDropdown.options.map(option => (
                    <label key={option} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        value={option}
                        checked={filterOptions[filterDropdown.key].includes(option)}
                        onChange={event => handleCheckboxClick(event, filterDropdown.key)}
                      />
                      <span className={styles.checkmark}></span>
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Minimum Score Filter */}
          <div className={`${styles.dropdown} ${currentOpenDropdown === "score" ? styles.dropdownActive : ""}`}>
            <button
              className={styles.dropdownToggle}
              onClick={() => showOrHideDropdown("score")}
            >
              Score ({filterOptions.minimumScore})
              <span className={styles.dropdownArrow}>▼</span>
            </button>
            <div className={styles.dropdownMenu}>
              <div className={`${styles.dropdownContent} ${styles.scoreRange}`}>
                <div className={styles.rangeInput}>
                  <label>Min Score: {filterOptions.minimumScore}</label>
                  <input
                    type="range"
                    name="minimumScore"
                    min="1"
                    max="10"
                    value={filterOptions.minimumScore}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Genre Filter */}
          <div className={`${styles.dropdown} ${currentOpenDropdown === "genres" ? styles.dropdownActive : ""}`}>
            <button
              className={styles.dropdownToggle}
              onClick={() => showOrHideDropdown("genres")}
            >
              Genres {getFilterCount(filterOptions.genres)}
              <span className={styles.dropdownArrow}>▼</span>
            </button>
            <div className={`${styles.dropdownMenu} ${styles.genresMenu}`}>
              <div className={styles.dropdownContent}>
                <div className={styles.genresGrid}>
                  {ANIME_GENRES.map(genre => (
                    <label key={genre} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        value={genre}
                        checked={filterOptions.genres.includes(genre)}
                        onChange={event => handleCheckboxClick(event, "genres")}
                      />
                      <span className={styles.checkmark}></span>
                      {genre}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Season Filter */}
          <div className={`${styles.dropdown} ${currentOpenDropdown === "season" ? styles.dropdownActive : ""}`}>
            <button
              className={styles.dropdownToggle}
              onClick={() => showOrHideDropdown("season")}
            >
              Season {filterOptions.season ? `(${filterOptions.season})` : ""}
              <span className={styles.dropdownArrow}>▼</span>
            </button>
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownContent}>
                {ANIME_SEASONS.map(season => (
                  <label key={season} className={styles.checkboxLabel}>
                    <input
                      type="radio"
                      name="season"
                      value={season}
                      checked={filterOptions.season === season}
                      onChange={handleInputChange}
                    />
                    <span className={styles.checkmark}></span>
                    {season}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Year Filter */}
          <div className={`${styles.dropdown} ${currentOpenDropdown === "seasonYear" ? styles.dropdownActive : ""}`}>
            <button
              className={styles.dropdownToggle}
              onClick={() => showOrHideDropdown("seasonYear")}
            >
              Year {filterOptions.seasonYear || ""}
              <span className={styles.dropdownArrow}>▼</span>
            </button>
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownContent}>
                <input
                  type="number"
                  name="seasonYear"
                  placeholder="Enter year"
                  value={filterOptions.seasonYear}
                  onChange={handleInputChange}
                  className={styles.textInput}
                />
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <button className={styles.resetBtn} onClick={clearAllFilters}>
            Reset Filters
          </button>
        </div>

        {/* Search Results Section */}
        <div className={styles.resultsSection}>
          {isSearching && <div className={styles.loader}></div>}

          {!isSearching && searchResults.length > 0 && (
            <div className={styles.resultsCount}>
              Showing {searchResults.length} of {totalResultsCount} results
            </div>
          )}

          {/* Anime Grid */}
          <div className={styles.animeGrid}>
            {searchResults.map(anime => (
              <div
                key={anime.id}
                className={styles.animeCard}
                onClick={() => showAnimeDetails(anime)}
                style={{ cursor: 'pointer' }}
              >
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
                    onError={event => (event.currentTarget.src = "/placeholder-anime.jpg")}
                  />
                  <div className={styles.cardTitleBottom}>
                    <h3>{anime.title}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Loading More Results */}
          {isLoadingMore && (
            <div className={styles.loadingMore}>
              <div className={styles.loadingSpinner}>Loading more...</div>
            </div>
          )}

          {/* End of Results Message */}
          {!isSearching && !hasMorePages && searchResults.length > 0 && (
            <div className={styles.endOfResults}>
              <p>End of results</p>
            </div>
          )}

          {/* No Results Message */}
          {!isSearching && searchResults.length === 0 && (
            <div className={styles.noResults}>
              <p>No results. Adjust filters or type to search.</p>
            </div>
          )}
        </div>

        {/* Modal Popup for Anime Details */}
        <Modal
          isOpen={isModalVisible}
          onClose={hideAnimeDetails}
          anime={selectedAnimeForModal}
          onOpenAnime={showRelatedAnimeDetails}
        />
      </div>
    </>
  );
}

export default AdvancedSearch;