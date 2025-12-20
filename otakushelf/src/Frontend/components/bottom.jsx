import React from "react";
import { Link, useLocation } from 'react-router-dom';
import "../Stylesheets/bottom.css";

const BottomNavBar = () => {
  const location = useLocation();
  const path = location.pathname;

  const getActivePage = () => {
    if (path === '/home' || path === '/') return 'home';
    if (path === '/list') return 'list';
    if (path === '/advance') return 'search';
    if (path === '/ai') return 'AI';
    return '';
  };

  const activePage = getActivePage();

  return (
    <div className="bottom-button-bar">
      <Link
        to="/home"
        title="home"
        className={`nav-label ${activePage === 'home' ? 'active' : ''}`}
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
        className={`nav-label ${activePage === 'list' ? 'active' : ''}`}
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
        className={`nav-label ${activePage === 'search' ? 'active' : ''}`}
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
        className={`nav-label ${activePage === 'AI' ? 'active' : ''}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512">
          <path fill="inherit" fillRule="evenodd" d="M384 128v256H128V128zm-148.25 64h-24.932l-47.334 128h22.493l8.936-25.023h56.662L260.32 320h23.847zm88.344 64h-22.402v128h22.402zm-101 21.475l22.315 63.858h-44.274zM405.335 320H448v42.667h-42.667zm-256 85.333H192V448h-42.667zm85.333 0h42.666V448h-42.666zM149.333 64H192v42.667h-42.667zM320 405.333h42.667V448H320zM234.667 64h42.666v42.667h-42.666zM320 64h42.667v42.667H320zm85.333 170.667H448v42.666h-42.667zM64 320h42.667v42.667H64zm341.333-170.667H448V192h-42.667zM64 234.667h42.667v42.666H64zm0-85.334h42.667V192H64z" />
        </svg>
      </Link>
    </div>
  );
};

export default BottomNavBar;