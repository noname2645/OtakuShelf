import React from "react";
import "../Stylesheets/profilepageloader.css";

const ProfilePageLoader = ({ label = "Loading profile..." }) => (
  <div className="ppl-screen">
    <div className="ppl-spinner" />
    <p className="ppl-text">{label}</p>
  </div>
);

export default ProfilePageLoader;
