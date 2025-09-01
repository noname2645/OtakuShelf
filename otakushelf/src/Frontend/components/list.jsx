// Create a new file: EnhancedAnimeList.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import "../Stylesheets/list.css";
import { Edit, Star, Calendar, Play, Check, Trash2 } from 'lucide-react';
import { Navigate } from "react-router-dom";

const EnhancedAnimeList = () => {
  const [activeTab, setActiveTab] = useState('watching');
  const [animeList, setAnimeList] = useState({
    watching: [],
    completed: [],
    planned: [],
    dropped: [],
  });
  const [editingAnime, setEditingAnime] = useState(null);
  const [editForm, setEditForm] = useState({
    startDate: '',
    finishDate: '',
    userRating: 0,
    episodesWatched: 0,
    notes: ''
  });

  

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (user) {
      fetchAnimeList();
    }
  }, [user]);

const fetchAnimeList = async () => {
  try {
    // Get user ID from both possible locations
    const userId = user._id || user.id;
    if (!userId) {
      console.error("No user ID found");
      return;
    }

    const response = await axios.get(`http://localhost:5000/api/list/${userId}`);
    setAnimeList(response.data);
  } catch (error) {
    console.error("Error fetching list:", error);
    // If 404, create empty list
    if (error.response?.status === 404) {
      setAnimeList({
        watching: [],
        completed: [],
        planned: [],
        dropped: [],
      });
    }
  }
};

  const handleEdit = (anime) => {
    setEditingAnime(anime);
    setEditForm({
      startDate: anime.startDate ? new Date(anime.startDate).toISOString().split('T')[0] : '',
      finishDate: anime.finishDate ? new Date(anime.finishDate).toISOString().split('T')[0] : '',
      userRating: anime.userRating || 0,
      episodesWatched: anime.episodesWatched || 0,
      notes: anime.notes || ''
    });
  };

 // Update all API calls to use consistent user ID
const handleSaveEdit = async () => {
  try {
    const userId = user._id || user.id;
    const response = await axios.put(
      `http://localhost:5000/api/list/${userId}/${editingAnime._id}`,
      {
        ...editForm,
        category: activeTab,
        title: editingAnime.title,
        image: editingAnime.image,
        animeId: editingAnime.animeId,
        malId: editingAnime.malId
      }
    );
    setAnimeList(response.data.list);
    setEditingAnime(null);
  } catch (error) {
    console.error("Error updating anime:", error);
  }
};


const handleRemove = async (animeId) => {
  try {
    const userId = user._id || user.id;
    const response = await axios.delete(`http://localhost:5000/api/list/${userId}/${animeId}`);
    setAnimeList(response.data.list);
  } catch (error) {
    console.error("Error removing anime:", error);
  }
};

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return (
    <>
    <div className="enhanced-anime-list">
      <div className="list-header">
        <div className="list-tabs">
          {["watching", "completed", "planned", "dropped"].map(tab => (
            <button
              key={tab}
              className={activeTab === tab ? 'active' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="count-badge">{animeList[tab]?.length || 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="table-container">
        <table className="anime-table">
          <thead>
            <tr className="anime-table-header">
              <th className="image-column">Anime</th>
              <th>Start Date</th>
              <th>Finish Date</th>
              <th>Rating</th>
              <th>Episodes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {animeList[activeTab]?.map(anime => (
              <tr key={anime._id || anime.title} className="anime-table-row">
                <td className="anime-info-cell">
                  <div className="anime-info">
                    <img src={anime.image} alt={anime.title} className="table-anime-image" />
                    <span className="anime-title2">{anime.title}</span>
                  </div>
                </td>
                <td>
                  {anime.startDate ? new Date(anime.startDate).toLocaleDateString() : '-'}
                </td>
                <td>
                  {anime.finishDate ? new Date(anime.finishDate).toLocaleDateString() : '-'}
                </td>
                <td>
                  {anime.userRating > 0 ? (
                    <div className="rating-display">
                      <Star size={14} fill="currentColor" />
                      <span>{anime.userRating}/10</span>
                    </div>
                  ) : '-'}
                </td>
                <td>
                  {anime.episodesWatched > 0 ? (
                    <div className="episodes-display">
                      <Play size={14} />
                      <span>{anime.episodesWatched}</span>
                    </div>
                  ) : '-'}
                </td>
                <td>
                  <div className="table-actions">
                    <button className="edit-btn" onClick={() => handleEdit(anime)} title="Edit">
                      <Edit size={16} />
                    </button>
                    <button className="remove-btn" onClick={() => handleRemove(anime._id)} title="Remove">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {animeList[activeTab]?.length === 0 && (
          <div className="empty-state">
            <p>No anime in this category yet.</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingAnime && (
        <div className="edit-modal">
          <div className="edit-modal-content">
            <h2>{editingAnime.title}</h2>

            <div className="form-group2">
              <label>Start Date</label>
              <input
                type="date"
                value={editForm.startDate}
                onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
              />
            </div>

            <div className="form-group2">
              <label>Finish Date</label>
              <input
                type="date"
                value={editForm.finishDate}
                onChange={(e) => setEditForm({ ...editForm, finishDate: e.target.value })}
              />
            </div>

            <div className="form-group2">
              <label>Your Rating (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={editForm.userRating}
                onChange={(e) => setEditForm({ ...editForm, userRating: parseInt(e.target.value) })}
              />
            </div>

            <div className="form-group2">
              <label>Episodes Watched</label>
              <input
                type="number"
                value={editForm.episodesWatched}
                onChange={(e) => setEditForm({ ...editForm, episodesWatched: parseInt(e.target.value) })}
              />
            </div>

            <div className="form-group2">
              <label>Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Your thoughts on this anime..."
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => setEditingAnime(null)}>Cancel</button>
              <button onClick={handleSaveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default EnhancedAnimeList;