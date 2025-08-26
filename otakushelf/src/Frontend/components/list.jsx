import React, { useState } from 'react';
import "../Stylesheets/list.css";

const AnimeList = () => {
    const [activeTab, setActiveTab] = useState('watching');

    return (
        <div className="anime-list-container">
            {/* Tabs */}
            <div className="tabs">
                <button
                    className={activeTab === 'watching' ? 'active' : ''}
                    onClick={() => setActiveTab('watching')}
                >
                    Watching
                </button>
                <button
                    className={activeTab === 'completed' ? 'active' : ''}
                    onClick={() => setActiveTab('completed')}
                >
                    Completed
                </button>
                <button
                    className={activeTab === 'planned' ? 'active' : ''}
                    onClick={() => setActiveTab('planned')}
                >
                    Planned
                </button>
                <button
                    className={activeTab === 'dropped' ? 'active' : ''}
                    onClick={() => setActiveTab('dropped')}
                >
                    Dropped
                </button>
            </div>

            {/* Tab Content */}
            <div className="anime-cards-display">
                {activeTab === 'watching' && (
                    <div className="tab-content">
                        <h2>Watching List</h2>
                        {/* Replace with dynamic cards later */}
                        <p>You are currently watching: Demon Slayer, One Piece...</p>
                    </div>
                )}

                {activeTab === 'completed' && (
                    <div className="tab-content">
                        <h2>Completed List</h2>
                        <p>You finished: Death Note, Attack on Titan...</p>
                    </div>
                )}

                {activeTab === 'planned' && (
                    <div className="tab-content">
                        <h2>Planned List</h2>
                        <p>You plan to watch: Jujutsu Kaisen, Chainsaw Man...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnimeList;
