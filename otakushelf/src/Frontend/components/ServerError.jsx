import React from 'react';
import { Header } from './header.jsx';
import BottomNavBar from "./bottom.jsx";
import Footer from './footer.jsx';
import ErrorPage from './ErrorPage.jsx';

const ServerError = () => (
  <>
    <Header />
    <ErrorPage type="500" />
    <Footer />
    <BottomNavBar />
  </>
);

export default ServerError;
