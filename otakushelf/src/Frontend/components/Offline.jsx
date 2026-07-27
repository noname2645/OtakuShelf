import React from 'react';
import { Header } from './header.jsx';
import BottomNavBar from "./bottom.jsx";
import Footer from './footer.jsx';
import ErrorPage from './ErrorPage.jsx';

const Offline = () => (
  <>
    <Header />
    <ErrorPage type="offline" />
    <Footer />
    <BottomNavBar />
  </>
);

export default Offline;
