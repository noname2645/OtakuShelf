import React from "react";
import "../Stylesheets/profilepageloader.css";

const ProfilePageLoader = ({ label = "Loading profile..." }) => (
  <div className="ppl-screen">
    <div className="ppl-skel">
      <div className="skel-cover" />
      <div className="skel-head">
        <div className="skel-avatar" />
        <div className="skel-id">
          <div className="skel-bar skel-bar--name" />
          <div className="skel-bar skel-bar--user" />
        </div>
      </div>
      <div className="skel-stats">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skel-stat" />
        ))}
      </div>
      <div className="skel-bio">
        <div className="skel-bar skel-bar--bio1" />
        <div className="skel-bar skel-bar--bio2" />
      </div>
    </div>
    <div className="ppl-footer">
      <span className="ppl-spinner" />
      <p className="ppl-text">{label}</p>
    </div>
  </div>
);

export default ProfilePageLoader;
