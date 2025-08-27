import React, { useState, useEffect } from 'react';
import axios from 'axios';
import "../Stylesheets/list.css";

const AnimeList = () => {
  const [activeTab, setActiveTab] = useState('watching');
  const [animeList, setAnimeList] = useState({
    watching: [],
    completed: [],
    planned: [],
    dropped: [],
  });
  const [newAnime, setNewAnime] = useState("");

  const user = JSON.parse(localStorage.getItem("user"));

  // Fetch anime list when component mounts
  useEffect(() => {
    if (user) {
      axios.get(`http://localhost:5000/api/list/${user._id || user.id}`)
        .then(res => setAnimeList(res.data))
        .catch(err => console.error("Error fetching list:", err));
    }
  }, [user]);

  const handleAddAnime = async () => {
    if (!newAnime) return;
    try {
      const res = await axios.post(`http://localhost:5000/api/list/${user._id || user.id}`, {
        category: activeTab,
        animeTitle: newAnime,
      });
      setAnimeList(res.data.list);
      setNewAnime("");
    } catch (err) {
      console.error("Error updating list:", err);
    }
  };

  if (!user) {
    return <p>Please log in to view your anime list.</p>;
  }

  return (
    <div className="anime-list-container">
      {/* Tabs */}
      <div className="tabs">
        {["watching", "completed", "planned", "dropped"].map(tab => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="anime-cards-display">
        <div className="tab-content">
          <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} List</h2>
          <ul>
            {animeList[activeTab]?.length > 0 ? (
              animeList[activeTab].map((title, idx) => <li key={idx}>{title}</li>)
            ) : (
              <p>No anime here yet</p>
            )}
          </ul>

          {/* Add new anime input */}
          <div className="add-anime">
            <input
              type="text"
              placeholder={`Add to ${activeTab}`}
              value={newAnime}
              onChange={(e) => setNewAnime(e.target.value)}
            />
            <button onClick={handleAddAnime}>Add</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimeList;
