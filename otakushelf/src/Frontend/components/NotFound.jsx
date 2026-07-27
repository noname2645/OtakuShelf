import React from 'react';
import { Header } from './header.jsx';
import BottomNavBar from "./bottom.jsx";
import Footer from './footer.jsx';
import ErrorPage from './ErrorPage.jsx';

const NotFound = () => (
  <>
    <Header />
    <ErrorPage type="404" />
    <Footer />
    <BottomNavBar />
  </>
);

export default NotFound;
